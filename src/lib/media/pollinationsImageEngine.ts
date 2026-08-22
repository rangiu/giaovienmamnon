/**
 * Sinh ảnh MIỄN PHÍ qua Pollinations.ai (model Flux) — KHÔNG cần đăng ký,
 * KHÔNG cần API key, chỉ 1 GET request trả thẳng bytes ảnh. Dùng để trải
 * nghiệm/test pipeline ngay lập tức trong lúc chờ quyết định nhà cung cấp
 * trả phí (fal.ai cần nạp tiền, Gemini cần bật billing Google Cloud).
 *
 * Lưu ý: ảnh có thể có watermark nhỏ nếu không đăng ký token miễn phí (tham
 * số nologo cần account) — chấp nhận được cho giai đoạn thử nghiệm, cần
 * xem lại nếu dùng chính thức cho khách trả tiền.
 */

const POLLINATIONS_BASE = "https://image.pollinations.ai/prompt";

export async function generateAssetImageBufferPollinations(prompt: string): Promise<{ buffer: Buffer; mimeType: string }> {
  const url = `${POLLINATIONS_BASE}/${encodeURIComponent(prompt)}?width=1024&height=1024&model=flux&nologo=true`;

  const res = await fetch(url);
  if (!res.ok) {
    const errBody = await res.text().catch(() => "");
    const err: any = new Error(`Pollinations.ai lỗi HTTP ${res.status}: ${errBody.slice(0, 300)}`);
    err.status = res.status;
    throw err;
  }

  const contentType = res.headers.get("content-type") || "image/jpeg";
  return {
    buffer: Buffer.from(await res.arrayBuffer()),
    mimeType: contentType,
  };
}
