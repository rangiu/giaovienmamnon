import { withGeminiKeyRotation } from "../ai/geminiKeyPool";

/**
 * Tích hợp Google Veo (Tier VEO — video chuyển động thật). REST thuần
 * (không qua SDK) vì @google/generative-ai chưa hỗ trợ endpoint này.
 *
 * Dùng key Google thật xoay vòng (GEMINI_API_KEYS) theo mặc định — hiện
 * đang bị chặn billing (429 RESOURCE_EXHAUSTED). Nếu có GEMINI_PROXY_API_KEY
 * (proxy bên thứ 3, VD shopaikey.com — đã xác nhận mở khoá được sinh ảnh
 * qua cùng cơ chế này, xem assetEngine.ts) thì ưu tiên dùng key + base URL
 * đó thay vì key Google thật — CHƯA live-test Veo qua proxy (tốn tiền hơn
 * hẳn 1 lần gọi ảnh, cần xác nhận với người dùng trước khi thử thật).
 * Cấu trúc RESPONSE của operation hoàn tất (extractVideoUri bên dưới) viết
 * PHÒNG THỦ theo nhiều khả năng vì chưa có response thật để đối chiếu —
 * CẦN kiểm tra/chỉnh lại ngay lần đầu gọi thành công.
 */

const VEO_MODEL = "veo-3.1-generate-preview";
const BASE_URL = process.env.GEMINI_PROXY_BASE_URL || "https://generativelanguage.googleapis.com";
const OPERATION_POLL_INTERVAL_MS = 10000;
const OPERATION_POLL_TIMEOUT_MS = 6 * 60 * 1000; // Veo thường mất 1-3 phút/clip theo tài liệu, chừa dư

export interface VeoReferenceImage {
  base64: string;
  mimeType: string;
}

export interface GenerateVeoClipParams {
  prompt: string;
  /** Đã kẹp 4-8 giây ở tầng gọi (videoScriptEngine.ts) — giới hạn cứng của Veo. */
  durationSeconds: number;
  /** Tối đa 3 ảnh — giữ đồng nhất nhân vật/phong cách xuyên suốt các cảnh (Veo "Ingredients to Video"). */
  referenceImages?: VeoReferenceImage[];
  /** uri clip TRƯỚC ĐÓ — nối cảnh liền mạch thật (chuyển động tiếp nối), không chỉ giống phong cách. */
  extendFromVideoUri?: string;
}

async function startVeoOperation(rawKey: string, params: GenerateVeoClipParams): Promise<string> {
  const instance: Record<string, unknown> = { prompt: params.prompt };

  if (params.referenceImages?.length) {
    instance.referenceImages = params.referenceImages.slice(0, 3).map((img) => ({
      image: { bytesBase64Encoded: img.base64, mimeType: img.mimeType },
      referenceType: "asset",
    }));
  }
  if (params.extendFromVideoUri) {
    instance.video = { uri: params.extendFromVideoUri };
  }

  const res = await fetch(
    `${BASE_URL}/v1beta/models/${VEO_MODEL}:predictLongRunning?key=${rawKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        instances: [instance],
        parameters: { durationSeconds: params.durationSeconds, aspectRatio: "16:9" },
      }),
    }
  );

  if (!res.ok) {
    const errBody = await res.text().catch(() => "");
    const err: any = new Error(`Veo lỗi HTTP ${res.status}: ${errBody.slice(0, 300)}`);
    err.status = res.status;
    throw err;
  }

  const data = await res.json();
  if (!data?.name) throw new Error("Veo không trả về operation hợp lệ.");
  return data.name as string;
}

async function pollVeoOperation(rawKey: string, operationName: string): Promise<any> {
  const deadline = Date.now() + OPERATION_POLL_TIMEOUT_MS;
  while (Date.now() < deadline) {
    const res = await fetch(`${BASE_URL}/v1beta/${operationName}?key=${rawKey}`);
    if (!res.ok) {
      const errBody = await res.text().catch(() => "");
      throw new Error(`Veo poll lỗi HTTP ${res.status}: ${errBody.slice(0, 300)}`);
    }
    const data = await res.json();
    if (data.done) {
      if (data.error) throw new Error(`Veo generation lỗi: ${JSON.stringify(data.error).slice(0, 300)}`);
      return data.response;
    }
    await new Promise((resolve) => setTimeout(resolve, OPERATION_POLL_INTERVAL_MS));
  }
  throw new Error("Veo generation quá thời gian chờ (timeout).");
}

function extractVideoUri(response: any): string | null {
  return (
    response?.generateVideoResponse?.generatedSamples?.[0]?.video?.uri ||
    response?.generatedVideos?.[0]?.video?.uri ||
    response?.videos?.[0]?.uri ||
    null
  );
}

async function downloadVideo(rawKey: string, uri: string): Promise<Buffer> {
  const sep = uri.includes("?") ? "&" : "?";
  const res = await fetch(`${uri}${sep}key=${rawKey}`);
  if (!res.ok) throw new Error(`Tải video Veo thất bại: HTTP ${res.status}`);
  return Buffer.from(await res.arrayBuffer());
}

async function runVeoWithKey(rawKey: string, params: GenerateVeoClipParams): Promise<{ buffer: Buffer; uri: string }> {
  const operationName = await startVeoOperation(rawKey, params);
  const response = await pollVeoOperation(rawKey, operationName);
  const uri = extractVideoUri(response);
  if (!uri) {
    throw new Error("Không tìm thấy video trong response Veo — cấu trúc response có thể khác dự kiến, cần kiểm tra lại extractVideoUri().");
  }
  const buffer = await downloadVideo(rawKey, uri);
  return { buffer, uri };
}

/** Sinh 1 clip Veo (4-8 giây) — trả về bytes MP4 + uri gốc (dùng làm extendFromVideoUri cho cảnh kế tiếp). */
export async function generateVeoClip(params: GenerateVeoClipParams): Promise<{ buffer: Buffer; uri: string }> {
  const proxyKey = process.env.GEMINI_PROXY_API_KEY;
  if (proxyKey) {
    return runVeoWithKey(proxyKey, params);
  }
  return withGeminiKeyRotation(async (_ai, rawKey) => runVeoWithKey(rawKey, params));
}
