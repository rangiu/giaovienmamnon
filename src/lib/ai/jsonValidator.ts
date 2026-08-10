export interface StructuredLessonOutput {
  title: string;
  age_group: string;
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
  teacher_activities: string[];
  child_activities: string[];
  open_questions: string[];
  reinforcement_game: {
    name: string;
    rules: string;
    how_to_play: string;
  } | string;
  conclusion?: string;
  assessment?: string;
  extension?: string;
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

  // Try direct parse
  try {
    return JSON.parse(cleaned);
  } catch (e) {
    // Attempt regex extraction of first JSON object { ... }
    const match = cleaned.match(/\{[\s\S]*\}/);
    if (match) {
      try {
        return JSON.parse(match[0]);
      } catch (err) {
        console.error("Failed to parse regex extracted JSON:", err);
      }
    }
    return null;
  }
}

export function validateLessonOutput(data: any): StructuredLessonOutput | null {
  if (!data || typeof data !== "object") return null;

  return {
    title: data.title || "Giáo án Mầm non",
    age_group: data.age_group || data.ageGroup || "4–5 tuổi",
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
    teacher_activities: Array.isArray(data.teacher_activities)
      ? data.teacher_activities
      : [data.teacher_activities || "Cô tổ chức hoạt động."],
    child_activities: Array.isArray(data.child_activities)
      ? data.child_activities
      : [data.child_activities || "Trẻ hưởng ứng tham gia."],
    open_questions: Array.isArray(data.open_questions)
      ? data.open_questions
      : ["Con thấy thế nào về hoạt động này?"],
    reinforcement_game: data.reinforcement_game || {
      name: "Trò chơi củng cố",
      rules: "Tham gia hào hứng",
      how_to_play: "Thực hiện theo hướng dẫn của cô",
    },
    conclusion: data.conclusion || "Cô tổng kết và khen ngợi cả lớp.",
    assessment: data.assessment || "Đánh giá mức độ tham gia của trẻ.",
    extension: data.extension || "Hoạt động bổ trợ tại các góc chơi.",
  };
}
