import { GoogleGenerativeAI } from "@google/generative-ai";

/**
 * Bể xoay vòng nhiều Gemini API key. Khi 1 key bị hết hạn mức (quota) —
 * lỗi 429 / RESOURCE_EXHAUSTED — tự động chuyển sang key kế tiếp còn dùng
 * được, và tạm cho key vừa hết hạn mức "nghỉ" một khoảng thời gian (đợi
 * Google reset quota) trước khi thử dùng lại. Nhờ vậy 1 key hết lượt free
 * trong ngày/phút không làm gián đoạn hẳn dịch vụ AI của cả app.
 *
 * Cấu hình: đặt biến môi trường GEMINI_API_KEYS = "key1,key2,key3" (phân
 * tách bằng dấu phẩy). Nếu chỉ có 1 key, dùng GEMINI_API_KEY như cũ vẫn
 * hoạt động bình thường (không rotate, chỉ có đúng 1 key trong bể).
 */

interface KeyState {
  key: string;
  cooldownUntil: number; // epoch ms; 0 hoặc quá khứ = sẵn sàng dùng ngay
}

function loadKeys(): string[] {
  const multi = process.env.GEMINI_API_KEYS;
  const raw = multi && multi.trim() ? multi : process.env.GEMINI_API_KEY || "";
  return Array.from(
    new Set(
      raw
        .split(",")
        .map((s) => s.trim())
        .filter((s) => s && s !== "your_gemini_api_key_here")
    )
  );
}

const pool: KeyState[] = loadKeys().map((key) => ({ key, cooldownUntil: 0 }));
let cursor = 0;

export function hasGeminiKeys(): boolean {
  return pool.length > 0;
}

export function geminiKeyPoolStatus() {
  const now = Date.now();
  return pool.map((s) => ({
    keySuffix: s.key.slice(-6),
    available: s.cooldownUntil <= now,
    cooldownSecondsLeft: s.cooldownUntil > now ? Math.ceil((s.cooldownUntil - now) / 1000) : 0,
  }));
}

/** Tìm 1 key đang KHÔNG bị "nghỉ", theo kiểu round-robin, bỏ qua các key đã thử trong lượt này. */
function pickAvailableKey(exclude: Set<string>): string | null {
  const now = Date.now();
  for (let i = 0; i < pool.length; i++) {
    const idx = (cursor + i) % pool.length;
    const state = pool[idx];
    if (state.cooldownUntil <= now && !exclude.has(state.key)) {
      cursor = (idx + 1) % pool.length;
      return state.key;
    }
  }
  return null;
}

/** Khi TẤT CẢ key đều đang nghỉ — vẫn thử key có thời gian nghỉ ngắn nhất, còn hơn báo lỗi ngay. */
function pickSoonestKey(): string | null {
  if (pool.length === 0) return null;
  return pool.reduce((a, b) => (a.cooldownUntil <= b.cooldownUntil ? a : b)).key;
}

function markCooldown(key: string, ms: number) {
  const state = pool.find((s) => s.key === key);
  if (state) state.cooldownUntil = Date.now() + ms;
}

const DEFAULT_COOLDOWN_MS = 60 * 1000; // không rõ retryDelay thì nghỉ tạm 60s
const DAILY_QUOTA_COOLDOWN_MS = 6 * 60 * 60 * 1000; // lỗi rõ ràng là quota/NGÀY thì nghỉ dài hơn (6h)
// Key sai định dạng/không hợp lệ hẳn (không phải hết hạn mức tạm thời) —
// nghỉ rất dài (24h) thay vì loại hẳn khỏi bể, để không phải sửa code khi
// muốn thử lại (VD: cô đã thay key đúng trong .env rồi restart lại app).
const INVALID_KEY_COOLDOWN_MS = 24 * 60 * 60 * 1000;

function isQuotaError(err: any): boolean {
  const status = err?.status ?? err?.response?.status;
  const msg = String(err?.message || err || "");
  return status === 429 || /RESOURCE_EXHAUSTED|quota|rate limit/i.test(msg);
}

// Lỗi xác thực (key sai định dạng, không phải Gemini key thật, key bị thu
// hồi...) — về bản chất KHÁC với hết hạn mức, nhưng vẫn cần rotate sang key
// khác thay vì bung lỗi ngay lập tức, nếu không 1 key rác trong bể sẽ làm
// hỏng toàn bộ tính năng AI mỗi khi round-robin xoay trúng đúng key đó.
function isAuthError(err: any): boolean {
  const status = err?.status ?? err?.response?.status;
  const msg = String(err?.message || err || "");
  return (
    status === 401 ||
    status === 403 ||
    /UNAUTHENTICATED|API_KEY_INVALID|ACCESS_TOKEN_TYPE_UNSUPPORTED|API key not valid/i.test(msg)
  );
}

function isDailyQuotaError(err: any): boolean {
  const msg = String(err?.message || err || "");
  return /per day|perday|daily/i.test(msg);
}

/** Cố đọc số giây Google gợi ý chờ (RetryInfo.retryDelay, vd "23s") từ lỗi trả về, nếu có. */
function extractRetryDelayMs(err: any): number | null {
  try {
    const details = err?.errorDetails || err?.response?.data?.error?.details;
    if (Array.isArray(details)) {
      const retryInfo = details.find((d: any) => String(d?.["@type"] || "").includes("RetryInfo"));
      const delayStr = retryInfo?.retryDelay as string | undefined;
      if (delayStr) {
        const seconds = parseFloat(delayStr);
        if (Number.isFinite(seconds)) return seconds * 1000;
      }
    }
  } catch {
    // bỏ qua, dùng cooldown mặc định
  }
  return null;
}

/**
 * Chạy 1 tác vụ Gemini với cơ chế tự xoay key khi bị hết hạn mức. `fn`
 * nhận vào 1 GoogleGenerativeAI client đã khởi tạo sẵn từ key đang thử —
 * mỗi lần rotate sẽ gọi lại `fn` với key mới, y hệt logic gốc, không cần
 * đổi gì ở nơi gọi ngoài việc bọc qua hàm này.
 *
 * `fn` cũng nhận thêm raw key string (tham số 2) — dùng cho các endpoint
 * REST thuần không đi qua SDK `@google/generative-ai` (TTS, Imagen, Veo:
 * tự build URL `...?key=<rawKey>`). Callback cũ không khai báo tham số 2
 * vẫn chạy bình thường (JS bỏ qua tham số thừa) — additive, không phá logic có sẵn.
 */
export async function withGeminiKeyRotation<T>(
  fn: (ai: GoogleGenerativeAI, rawKey: string) => Promise<T>
): Promise<T> {
  if (pool.length === 0) {
    throw Object.assign(new Error("MISSING_API_KEY"), { code: "MISSING_API_KEY" });
  }

  const tried = new Set<string>();
  let lastError: any;

  while (tried.size < pool.length) {
    const key = pickAvailableKey(tried);
    if (!key) break; // hết key đang rảnh trong lượt round-robin này
    tried.add(key);
    try {
      return await fn(new GoogleGenerativeAI(key), key);
    } catch (err: any) {
      lastError = err;
      if (isQuotaError(err)) {
        const delay = extractRetryDelayMs(err) ?? (isDailyQuotaError(err) ? DAILY_QUOTA_COOLDOWN_MS : DEFAULT_COOLDOWN_MS);
        markCooldown(key, delay);
        console.warn(`[Gemini] Key ...${key.slice(-6)} hết hạn mức — nghỉ ${Math.round(delay / 1000)}s, thử key khác (${tried.size}/${pool.length}).`);
        continue;
      }
      if (isAuthError(err)) {
        markCooldown(key, INVALID_KEY_COOLDOWN_MS);
        console.error(`[Gemini] Key ...${key.slice(-6)} bị lỗi xác thực (sai định dạng/đã thu hồi?) — tạm loại khỏi vòng xoay 24h, thử key khác (${tried.size}/${pool.length}).`);
        continue;
      }
      throw err; // lỗi khác (không phải hết quota/xác thực) — không rotate, trả lỗi ngay
    }
  }

  // Mọi key trong bể đều đang nghỉ — vẫn thử 1 lần cuối với key có thời
  // gian nghỉ ngắn nhất, còn hơn báo lỗi hẳn khi vẫn có khả năng dùng được.
  const fallbackKey = pickSoonestKey();
  if (fallbackKey && !tried.has(fallbackKey)) {
    try {
      return await fn(new GoogleGenerativeAI(fallbackKey), fallbackKey);
    } catch (err) {
      lastError = err;
    }
  }

  throw lastError || new Error("Không có Gemini API key khả dụng.");
}
