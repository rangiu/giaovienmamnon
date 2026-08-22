/**
 * Client gọi DeepSeek API (tương thích chuẩn OpenAI Chat Completions) — dùng
 * cho tài khoản ĐÃ TRẢ PHÍ (FULL tier). Tài khoản FREE vẫn dùng Gemini free
 * như cũ (xem geminiKeyPool.ts). Chọn model "deepseek-chat" (DeepSeek-V3):
 * rẻ, phản hồi nhanh, chất lượng đủ tốt cho soạn giáo án/nhận xét/tin nhắn
 * — KHÔNG dùng "deepseek-reasoner" (chậm hơn nhiều, tốn token "suy luận"
 * ẩn, giá cao hơn, không cần thiết cho các tác vụ soạn thảo văn bản này).
 */

const DEEPSEEK_API_URL = "https://api.deepseek.com/chat/completions";
const DEEPSEEK_MODEL = "deepseek-chat";

export function hasDeepSeekKey(): boolean {
  const key = process.env.DEEPSEEK_API_KEY;
  return Boolean(key && key.trim() && key !== "your_deepseek_api_key_here");
}

export interface DeepSeekMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface DeepSeekCallResult {
  text: string;
  truncated: boolean;
  inputTokens: number;
  outputTokens: number;
}

/**
 * Gọi 1 lượt DeepSeek Chat Completions. `json=true` bật response_format
 * json_object (DeepSeek yêu cầu chữ "json" xuất hiện đâu đó trong messages
 * — các prompt trong aiEngine.ts đều đã có sẵn từ "JSON" nên luôn thoả).
 */
export async function callDeepSeek(
  messages: DeepSeekMessage[],
  options: { json?: boolean; maxOutputTokens?: number } = {}
): Promise<DeepSeekCallResult> {
  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey) {
    throw Object.assign(new Error("MISSING_DEEPSEEK_API_KEY"), { code: "MISSING_DEEPSEEK_API_KEY" });
  }

  const res = await fetch(DEEPSEEK_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: DEEPSEEK_MODEL,
      messages,
      max_tokens: options.maxOutputTokens ?? 8192,
      ...(options.json ? { response_format: { type: "json_object" } } : {}),
    }),
  });

  if (!res.ok) {
    const errBody = await res.text().catch(() => "");
    throw Object.assign(new Error(`DeepSeek API lỗi ${res.status}: ${errBody.slice(0, 300)}`), {
      status: res.status,
    });
  }

  const data = await res.json();
  const choice = data?.choices?.[0];
  const text = choice?.message?.content || "";
  const finishReason = choice?.finish_reason;

  return {
    text,
    truncated: finishReason === "length",
    inputTokens: data?.usage?.prompt_tokens || 0,
    outputTokens: data?.usage?.completion_tokens || 0,
  };
}

export { DEEPSEEK_MODEL };
