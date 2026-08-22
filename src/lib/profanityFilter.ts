/**
 * Bộ lọc ngôn từ không chuẩn mực (chửi thề/tục tĩu/xúc phạm tiếng Việt) cho
 * nội dung người dùng tự nhập công khai (VD: diễn đàn phản hồi). Kiểm tra
 * theo TỪ (không phải chuỗi con bất kỳ) trên cả bản gốc lẫn bản đã bỏ dấu,
 * để vẫn bắt được cách viết né dấu/viết tắt phổ biến.
 *
 * Đây là bộ lọc theo từ khoá — không thể bắt tuyệt đối 100% mọi biến thể,
 * nên chỉ dùng để CHẶN LÚC GỬI (từ chối lưu + báo cô sửa lại); vẫn có thêm
 * lớp an toàn thứ 2 là admin có thể ẩn thủ công ở trang diễn đàn nếu có nội
 * dung lọt qua mà không phù hợp.
 */

// Danh sách từ khoá tục tĩu/xúc phạm tiếng Việt phổ biến (đã bỏ dấu, viết
// thường) — so khớp theo TỪ trên bản đã chuẩn hoá của nội dung nhập vào.
const BLOCKED_WORDS_NO_DIACRITICS = [
  "dcm", "dkm", "vcl", "vl", "vloz", "clm", "cmm", "dm", "dmm", "dit me", "dit con me",
  "loz", "lon", "cac", "buoi", "cu", "dm may", "djt", "djtme", "djt me",
  "thang cho", "con cho", "do cho", "sung sia", "sia me", "cai lon",
  "dumeo", "du me", "du ma", "dumas", "dumay", "dmm may",
  "ngu nhu bo", "do ngu", "do dien", "thang dien", "con diem", "diem",
  "do khon nan", "khon nan", "mat day", "vo hoc", "vo van hoa",
  "sung", "cac dai", "buoi gia", "lozz", "clgt", "vcđ", "dcđ",
];

function stripDiacritics(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/đ/gi, (m) => (m === "đ" ? "d" : "D"))
    .toLowerCase();
}

export interface ProfanityCheckResult {
  flagged: boolean;
  matchedWords: string[];
}

export function checkProfanity(text: string): ProfanityCheckResult {
  if (!text) return { flagged: false, matchedWords: [] };

  const normalized = stripDiacritics(text);
  // Bao quanh khoảng trắng để so khớp theo TỪ/CỤM TỪ, tránh chặn nhầm 1
  // chuỗi con vô hại nằm trong 1 từ tiếng Việt bình thường khác.
  const padded = ` ${normalized.replace(/[^\p{L}\p{N}\s]/gu, " ").replace(/\s+/g, " ")} `;

  const matched = BLOCKED_WORDS_NO_DIACRITICS.filter((word) => padded.includes(` ${word} `));

  return { flagged: matched.length > 0, matchedWords: matched };
}
