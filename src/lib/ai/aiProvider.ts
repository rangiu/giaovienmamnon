import { GoogleGenerativeAI } from "@google/generative-ai";
import { hasGeminiKeys, withGeminiKeyRotation } from "./geminiKeyPool";
import { hasDeepSeekKey, callDeepSeek, DEEPSEEK_MODEL } from "./deepseek";
import { extractJsonFromText } from "./jsonValidator";
import { PRESCHOOL_SAFETY_SETTINGS } from "./safetySettings";

/**
 * Điều phối provider AI theo GÓI của tài khoản đang gọi:
 * - FREE/hết hạn (LIMITED): dùng Gemini FREE (key xoay vòng có sẵn).
 * - Đã trả phí (FULL): dùng DeepSeek (rẻ, nhanh, đủ tốt cho soạn thảo văn
 *   bản) nếu đã cấu hình DEEPSEEK_API_KEY, không thì tự rơi về Gemini để
 *   tính năng không bị gián đoạn.
 * Gộp chung 1 chỗ để 8 hàm AI trong aiEngine.ts không phải tự viết lại
 * logic chọn provider + xử lý bị cắt cụt (MAX_TOKENS/length) từng nơi.
 */
export type AiTier = "FULL" | "LIMITED";

// Google định kỳ ngừng cấp quyền dùng các bản model cố định (VD:
// "gemini-2.5-flash" trả về lỗi 404 "no longer available to new users" cho
// 1 số project dù model vẫn còn liệt kê ở /v1beta/models) — dùng alias
// "-latest" để Google tự trỏ sang model khuyến nghị hiện hành, tránh phải
// tự tay đổi tên model mỗi khi Google xoay vòng thế hệ model mới. Dùng bản
// "flash-lite" (không phải "flash" thường) — đo thực tế bản "flash" hay bị
// 503 "high demand" do đông người dùng tranh chấp, còn "flash-lite" tối ưu
// cho lưu lượng cao/chi phí thấp nên ít bị quá tải hơn hẳn, vẫn đủ tốt cho
// các tác vụ soạn thảo văn bản (không cần suy luận phức tạp) của app này.
const GEMINI_MODEL = "gemini-flash-lite-latest";
const MAX_OUTPUT_TOKENS = 8192;
const MAX_OUTPUT_TOKENS_RETRY = 16384;

export interface AiChatMessage {
  role: "user" | "assistant";
  content: string;
}

export interface RunAiTextOptions {
  systemInstruction: string;
  /** Lịch sử hội thoại trước đó (KHÔNG bao gồm lượt hỏi mới nhất). */
  history?: AiChatMessage[];
  /** Lượt hỏi/prompt mới nhất. */
  prompt: string;
  /** Yêu cầu model trả về đúng 1 khối JSON. */
  json?: boolean;
}

export interface RunAiTextResult {
  text: string;
  truncated: boolean;
  inputTokens: number;
  outputTokens: number;
  /** Tên model thật đã dùng — lưu vào AiUsage.model để admin biết chi phí thật theo provider. */
  modelUsed: string;
}

function isGeminiTruncated(result: any): boolean {
  return result?.response?.candidates?.[0]?.finishReason === "MAX_TOKENS";
}

async function runGemini(options: RunAiTextOptions): Promise<RunAiTextResult> {
  const { responseText, truncated, usageMetadata } = await withGeminiKeyRotation(async (ai: GoogleGenerativeAI) => {
    const formattedHistory = (options.history || []).map((m) => ({
      role: m.role === "assistant" ? "model" : m.role,
      parts: [{ text: m.content }],
    }));

    const run = async (maxOutputTokens: number) => {
      const model = ai.getGenerativeModel({
        model: GEMINI_MODEL,
        systemInstruction: options.systemInstruction,
        safetySettings: PRESCHOOL_SAFETY_SETTINGS,
        generationConfig: {
          maxOutputTokens,
          ...(options.json ? { responseMimeType: "application/json" } : {}),
        },
      });
      const chat = model.startChat({ history: formattedHistory });
      return chat.sendMessage(options.prompt);
    };

    let result = await run(MAX_OUTPUT_TOKENS);
    if (isGeminiTruncated(result)) {
      console.warn("[Gemini] Câu trả lời bị cắt cụt (MAX_TOKENS) — thử lại với maxOutputTokens cao hơn.");
      result = await run(MAX_OUTPUT_TOKENS_RETRY);
    }

    return {
      responseText: result.response.text(),
      truncated: isGeminiTruncated(result),
      usageMetadata: result.response.usageMetadata,
    };
  });

  return {
    text: responseText,
    truncated,
    inputTokens: usageMetadata?.promptTokenCount || 0,
    outputTokens: usageMetadata?.candidatesTokenCount || 0,
    modelUsed: GEMINI_MODEL,
  };
}

async function runDeepSeek(options: RunAiTextOptions): Promise<RunAiTextResult> {
  const messages = [
    { role: "system" as const, content: options.systemInstruction },
    ...(options.history || []).map((m) => ({ role: m.role, content: m.content })),
    { role: "user" as const, content: options.prompt },
  ];

  let result = await callDeepSeek(messages, { json: options.json, maxOutputTokens: MAX_OUTPUT_TOKENS });
  if (result.truncated) {
    console.warn("[DeepSeek] Câu trả lời bị cắt cụt (length) — thử lại với max_tokens cao hơn.");
    result = await callDeepSeek(messages, { json: options.json, maxOutputTokens: MAX_OUTPUT_TOKENS_RETRY });
  }

  return {
    text: result.text,
    truncated: result.truncated,
    inputTokens: result.inputTokens,
    outputTokens: result.outputTokens,
    modelUsed: DEEPSEEK_MODEL,
  };
}

/**
 * Điểm gọi AI DUY NHẤT dùng chung cho toàn bộ aiEngine.ts. `tier` do route
 * truyền vào (lấy từ `access.tier` đã tính sẵn ở requireActiveUser/
 * requireFullAccess) — KHÔNG tự suy đoán lại ở đây để tránh lệch logic
 * phân quyền đã có.
 */
export async function runAiText(tier: AiTier, options: RunAiTextOptions): Promise<RunAiTextResult> {
  const wantsDeepSeek = tier === "FULL" && hasDeepSeekKey();

  if (wantsDeepSeek) {
    try {
      return await runDeepSeek(options);
    } catch (err) {
      // DeepSeek lỗi tạm thời (hết quota, mạng...) — rơi về Gemini nếu có
      // key, còn hơn để cô giáo trả phí bị gián đoạn hoàn toàn.
      console.error("[DeepSeek] Lỗi gọi API, thử rơi về Gemini:", err);
      if (hasGeminiKeys()) return runGemini(options);
      throw err;
    }
  }

  if (!hasGeminiKeys()) {
    if (hasDeepSeekKey()) return runDeepSeek(options);
    throw Object.assign(new Error("MISSING_API_KEY"), { code: "MISSING_API_KEY" });
  }

  return runGemini(options);
}

export interface RunAiJsonResult {
  /** Đối tượng JSON đã parse được, hoặc null nếu hết số lần thử vẫn không parse được. */
  parsed: any;
  /** Văn bản thô của LẦN THỬ CUỐI CÙNG — dùng để hiển thị debug/log khi vẫn thất bại. */
  rawText: string;
  truncated: boolean;
  modelUsed: string;
  /** Tổng token đã dùng CỘNG DỒN qua mọi lần thử (mỗi lần thử đều tốn phí/quota thật). */
  inputTokens: number;
  outputTokens: number;
  /** Số lần đã gọi AI thật sự (1 = thành công ngay lần đầu). */
  attempts: number;
}

const MAX_JSON_ATTEMPTS = 3;

/**
 * Gọi AI ở chế độ JSON, TỰ ĐỘNG GỌI LẠI TOÀN BỘ (regenerate) khi JSON trả về
 * không parse được (kể cả sau khi đã thử vá lỗi cú pháp trong
 * jsonValidator.ts) — thay vì cố vá thêm từng kiểu lỗi cú pháp mới.
 *
 * LÝ DO: đo thực tế trên production, DeepSeek ở chế độ JSON mode KHÔNG đảm
 * bảo cú pháp JSON hợp lệ 100% — bắt được ít nhất 3 kiểu lỗi cú pháp khác
 * nhau (thiếu dấu phẩy, thiếu dấu " đóng chuỗi trước "]", thiếu dấu " đóng
 * chuỗi trước dấu phẩy kèm dư 1 dấu "}" làm sai cấu trúc) trên ~15 lần thử
 * thật (~20% lần đầu lỗi). Kiểu lỗi cấu trúc (dư/thiếu ngoặc) không thể vá
 * an toàn bằng regex vì cần hiểu đúng cấu trúc lồng nhau. Vì mỗi lần gọi AI
 * là độc lập (không liên quan lần trước), gọi lại là cách khắc phục đáng
 * tin cậy nhất: tỉ lệ lỗi ~20%/lần => 3 lần liên tiếp đều lỗi chỉ còn ~0.8%.
 */
export async function runAiJson(tier: AiTier, options: RunAiTextOptions): Promise<RunAiJsonResult> {
  let totalInputTokens = 0;
  let totalOutputTokens = 0;
  let lastResult: RunAiTextResult | null = null;

  for (let attempt = 1; attempt <= MAX_JSON_ATTEMPTS; attempt++) {
    const result = await runAiText(tier, { ...options, json: true });
    lastResult = result;
    totalInputTokens += result.inputTokens;
    totalOutputTokens += result.outputTokens;

    if (result.truncated) {
      // Bị cắt cụt (đã tự thử maxOutputTokens cao hơn ở runAiText rồi vẫn
      // cụt) — gọi lại từ đầu không giải quyết được vấn đề độ dài, dừng
      // ngay và để caller xử lý riêng (báo "nội dung quá dài").
      console.warn(`[AI JSON] Lần ${attempt}/${MAX_JSON_ATTEMPTS}: vẫn bị cắt cụt sau khi đã tăng maxOutputTokens — dừng thử lại.`);
      break;
    }

    const parsed = extractJsonFromText(result.text);
    if (parsed) {
      if (attempt > 1) {
        console.warn(`[AI JSON] Parse JSON thành công ở lần thử ${attempt}/${MAX_JSON_ATTEMPTS} (model: ${result.modelUsed}).`);
      }
      return {
        parsed,
        rawText: result.text,
        truncated: false,
        modelUsed: result.modelUsed,
        inputTokens: totalInputTokens,
        outputTokens: totalOutputTokens,
        attempts: attempt,
      };
    }

    console.warn(
      `[AI JSON] Lần ${attempt}/${MAX_JSON_ATTEMPTS}: JSON không hợp lệ (model: ${result.modelUsed}, ${result.text.length} ký tự) — ` +
        (attempt < MAX_JSON_ATTEMPTS ? "gọi lại AI để tạo mới." : "đã hết số lần thử.")
    );
    if (attempt === MAX_JSON_ATTEMPTS) {
      console.error(`[AI JSON] Raw text lần cuối (500 ký tự đầu):`, result.text.slice(0, 500));
    }
  }

  return {
    parsed: null,
    rawText: lastResult?.text || "",
    truncated: lastResult?.truncated || false,
    modelUsed: lastResult?.modelUsed || "unknown",
    inputTokens: totalInputTokens,
    outputTokens: totalOutputTokens,
    attempts: MAX_JSON_ATTEMPTS,
  };
}
