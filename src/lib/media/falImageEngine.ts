/**
 * Sinh ảnh qua fal.ai (model DeepSeek Janus-Pro) — dùng REST thuần (endpoint
 * đồng bộ "fal.run", không qua @fal-ai/client SDK, cho nhất quán với cách
 * gọi các provider AI khác trong repo — TTS/Veo cũng raw fetch).
 *
 * fal.ai trả ẢNH DẠNG URL (không phải base64 như Gemini) — phải tải thêm 1
 * bước GET nữa để lấy bytes thật, khác với generateAssetImageBuffer (Gemini)
 * trong assetEngine.ts.
 */

const FAL_MODEL_ENDPOINT = "https://fal.run/fal-ai/janus";

export function hasFalKey(): boolean {
  return Boolean(process.env.FAL_API_KEY?.trim());
}

export async function generateAssetImageBufferFal(prompt: string): Promise<{ buffer: Buffer; mimeType: string }> {
  const apiKey = process.env.FAL_API_KEY;
  if (!apiKey) {
    throw Object.assign(new Error("Chưa cấu hình FAL_API_KEY."), { code: "MISSING_API_KEY" });
  }

  const res = await fetch(FAL_MODEL_ENDPOINT, {
    method: "POST",
    headers: {
      Authorization: `Key ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      prompt,
      image_size: "square_hd",
      output_format: "png",
    }),
  });

  if (!res.ok) {
    const errBody = await res.text().catch(() => "");
    const err: any = new Error(`fal.ai Janus-Pro lỗi HTTP ${res.status}: ${errBody.slice(0, 300)}`);
    err.status = res.status;
    throw err;
  }

  const data = await res.json();
  const image = data?.images?.[0];
  if (!image?.url) {
    throw new Error("fal.ai Janus-Pro không trả về ảnh hợp lệ: " + JSON.stringify(data).slice(0, 300));
  }

  const imageRes = await fetch(image.url);
  if (!imageRes.ok) throw new Error(`Tải ảnh từ fal.ai thất bại: HTTP ${imageRes.status}`);

  return {
    buffer: Buffer.from(await imageRes.arrayBuffer()),
    mimeType: image.content_type || "image/png",
  };
}
