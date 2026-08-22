import { withGeminiKeyRotation } from "../ai/geminiKeyPool";
import { synthesizeNarrationWavMinimax } from "./minimaxTtsEngine";

/**
 * Giọng đọc AI cho narration mỗi cảnh.
 *
 * 2 nhà cung cấp, chọn bằng biến môi trường TTS_PROVIDER:
 *   - "gemini" (mặc định): Gemini native TTS, key Google THẬT (free tier).
 *     KHÔNG qua proxy GEMINI_PROXY_API_KEY — đã thử thật, proxy trả lỗi
 *     "No available channel for model gemini-2.5-flash-preview-tts" (model
 *     TTS không nằm trong gói/group của key proxy hiện có, dù docs chung
 *     có nhắc tới). Key Google thật hoạt động nhưng hạn mức khá thấp — đã
 *     gặp thật lỗi 429 sau ~7-8 lần gọi liên tiếp, nên có RETRY CÓ CHỜ +
 *     giãn cách chủ động giữa các lần gọi (xem hybridPipeline.ts).
 *   - "minimax": qua đúng proxy đó nhưng bằng endpoint MiniMax
 *     (/tts/minimax/t2a_v2) — đã xác nhận hoạt động thật, trả WAV mã hex
 *     trong data.audio. Dùng khi Gemini free-tier bị giới hạn quá thường xuyên.
 */
const TTS_PROVIDER = (process.env.TTS_PROVIDER || "gemini").toLowerCase();

const TTS_MODEL = "gemini-2.5-flash-preview-tts";
const BASE_URL = "https://generativelanguage.googleapis.com";
const MAX_RETRIES = 5;
const RETRY_DELAY_MS = 30000; // hạn mức TTS free-tier reset theo phút — đo thật cần hơn 60s mới chắc chắn reset, chờ dư (tối đa 2.5 phút) vì job chạy nền, không ai đợi trực tiếp
const TTS_SAMPLE_RATE = 24000;
const TTS_CHANNELS = 1;
const TTS_BITS_PER_SAMPLE = 16;

/**
 * Bọc PCM thô (định dạng Gemini TTS trả về: audio/L16, 16-bit signed,
 * mono, 24kHz) vào 1 WAV header chuẩn 44 byte — KHÔNG phải tự chế codec,
 * chỉ là container RIFF/WAVE xác định (sample rate/kênh/bit depth) để
 * Chromium (Remotion render) và trình duyệt phát được bằng thẻ <audio>
 * bình thường. ffmpeg (Tier Veo) thì dùng cờ -f s16le trực tiếp trên PCM
 * thô, không cần bước này.
 */
function pcmToWav(pcm: Buffer): Buffer {
  const byteRate = TTS_SAMPLE_RATE * TTS_CHANNELS * (TTS_BITS_PER_SAMPLE / 8);
  const blockAlign = TTS_CHANNELS * (TTS_BITS_PER_SAMPLE / 8);
  const header = Buffer.alloc(44);
  header.write("RIFF", 0);
  header.writeUInt32LE(36 + pcm.length, 4);
  header.write("WAVE", 8);
  header.write("fmt ", 12);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20); // PCM
  header.writeUInt16LE(TTS_CHANNELS, 22);
  header.writeUInt32LE(TTS_SAMPLE_RATE, 24);
  header.writeUInt32LE(byteRate, 28);
  header.writeUInt16LE(blockAlign, 32);
  header.writeUInt16LE(TTS_BITS_PER_SAMPLE, 34);
  header.write("data", 36);
  header.writeUInt32LE(pcm.length, 40);
  return Buffer.concat([header, pcm]);
}

async function callTts(rawKey: string, text: string, voiceName: string): Promise<Buffer> {
  const res = await fetch(`${BASE_URL}/v1beta/models/${TTS_MODEL}:generateContent?key=${rawKey}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ parts: [{ text }] }],
      generationConfig: {
        responseModalities: ["AUDIO"],
        speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName } } },
      },
    }),
  });

  if (!res.ok) {
    const errBody = await res.text().catch(() => "");
    const err: any = new Error(`TTS lỗi HTTP ${res.status}: ${errBody.slice(0, 300)}`);
    err.status = res.status;
    throw err;
  }

  const data = await res.json();
  const base64: string | undefined = data?.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
  if (!base64) throw new Error("TTS không trả về dữ liệu âm thanh hợp lệ.");

  return pcmToWav(Buffer.from(base64, "base64"));
}

function isRateLimitError(err: any): boolean {
  return err?.status === 429 || /RESOURCE_EXHAUSTED|quota/i.test(String(err?.message || ""));
}

/**
 * Sinh audio narration (WAV) từ 1 đoạn văn bản tiếng Việt — RETRY CÓ CHỜ
 * khi dính rate limit (429), vì hiện chỉ có 1 key Google thật (không có gì
 * để rotation xoay sang) và hạn mức free-tier reset theo phút, không phải
 * vĩnh viễn — chờ rồi thử lại là đủ, không cần đổi provider.
 */
export async function synthesizeNarrationWav(text: string, voiceName = "Kore"): Promise<Buffer> {
  if (TTS_PROVIDER === "minimax") {
    return synthesizeNarrationWavMinimax(text);
  }

  let lastErr: any;
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      return await withGeminiKeyRotation(async (_ai, rawKey) => callTts(rawKey, text, voiceName));
    } catch (err: any) {
      lastErr = err;
      if (!isRateLimitError(err) || attempt === MAX_RETRIES) throw err;
      console.warn(`[TTS] Rate limit (lần ${attempt}/${MAX_RETRIES}) — chờ ${RETRY_DELAY_MS / 1000}s rồi thử lại.`);
      await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS));
    }
  }
  throw lastErr;
}
