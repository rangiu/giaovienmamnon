// QUAN TRỌNG: tên trường ở đây dùng camelCase để khớp ĐÚNG với những gì
// LessonCard.tsx, model Lesson trong Prisma và API lưu/đọc "/api/lessons"
// đang mong đợi (VD: `teacherActivities`, không phải `teacher_activities`).
// AI thì luôn trả JSON snake_case theo đúng prompt yêu cầu (xem
// generateLessonPlan) — validateLessonOutput() bên dưới đọc dữ liệu THÔ
// snake_case từ AI nhưng XUẤT RA object camelCase này. Trước đây
// validateLessonOutput() xuất thẳng snake_case, nên giáo án MỚI SOẠN (chưa
// lưu) hiển thị/lưu vào Kho Giáo án đều bị rỗng ở đúng các trường có gạch
// dưới (`teacherActivities`, `childActivities`, `openQuestions`,
// `reinforcementGame`, `ageGroup`) — vì LessonCard đọc theo tên camelCase,
// không tìm thấy field snake_case nên coi như rỗng.
export interface CustomSectionItem {
  heading: string;
  content: string | string[] | any;
}

export interface StructuredLessonOutput {
  title: string;
  ageGroup: string;
  duration: string;
  topic?: string;
  objectives: {
    knowledge: string;
    skills: string;
    attitude: string;
  } | string[];
  preparation: {
    teacher: string;
    child: string;
  } | string[];
  teacherActivities: string[];
  childActivities: string[];
  openQuestions: string[];
  reinforcementGame: {
    name: string;
    rules: string;
    how_to_play: string;
  } | string;
  conclusion?: string;
  assessment?: string;
  extension?: string;
  customSections?: CustomSectionItem[];
}

/**
 * Sửa lỗi cú pháp JSON phổ biến mà AI (đặc biệt DeepSeek) hay mắc: quên dấu
 * phẩy giữa 2 trường khi xuống dòng, ví dụ:
 *   "conclusion": "...xong."
 *   "assessment": "..."
 * (thiếu dấu phẩy sau "...xong." trước khi xuống dòng). Chỉ chèn dấu phẩy
 * khi có xuống dòng THẬT giữa 2 dấu " — không đụng tới chuỗi rỗng "" nằm
 * cùng 1 dòng, để tránh sửa nhầm JSON vốn đã hợp lệ.
 */
function repairMissingComma(text: string): string {
  return text.replace(/"[ \t]*\r?\n[ \t]*"/g, '",\n"');
}

/**
 * Sửa lỗi AI quên đóng dấu " ở cuối 1 chuỗi ngay trước khi đóng mảng/object,
 * ví dụ:
 *   "open_questions": [
 *     "Con thích loại hoa nào nhất? Vì sao?
 *   ],
 * (thiếu dấu " đóng chuỗi cuối cùng). Chỉ chèn khi ký tự ngay trước chỗ
 * xuống dòng KHÔNG phải dấu " hay khoảng trắng — JSON hợp lệ luôn kết thúc
 * chuỗi bằng " trước khi xuống dòng nên không đụng nhầm trường hợp đúng.
 */
function repairMissingClosingQuote(text: string): string {
  return text.replace(/([^"\s])([ \t]*\r?\n[ \t]*)(\]|\})/g, '$1"$2$3');
}

export function extractJsonFromText(rawText: string): any {
  if (!rawText) return null;

  // Clean codeblock markers
  let cleaned = rawText.trim();
  if (cleaned.startsWith("```json")) {
    cleaned = cleaned.replace(/^```json\s*/, "").replace(/\s*```$/, "");
  } else if (cleaned.startsWith("```")) {
    cleaned = cleaned.replace(/^```\s*/, "").replace(/\s*```$/, "");
  }

  // Attempt regex extraction of first JSON object { ... } trước, dùng chung
  // cho mọi lần thử parse bên dưới.
  const match = cleaned.match(/\{[\s\S]*\}/);
  const candidate = match ? match[0] : cleaned;

  // Thử lần lượt: nguyên văn -> sửa thiếu dấu phẩy -> sửa thêm thiếu dấu "
  // đóng chuỗi. Mỗi bước chỉ áp dụng khi bước trước vẫn lỗi, còn hơn bỏ
  // cuộc ngay và làm mất nguyên cả nội dung AI đã soạn chỉ vì 1 lỗi cú
  // pháp nhỏ.
  const attempts = [candidate, repairMissingComma(candidate)];
  attempts.push(repairMissingClosingQuote(attempts[attempts.length - 1]));

  for (const text of attempts) {
    try {
      return JSON.parse(text);
    } catch {
      // thử tiếp bước sau
    }
  }

  console.error("Failed to parse JSON even after repair attempts. Raw text:", rawText.slice(0, 500));
  return null;
}

/**
 * Chuẩn hoá 1 trường "danh sách hoạt động" (teacher_activities/child_activities/
 * open_questions) — trước đây chỉ kiểm tra `Array.isArray()`, nên khi AI trả
 * về đúng kiểu mảng nhưng RỖNG (VD: "teacher_activities": []) thì mảng rỗng
 * đó được giữ nguyên y hệt, khiến cả mục ("HOẠT ĐỘNG CỦA GIÁO VIÊN"...) hiện
 * tiêu đề nhưng không có nội dung nào bên trong. Giờ coi mảng rỗng giống hệt
 * trường hợp thiếu dữ liệu — luôn dùng câu mặc định để mục không bao giờ
 * trống trơn.
 */
function normalizeActivityList(value: any, fallback: string): string[] {
  if (Array.isArray(value)) {
    const cleaned = value.filter((v) => typeof v === "string" && v.trim());
    return cleaned.length > 0 ? cleaned : [fallback];
  }
  if (typeof value === "string" && value.trim()) return [value];
  return [fallback];
}

export function validateLessonOutput(data: any): StructuredLessonOutput | null {
  if (!data || typeof data !== "object") return null;

  return {
    title: data.title || "Giáo án Mầm non",
    // Đọc cả 2 kiểu tên trường từ phía AI (snake_case theo đúng prompt yêu
    // cầu, hoặc camelCase phòng khi model trả sai quy ước) — nhưng LUÔN
    // xuất ra camelCase để khớp với LessonCard/DB/API lưu giáo án.
    ageGroup: data.age_group || data.ageGroup || "4–5 tuổi",
    duration: data.duration || "30 phút",
    topic: data.topic || "Khám phá",
    objectives: data.objectives || {
      knowledge: "Trẻ nhận biết nội dung bài học.",
      skills: "Rèn kỹ năng quan sát.",
      attitude: "Trẻ tích cực tham gia.",
    },
    preparation: data.preparation || {
      teacher: "Đạo cụ giảng dạy.",
      child: "Trang phục thoải mái.",
    },
    teacherActivities: normalizeActivityList(data.teacher_activities ?? data.teacherActivities, "Cô tổ chức hoạt động."),
    childActivities: normalizeActivityList(data.child_activities ?? data.childActivities, "Trẻ hưởng ứng tham gia."),
    openQuestions: normalizeActivityList(data.open_questions ?? data.openQuestions, "Con thấy thế nào về hoạt động này?"),
    reinforcementGame: data.reinforcement_game || data.reinforcementGame || {
      name: "Trò chơi củng cố",
      rules: "Tham gia hào hứng",
      how_to_play: "Thực hiện theo hướng dẫn của cô",
    },
    conclusion: data.conclusion || "Cô tổng kết và khen ngợi cả lớp.",
    assessment: data.assessment || "Đánh giá mức độ tham gia của trẻ.",
    extension: data.extension || "Hoạt động bổ trợ tại các góc chơi.",
    customSections: Array.isArray(data.custom_sections || data.customSections)
      ? (data.custom_sections || data.customSections).map((sec: any) => ({
          heading: sec.heading || sec.title || "Mục giáo án",
          content: sec.content || sec.details || sec.description || "",
        }))
      : undefined,
  };
}
