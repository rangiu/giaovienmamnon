import { withGeminiKeyRotation } from "../ai/geminiKeyPool";
import { generateAssetImageBufferFal } from "./falImageEngine";
import { generateAssetImageBufferPollinations } from "./pollinationsImageEngine";
import { PRESCHOOL_SAFETY_SETTINGS } from "../ai/safetySettings";

/**
 * Sinh ảnh minh hoạ AI — v2 "1 ẢNH/CẢNH" (xem videoScriptEngine.ts): không
 * còn sprite sheet, không còn xoá nền, không còn ghép lớp — CHỈ 2 việc:
 *   1. generateCharacterReferenceBuffer(): sinh 1 ẢNH THAM CHIẾU đơn/nhân
 *      vật (sinh 1 LẦN cho cả video, gọi 1 lần/nhân vật từ hybridPipeline.ts).
 *   2. generateSceneImageBuffer(): sinh 1 ẢNH HOÀN CHỈNH cho 1 CẢNH, gửi
 *      kèm (các) ảnh tham chiếu nhân vật xuất hiện trong cảnh đó làm điều
 *      kiện hoá để giữ đồng nhất — kỹ thuật đã XÁC MINH THẬT hoạt động qua
 *      đúng proxy đang dùng (gemini-2.5-flash-image).
 *
 * 3 nhà cung cấp, chọn bằng biến môi trường IMAGE_PROVIDER:
 *   - "pollinations" (mặc định): MIỄN PHÍ, không cần key — CHỈ hỗ trợ chữ,
 *     KHÔNG hỗ trợ ảnh tham chiếu (bỏ qua referenceImages nếu có).
 *   - "fal": fal.ai (model Janus-Pro) — cũng CHỈ hỗ trợ chữ, không tham chiếu.
 *   - "gemini": HỖ TRỢ ảnh tham chiếu đầy đủ — nhà cung cấp chính thức cho
 *     tính năng này, cần bật billing Google Cloud hoặc dùng proxy
 *     (GEMINI_PROXY_API_KEY, VD shopaikey.com).
 * Đổi qua lại chỉ cần sửa 1 biến môi trường, KHÔNG cần deploy lại code.
 */

const IMAGE_MODEL = "gemini-2.5-flash-image";
// URL gốc của API Gemini — mặc định Google chính chủ, đổi được qua env để
// trỏ sang proxy bên thứ 3 (VD shopaikey.com) khi billing Google Cloud
// chưa bật. Endpoint "direct" (không phải "api") theo đúng khuyến nghị của
// nhà cung cấp proxy cho các tác vụ lâu như sinh ảnh.
const GEMINI_BASE_URL = process.env.GEMINI_PROXY_BASE_URL || "https://generativelanguage.googleapis.com";

export interface ImageBufferResult {
  buffer: Buffer;
  mimeType: string;
}

/** Ảnh tham chiếu gửi kèm khi sinh ảnh cảnh — điều kiện hoá để giữ đồng nhất nhân vật (CHỈ có tác dụng với provider "gemini"). */
export interface ReferenceImage {
  buffer: Buffer;
  mimeType: string;
}

async function callGeminiImageGen(rawKey: string, prompt: string, referenceImages: ReferenceImage[]): Promise<ImageBufferResult> {
  const parts: Record<string, unknown>[] = [{ text: prompt }];
  for (const ref of referenceImages) {
    parts.push({ inlineData: { mimeType: ref.mimeType, data: ref.buffer.toString("base64") } });
  }

  const res = await fetch(`${GEMINI_BASE_URL}/v1beta/models/${IMAGE_MODEL}:generateContent?key=${rawKey}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ contents: [{ parts }], safetySettings: PRESCHOOL_SAFETY_SETTINGS }),
  });

  if (!res.ok) {
    const errBody = await res.text().catch(() => "");
    const err: any = new Error(`Sinh ảnh lỗi HTTP ${res.status}: ${errBody.slice(0, 300)}`);
    err.status = res.status;
    throw err;
  }

  const data = await res.json();
  const responseParts = data?.candidates?.[0]?.content?.parts || [];
  const imagePart = responseParts.find((p: any) => p?.inlineData?.data);
  if (!imagePart) throw new Error("Công cụ sinh ảnh không trả về ảnh hợp lệ.");

  return {
    buffer: Buffer.from(imagePart.inlineData.data, "base64"),
    mimeType: imagePart.inlineData.mimeType || "image/png",
  };
}

/**
 * Gọi Gemini image-gen — nếu có GEMINI_PROXY_API_KEY (key riêng, KHÔNG
 * chung với bể GEMINI_API_KEYS dùng cho chat/TTS) thì dùng đúng key đó với
 * GEMINI_BASE_URL (proxy), tách biệt hoàn toàn khỏi rotation pool chính để
 * không ảnh hưởng phần chat/TTS đang chạy ổn định bằng key Google thật.
 * Không có proxy key thì rơi về key Google thật xoay vòng như cũ.
 */
async function generateImageBufferGemini(prompt: string, referenceImages: ReferenceImage[]): Promise<ImageBufferResult> {
  const proxyKey = process.env.GEMINI_PROXY_API_KEY;
  if (proxyKey) {
    return callGeminiImageGen(proxyKey, prompt, referenceImages);
  }
  return withGeminiKeyRotation(async (_ai, rawKey) => callGeminiImageGen(rawKey, prompt, referenceImages));
}

async function generateImageBuffer(prompt: string, referenceImages: ReferenceImage[] = []): Promise<ImageBufferResult> {
  const provider = (process.env.IMAGE_PROVIDER || "pollinations").toLowerCase();
  if (provider === "fal") {
    return generateAssetImageBufferFal(prompt);
  }
  if (provider === "gemini") {
    return generateImageBufferGemini(prompt, referenceImages);
  }
  return generateAssetImageBufferPollinations(prompt);
}

/**
 * Sinh 1 ẢNH THAM CHIẾU đơn cho 1 nhân vật — KHÔNG sprite sheet, KHÔNG xoá
 * nền (ảnh chỉ dùng làm điều kiện hoá gửi kèm khi vẽ cảnh, không ghép lớp
 * lên video nên nền không cần trong suốt). CHỈ trả buffer trong RAM — việc
 * ghi file + lưu VideoJobAsset do hybridPipeline.ts tự làm SAU KHI kiểm tra
 * đạt (tránh ghi đĩa nhiều lần thừa cho các lần thử lại bị loại).
 */
export async function generateCharacterReferenceBuffer(prompt: string): Promise<ImageBufferResult> {
  return generateImageBuffer(prompt);
}

/**
 * Sinh 1 ẢNH HOÀN CHỈNH cho 1 CẢNH — AI vẽ TRỌN VẸN nhân vật + bối cảnh +
 * vật thể trong 1 lần gọi (thay vì ghép lớp bằng code), gửi kèm (các) ảnh
 * tham chiếu nhân vật xuất hiện trong cảnh để giữ đồng nhất thiết kế.
 */
export async function generateSceneImageBuffer(imagePrompt: string, referenceImages: ReferenceImage[]): Promise<ImageBufferResult> {
  return generateImageBuffer(imagePrompt, referenceImages);
}
