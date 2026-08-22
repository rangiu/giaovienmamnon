import { runAiJson, AiTier } from "./aiProvider";
import { TemplateStructure } from "./systemTemplates";

const SYSTEM_INSTRUCTION_ANALYZE = `
Bạn là chuyên gia phân tích văn bản giáo dục mầm non Việt Nam.
Nhiệm vụ của bạn: Đọc văn bản thô từ file tài liệu giáo án do cô giáo tải lên, bóc tách cấu trúc tiêu đề, các phần và quy cách thể hiện thành đúng 1 đối tượng JSON theo định dạng quy định.

CẤU TRÚC JSON YÊU CẦU:
{
  "title": "Tên mẫu giáo án (ví dụ: Mẫu Giáo Án 5E Họa Mi, Mẫu Giáo Án Truyền Thống...)",
  "domainOrType": "Loại mẫu (ví dụ: Mẫu 5E, Mẫu Truyền Thống, Mẫu STEAM, Mẫu Phát triển Ngôn ngữ...)",
  "description": "Mô tả tóm tắt 1-2 câu về cấu trúc mẫu này",
  "sections": [
    {
      "key": "mã_độc_nhất_viết_thường_không_dấu (ví dụ: objectives, preparation, procedure, step1, step2, assessment...)",
      "heading": "Tên tiêu đề mục gốc (ví dụ: I. MỤC TIÊU BÀI HỌC, Hoạt động 1, II. CHUẨN BỊ...)",
      "description": "Hướng dẫn hoặc tóm tắt nội dung thuộc mục này",
      "contentType": "text | list | table",
      "tableColumns": ["Cột 1 (ví dụ: Hoạt động của cô)", "Cột 2 (ví dụ: Hoạt động của trẻ)"] // Chỉ trả về nếu contentType = "table"
    }
  ]
}

LƯU Ý QUAN TRỌNG:
1. Phải giữ đúng thứ tự các phần từ trên xuống dưới theo đúng file gốc.
2. Nếu mục nào chia làm 2 cột (ví dụ: Hoạt động của Cô | Hoạt động của Trẻ), hãy đặt contentType là "table" và liệt kê tên các cột vào tableColumns.
3. Không bỏ sót mục nào trong văn bản gốc.
`;

const SYSTEM_INSTRUCTION_REVIEW = `
Bạn là Trợ lý AI Kiểm duyệt Chất lượng Giáo án Mầm non.
Nhiệm vụ của bạn: Đọc văn bản thô và cấu trúc đã bóc tách từ file tài liệu giáo án do cô giáo tải lên, đánh giá xem đây có phải là một file giáo án/mẫu giáo án mầm non hợp lệ hay là file rác/không có giá trị.

TIÊU CHÍ ĐÁNH GIÁ (Thang điểm 0 - 100):
- Điểm 80-100: File giáo án/mẫu giáo án mầm non chuẩn mực, rõ ràng các phần (Mục tiêu, Chuẩn bị, Tiến hành/Hoạt động, Đánh giá), nội dung phong phú.
- Điểm 60-79: File giáo án mầm non ở mức khá/chấp nhận được, có đủ các phần cơ bản nhưng hơi ngắn hoặc thiếu vài chi tiết phụ.
- Điểm 0-59: File rác, văn bản thử nghiệm linh tinh, file văn bản không liên quan giáo dục mầm non, ký tự lỗi vô nghĩa, hoặc quá ngắn (< 50 từ).

CẤU TRÚC JSON YÊU CẦU:
{
  "score": 85, // Số nguyên từ 0 đến 100
  "isApprovedByAi": true, // true nếu score >= 60 và là tài liệu mầm non hợp lệ, ngược lại false
  "notes": "Nhận xét chi tiết 1-2 câu lý do đánh giá (ví dụ: File giáo án mầm non mẫu 5E chuẩn mực, đủ 5 bước khám phá)."
}
`;

/**
 * Phân tích văn bản thô từ file thành cấu trúc TemplateStructure (JSON)
 */
export async function analyzeTemplateStructure(
  rawText: string,
  fileName: string,
  tier: AiTier = "LIMITED"
): Promise<TemplateStructure> {
  const prompt = `Phân tích cấu trúc file tài liệu sau đây (Tên file: ${fileName}):\n\n${rawText.slice(0, 8000)}`;

  const res = await runAiJson(tier, {
    systemInstruction: SYSTEM_INSTRUCTION_ANALYZE,
    prompt,
  });

  if (res.parsed && res.parsed.sections && Array.isArray(res.parsed.sections)) {
    return {
      title: res.parsed.title || fileName.replace(/\.[^/.]+$/, ""),
      domainOrType: res.parsed.domainOrType || "Mẫu Giáo Án Tùy Chỉnh",
      description: res.parsed.description || "Mẫu giáo án tùy chỉnh do giáo viên tải lên.",
      sections: res.parsed.sections.map((sec: any, idx: number) => ({
        key: sec.key || `section_${idx + 1}`,
        heading: sec.heading || `Mục ${idx + 1}`,
        description: sec.description || "",
        contentType: sec.contentType === "table" ? "table" : sec.contentType === "list" ? "list" : "text",
        tableColumns: Array.isArray(sec.tableColumns) ? sec.tableColumns : undefined,
      })),
    };
  }

  // Fallback cấu trúc mặc định nếu AI không parse được
  return {
    title: fileName.replace(/\.[^/.]+$/, ""),
    domainOrType: "Mẫu Giáo Án Tùy Chỉnh",
    description: "Mẫu giáo án tải lên từ file.",
    sections: [
      {
        key: "objectives",
        heading: "I. MỤC TIÊU BÀI HỌC",
        description: "Yêu cầu về kiến thức, kỹ năng, thái độ.",
        contentType: "list",
      },
      {
        key: "preparation",
        heading: "II. CHUẨN BỊ",
        description: "Đồ dùng dạy học và không gian.",
        contentType: "text",
      },
      {
        key: "procedure",
        heading: "III. TIẾN HÀNH HOẠT ĐỘNG",
        description: "Diễn biến chi tiết tiết dạy.",
        contentType: "table",
        tableColumns: ["Hoạt động của Cô", "Hoạt động của Trẻ"],
      },
      {
        key: "assessment",
        heading: "IV. ĐÁNH GIÁ",
        description: "Đánh giá tiết học.",
        contentType: "text",
      },
    ],
  };
}

/**
 * Đánh giá chất lượng & độ chuẩn mực của file giáo án bằng AI
 */
export async function reviewTemplateQualityWithAI(
  rawText: string,
  structureJson: string,
  tier: AiTier = "LIMITED"
): Promise<{ isApprovedByAi: boolean; score: number; notes: string }> {
  const prompt = `Đánh giá chất lượng file mẫu giáo án mầm non sau đây:\n\nVĂN BẢN THÔ (trích 3000 ký tự):\n${rawText.slice(
    0,
    3000
  )}\n\nCẤU TRÚC BÓC TÁCH:\n${structureJson}`;

  const res = await runAiJson(tier, {
    systemInstruction: SYSTEM_INSTRUCTION_REVIEW,
    prompt,
  });

  if (res.parsed && typeof res.parsed.score === "number") {
    const score = Math.max(0, Math.min(100, Math.round(res.parsed.score)));
    return {
      isApprovedByAi: res.parsed.isApprovedByAi !== false && score >= 60,
      score,
      notes: res.parsed.notes || (score >= 60 ? "File hợp lệ." : "File không đủ chất lượng."),
    };
  }

  // Fallback đánh giá theo độ dài văn bản
  const wordCount = rawText.trim().split(/\s+/).length;
  const score = wordCount >= 100 ? 75 : 40;
  return {
    isApprovedByAi: score >= 60,
    score,
    notes: score >= 60 ? "File tài liệu chứa đủ nội dung cơ bản." : "File quá ngắn hoặc không chứa nội dung giáo án mầm non.",
  };
}
