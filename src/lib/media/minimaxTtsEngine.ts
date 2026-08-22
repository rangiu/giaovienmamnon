/**
 * Giọng đọc AI qua MiniMax (proxy shopaikey.com) — phương án DỰ PHÒNG cho
 * TTS khi Gemini TTS (key Google thật, free tier) bị giới hạn lượt/phút
 * quá thường xuyên (xem ttsEngine.ts). Đã xác nhận hoạt động thật: trả
 * WAV mã hex trong data.audio (KHÔNG phải base64 — quy ước riêng của
 * MiniMax), audio_setting.format="wav" nên nhận về file WAV hoàn chỉnh,
 * không cần tự bọc header như đường Gemini.
 */

const MINIMAX_ENDPOINT = "https://api.shopaikey.com/tts/minimax/t2a_v2";
const MINIMAX_MODEL = "speech-02-hd";
// Chưa có giọng tiếng Việt xác nhận riêng — dùng giọng mặc định trong tài
// liệu, kiểm tra thêm qua GET /tts/minimax/voices nếu cần đổi giọng phù hợp hơn.
const DEFAULT_VOICE_ID = "male-qn-qingse";

export function hasMinimaxProxyKey(): boolean {
  return Boolean(process.env.GEMINI_PROXY_API_KEY?.trim());
}

export async function synthesizeNarrationWavMinimax(text: string, voiceId = DEFAULT_VOICE_ID): Promise<Buffer> {
  const apiKey = process.env.GEMINI_PROXY_API_KEY;
  if (!apiKey) {
    throw Object.assign(new Error("Chưa cấu hình GEMINI_PROXY_API_KEY cho MiniMax TTS."), { code: "MISSING_API_KEY" });
  }

  const res = await fetch(MINIMAX_ENDPOINT, {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: MINIMAX_MODEL,
      text,
      voice_setting: { voice_id: voiceId, speed: 1, vol: 1, pitch: 0 },
      audio_setting: { sample_rate: 24000, bitrate: 128000, format: "wav" },
      stream: false,
    }),
  });

  if (!res.ok) {
    const errBody = await res.text().catch(() => "");
    const err: any = new Error(`MiniMax TTS lỗi HTTP ${res.status}: ${errBody.slice(0, 300)}`);
    err.status = res.status;
    throw err;
  }

  const data = await res.json();
  if (data?.base_resp?.status_code && data.base_resp.status_code !== 0) {
    throw new Error(`MiniMax TTS lỗi: ${data.base_resp.status_msg || data.base_resp.status_code}`);
  }

  const hexAudio: string | undefined = data?.data?.audio;
  if (!hexAudio) throw new Error("MiniMax TTS không trả về audio hợp lệ.");

  return Buffer.from(hexAudio, "hex");
}
