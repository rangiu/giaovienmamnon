import { HarmCategory, HarmBlockThreshold } from "@google/generative-ai";

/**
 * Ngưỡng an toàn (safety settings) dùng cho MỌI lệnh gọi Gemini sinh nội
 * dung (chat, giáo án, kịch bản video, ảnh minh hoạ...) — trước đây KHÔNG hề
 * cấu hình gì cả, mặc định để Google tự quyết ngưỡng lọc (tối ưu cho mục
 * đích chung, KHÔNG tối ưu riêng cho nội dung trẻ mầm non). Đặt cứng
 * BLOCK_LOW_AND_ABOVE (ngưỡng chặt nhất SDK hỗ trợ, chặn cả nội dung mới chỉ
 * XÁC SUẤT THẤP vi phạm) cho cả 4 hạng mục — ưu tiên AN TOÀN hơn hẳn khả
 * năng bị chặn nhầm 1 câu trả lời vô hại (chặn nhầm chỉ cần cô thử lại,
 * không tốn phí thêm; lọt nội dung không phù hợp cho trẻ mới là rủi ro thật
 * sự không chấp nhận được).
 */
export const PRESCHOOL_SAFETY_SETTINGS = [
  { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_LOW_AND_ABOVE },
  { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_LOW_AND_ABOVE },
  { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_LOW_AND_ABOVE },
  { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_LOW_AND_ABOVE },
];
