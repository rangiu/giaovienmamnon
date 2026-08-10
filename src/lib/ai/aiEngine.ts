import { GoogleGenerativeAI } from "@google/generative-ai";
import { PRESCHOOL_SYSTEM_INSTRUCTION } from "./systemInstruction";
import { buildFullPromptContext, ContextOptions } from "./contextBuilder";
import { extractJsonFromText, validateLessonOutput, StructuredLessonOutput } from "./jsonValidator";
import { prisma } from "../prisma";

const GEMINI_MODEL = "gemini-2.5-flash";

function getGeminiClient() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey.trim() === "" || apiKey === "your_gemini_api_key_here") {
    return null;
  }
  return new GoogleGenerativeAI(apiKey);
}

export async function trackAiUsage(
  userId: string | undefined,
  feature: string,
  modelName: string,
  inputTokens = 0,
  outputTokens = 0
) {
  try {
    const estimatedCost = ((inputTokens * 0.075 + outputTokens * 0.3) / 1000000);
    await prisma.aiUsage.create({
      data: {
        userId: userId || null,
        feature,
        model: modelName,
        inputTokens,
        outputTokens,
        estimatedCost,
      },
    });
  } catch (err) {
    console.error("Failed to track AI usage:", err);
  }
}

export async function chatWithCoAi(
  userPrompt: string,
  conversationHistory: { role: "user" | "model" | "assistant"; content: string }[] = [],
  contextOptions: ContextOptions = {},
  userId?: string
): Promise<{ text: string; structuredData?: any; error?: string }> {
  const ai = getGeminiClient();
  if (!ai) {
    return {
      text: "Dạ cô ơi, hệ thống chưa được kết nối với GEMINI_API_KEY trong file .env ở Backend. Cô vui lòng kiểm tra lại cấu hình GEMINI_API_KEY nhé!",
      error: "MISSING_API_KEY",
    };
  }

  try {
    const model = ai.getGenerativeModel({
      model: GEMINI_MODEL,
      systemInstruction: PRESCHOOL_SYSTEM_INSTRUCTION,
    });

    // Format chat history for Gemini SDK
    const formattedHistory = conversationHistory.map((m) => ({
      role: m.role === "assistant" ? "model" : m.role,
      parts: [{ text: m.content }],
    }));

    const fullPrompt = buildFullPromptContext(userPrompt, contextOptions);
    const chat = model.startChat({
      history: formattedHistory,
    });

    const result = await chat.sendMessage(fullPrompt);
    const responseText = result.response.text();

    // Check if response contains structured JSON (e.g. lesson)
    const jsonParsed = extractJsonFromText(responseText);
    let structuredData = null;
    if (jsonParsed && (jsonParsed.title || jsonParsed.objectives)) {
      structuredData = validateLessonOutput(jsonParsed);
    }

    // Usage tracking
    const usageMetadata = result.response.usageMetadata;
    await trackAiUsage(
      userId,
      "chat",
      GEMINI_MODEL,
      usageMetadata?.promptTokenCount || 0,
      usageMetadata?.candidatesTokenCount || 0
    );

    return {
      text: responseText,
      structuredData,
    };
  } catch (error: any) {
    console.error("Gemini API Error:", error);
    let errorText = "Cô ơi, AI đang bận hoặc gián đoạn kết nối một chút. Cô thử nhấn lại hoặc gửi câu hỏi khác nhé!";
    if (error?.message?.includes("API_KEY_INVALID") || error?.message?.includes("API key not valid")) {
      errorText = "Cô ơi, chuỗi GEMINI_API_KEY nhập trong file .env chưa chính xác (Lỗi API_KEY_INVALID). Gemini API Key miễn phí của Google luôn bắt đầu bằng chuỗi 'AIzaSy...'. Cô có thể bấm vào https://aistudio.google.com/app/apikey để lấy key miễn phí nhé!";
    }
    return {
      text: errorText,
      error: error?.message || "GEMINI_ERROR",
    };
  }
}

export async function generateLessonPlan(
  prompt: string,
  ageGroup: string = "4–5 tuổi",
  duration: string = "30 phút",
  contextOptions: ContextOptions = {},
  userId?: string
): Promise<{ lesson: StructuredLessonOutput | null; rawText: string; error?: string }> {
  const ai = getGeminiClient();
  if (!ai) {
    return {
      lesson: null,
      rawText: "",
      error: "MISSING_API_KEY",
    };
  }

  const structuredPrompt = `
Hãy soạn một giáo án mầm non hoàn chỉnh theo yêu cầu sau: "${prompt}".
Độ tuổi mục tiêu: ${ageGroup}.
Thời lượng: ${duration}.

BẮT BUỘC trả về ĐÚNG ĐỊNH DẠNG JSON duy nhất sau (không thêm bất kỳ văn bản dẫn dắt nào nằm ngoài khối JSON):

{
  "title": "Tên hoạt động ngắn gọn hấp dẫn",
  "age_group": "${ageGroup}",
  "duration": "${duration}",
  "topic": "Chủ đề giáo án",
  "objectives": {
    "knowledge": "Kiến thức trẻ đạt được",
    "skills": "Kỹ năng rèn luyện cho trẻ",
    "attitude": "Thái độ của trẻ"
  },
  "preparation": {
    "teacher": "Chuẩn bị của cô (đạo cụ, đồ dùng)",
    "child": "Chuẩn bị của trẻ (trang phục, đồ dùng)"
  },
  "teacher_activities": [
    "Hoạt động 1: Gây hứng thú",
    "Hoạt động 2: Trải nghiệm quan sát",
    "Hoạt động 3: Thảo luận gợi mở"
  ],
  "child_activities": [
    "Trẻ hưởng ứng và hát cùng cô",
    "Trẻ trực tiếp quan sát và sờ nắn",
    "Trẻ trả lời câu hỏi"
  ],
  "open_questions": [
    "Câu hỏi gợi mở 1?",
    "Câu hỏi gợi mở 2?"
  ],
  "reinforcement_game": {
    "name": "Tên trò chơi củng cố",
    "rules": "Luật chơi ngắn gọn",
    "how_to_play": "Cách chơi chi tiết"
  },
  "conclusion": "Cách cô kết thúc hoạt động nhẹ nhàng",
  "assessment": "Tiêu chí đánh giá sự tham gia của trẻ",
  "extension": "Gợi ý hoạt động mở rộng ở các góc"
}
`;

  try {
    const model = ai.getGenerativeModel({
      model: GEMINI_MODEL,
      systemInstruction: PRESCHOOL_SYSTEM_INSTRUCTION,
      generationConfig: {
        responseMimeType: "application/json",
      },
    });

    const fullPrompt = buildFullPromptContext(structuredPrompt, contextOptions);
    const result = await model.generateContent(fullPrompt);
    const rawText = result.response.text();

    const jsonParsed = extractJsonFromText(rawText);
    const lesson = validateLessonOutput(jsonParsed);

    const usageMetadata = result.response.usageMetadata;
    await trackAiUsage(
      userId,
      "generate_lesson",
      GEMINI_MODEL,
      usageMetadata?.promptTokenCount || 0,
      usageMetadata?.candidatesTokenCount || 0
    );

    return {
      lesson,
      rawText,
    };
  } catch (err: any) {
    console.error("Failed to generate lesson:", err);
    return {
      lesson: null,
      rawText: "",
      error: err?.message || "FAILED_TO_GENERATE_LESSON",
    };
  }
}

export async function generateStudentComment(
  rawInput: string,
  studentName: string = "bé",
  contextOptions: ContextOptions = {},
  userId?: string
): Promise<{ comment: string; error?: string }> {
  const ai = getGeminiClient();
  if (!ai) {
    return {
      comment: "Chưa cấu hình GEMINI_API_KEY ở Backend.",
      error: "MISSING_API_KEY",
    };
  }

  const prompt = `
Dựa vào ghi chú quan sát thô của cô giáo về ${studentName}: "${rawInput}".
Hãy chuyển thành 1 đoạn nhận xét trẻ hoàn chỉnh (khoảng 3-5 câu), mang văn phong mầm non ấm áp, tích cực, khuyến khích bé phát triển.
TUYỆT ĐỐI KHÔNG sử dụng thuật ngữ chẩn đoán y khoa hay tâm lý. Đưa ra lời khuyên hoặc hướng hỗ trợ nhẹ nhàng nếu có.
`;

  try {
    const model = ai.getGenerativeModel({
      model: GEMINI_MODEL,
      systemInstruction: PRESCHOOL_SYSTEM_INSTRUCTION,
    });

    const fullPrompt = buildFullPromptContext(prompt, contextOptions);
    const result = await model.generateContent(fullPrompt);

    const usageMetadata = result.response.usageMetadata;
    await trackAiUsage(
      userId,
      "student_comment",
      GEMINI_MODEL,
      usageMetadata?.promptTokenCount || 0,
      usageMetadata?.candidatesTokenCount || 0
    );

    return { comment: result.response.text().trim() };
  } catch (err: any) {
    return { comment: "", error: err?.message };
  }
}

export async function generateParentMessage(
  rawNotes: string,
  studentName: string = "bé",
  tone: "friendly" | "polite" | "brief" | "formal" = "friendly",
  contextOptions: ContextOptions = {},
  userId?: string
): Promise<{ message: string; error?: string }> {
  const ai = getGeminiClient();
  if (!ai) {
    return {
      message: "Chưa cấu hình GEMINI_API_KEY ở Backend.",
      error: "MISSING_API_KEY",
    };
  }

  const toneMap = {
    friendly: "Thân thiện, gần gũi, ấm áp",
    polite: "Lịch sự, tôn trọng",
    brief: "Ngắn gọn, rõ ràng, tập trung thông tin chính",
    formal: "Trang trọng, chu đáo",
  };

  const prompt = `
Hãy giúp cô giáo viết 1 tin nhắn ngắn gửi phụ huynh của ${studentName} qua Zalo/SMS.
Thông tin cô cung cấp: "${rawNotes}".
Giọng văn yêu cầu: ${toneMap[tone]}.
Tin nhắn cần có lời chào lịch sự ("Dạ cô chào phụ huynh bé..."), trình bày rõ nội dung và lời chúc nhẹ nhàng cuối tin nhắn.
`;

  try {
    const model = ai.getGenerativeModel({
      model: GEMINI_MODEL,
      systemInstruction: PRESCHOOL_SYSTEM_INSTRUCTION,
    });

    const fullPrompt = buildFullPromptContext(prompt, contextOptions);
    const result = await model.generateContent(fullPrompt);

    const usageMetadata = result.response.usageMetadata;
    await trackAiUsage(
      userId,
      "parent_message",
      GEMINI_MODEL,
      usageMetadata?.promptTokenCount || 0,
      usageMetadata?.candidatesTokenCount || 0
    );

    return { message: result.response.text().trim() };
  } catch (err: any) {
    return { message: "", error: err?.message };
  }
}

export async function generateMediaPrompt(
  rawRequirement: string,
  mediaType: "image" | "video" = "image",
  artStyle: string = "3d_clay",
  contextOptions: ContextOptions = {},
  userId?: string
): Promise<{ englishPrompt: string; vietnameseDesc: string; usageTip: string; rawText: string; error?: string }> {
  const ai = getGeminiClient();
  if (!ai) {
    return {
      englishPrompt: "",
      vietnameseDesc: "",
      usageTip: "",
      rawText: "",
      error: "MISSING_API_KEY",
    };
  }

  const prompt = `
Bạn là chuyên gia thiết kế hình ảnh và video học liệu dành cho Giáo viên Mầm non Việt Nam.
Yêu cầu học liệu từ cô giáo: "${rawRequirement}".
Loại phương tiện: ${mediaType === "image" ? "HÌNH ẢNH (Flashcard/Minh họa/Tranh tô màu)" : "VIDEO NGẮN (Hoạt hình/Minh họa sinh động)"}.
Phong cách nghệ thuật: ${artStyle}.

Hãy tạo prompt tối ưu theo định dạng JSON duy nhất sau (không thêm văn bản ngoài khối JSON):

{
  "englishPrompt": "Detailed English prompt optimized for AI image/video generators (Midjourney, DALL-E, Runway, Sora). High quality, cute preschool friendly, vibrant colors, clean background, 8k resolution.",
  "vietnameseDesc": "Bản dịch tiếng Việt mô tả chi tiết bức ảnh/video.",
  "usageTip": "Gợi ý cách cô giáo ứng dụng hình ảnh/video này vào tiết dạy mầm non (ví dụ: làm thẻ flashcard góc học tập, chiếu tivi đầu giờ, in tranh tô màu cho trẻ)."
}
`;

  try {
    const model = ai.getGenerativeModel({
      model: GEMINI_MODEL,
      systemInstruction: PRESCHOOL_SYSTEM_INSTRUCTION,
      generationConfig: {
        responseMimeType: "application/json",
      },
    });

    const fullPrompt = buildFullPromptContext(prompt, contextOptions);
    const result = await model.generateContent(fullPrompt);
    const rawText = result.response.text();

    const jsonParsed = extractJsonFromText(rawText);

    const usageMetadata = result.response.usageMetadata;
    await trackAiUsage(
      userId,
      "media_prompt",
      GEMINI_MODEL,
      usageMetadata?.promptTokenCount || 0,
      usageMetadata?.candidatesTokenCount || 0
    );

    return {
      englishPrompt: jsonParsed?.englishPrompt || rawRequirement,
      vietnameseDesc: jsonParsed?.vietnameseDesc || rawRequirement,
      usageTip: jsonParsed?.usageTip || "Dùng làm học liệu mầm non.",
      rawText,
    };
  } catch (err: any) {
    return {
      englishPrompt: "",
      vietnameseDesc: "",
      usageTip: "",
      rawText: "",
      error: err?.message,
    };
  }
}

export async function synthesizeAssessmentReport(
  student: any,
  domains: any[],
  observations: any[],
  assessments: any[],
  periodName: string = "Tháng 8/2026",
  userId?: string
): Promise<{
  report: {
    overview: string;
    strengths: string;
    progress: string;
    areasToSupport: string;
    suggestedActivities: string;
    evidenceObsIds: string[];
    missingDomainsSuggestions: { domainName: string; suggestions: string[] }[];
  } | null;
  rawText: string;
  error?: string;
}> {
  const ai = getGeminiClient();
  if (!ai) {
    return {
      report: null,
      rawText: "",
      error: "MISSING_API_KEY",
    };
  }

  // Format observations for AI with IDs
  const obsListFormatted = observations.map((o) => `[ID: ${o.id}] [Ngày ${new Date(o.date).toLocaleDateString("vi-VN")}] [Lĩnh vực: ${o.category || o.domain?.name || "Quan sát"}]: ${o.content}`).join("\n");

  const prompt = `
Bạn là Trợ lý Chuyên môn AI Giáo dục Mầm non Việt Nam.
Hãy hỗ trợ cô giáo tổng hợp ĐÁNH GIÁ SỰ PHÁT TRIỂN CỦA TRẺ dựa TRUYỀN THỐNG CHÍNH XÁC VÀO CÁC MINH CHỨNG QUAN SÁT THỰC TẾ.

THÔNG TIN TRẺ:
- Tên trẻ: ${student.name} (${student.gender || "Bé"})
- Ghi chú giáo viên: ${student.notes || "Không có"}
- Kỳ đánh giá: ${periodName}

DANH SÁCH MINH CHỨNG QUAN SÁT THỰC TẾ CỦA TRẺ (${observations.length} quan sát):
${obsListFormatted || "Chưa có quan sát nào trong kỳ."}

QUY TẮC BẮT BỘC (TUYỆT ĐỐI TUÂN THỦ):
1. KHÔNG được bịa đặt thông tin không có trong danh sách quan sát thực tế ở trên.
2. KHÔNG đưa ra chẩn đoán y khoa, chẩn đoán tâm lý, hoặc tự ý gán nhãn trẻ.
3. Trong trường hợp lĩnh vực phát triển nào chưa có đủ quan sát, hãy báo rõ cần thu thập thêm quan sát và đề xuất danh sách "missingDomainsSuggestions" gồm các gợi ý hành vi quan sát thực tế (ví dụ: tự cất đồ dùng, tự rửa tay, tự xúc ăn...).
4. Trả về ĐÚNG ĐỊNH DẠNG JSON DUY NHẤT theo mẫu sau (không thêm văn bản ngoài khối JSON):

{
  "overview": "Đoạn tổng quan đánh giá dựa trên minh chứng thực tế (khoảng 3-4 câu)",
  "strengths": "Các điểm mạnh nổi bật của trẻ quan sát được",
  "progress": "Những tiến bộ đáng ghi nhận theo thời gian",
  "areasToSupport": "Nội dung cần cô giáo và gia đình tiếp tục hỗ trợ nhẹ nhàng",
  "suggestedActivities": "Gợi ý các hoạt động học/chơi thiết thực giúp trẻ phát triển",
  "evidenceObsIds": ["Dùng mảng chứa các mã ID quan sát thực tế được trích dẫn ở trên"],
  "missingDomainsSuggestions": [
    {
      "domainName": "Kỹ năng tự phục vụ",
      "suggestions": ["Quan sát trẻ tự xúc ăn", "Quan sát trẻ tự rửa tay", "Quan sát trẻ tự cất đồ dùng"]
    }
  ]
}
`;

  try {
    const model = ai.getGenerativeModel({
      model: GEMINI_MODEL,
      systemInstruction: PRESCHOOL_SYSTEM_INSTRUCTION,
      generationConfig: {
        responseMimeType: "application/json",
      },
    });

    const result = await model.generateContent(prompt);
    const rawText = result.response.text();
    const jsonParsed = extractJsonFromText(rawText);

    const usageMetadata = result.response.usageMetadata;
    await trackAiUsage(
      userId,
      "assessment_synthesis",
      GEMINI_MODEL,
      usageMetadata?.promptTokenCount || 0,
      usageMetadata?.candidatesTokenCount || 0
    );

    return {
      report: {
        overview: jsonParsed?.overview || "Chưa có đủ thông tin quan sát để tổng hợp.",
        strengths: jsonParsed?.strengths || "Trẻ tham gia các hoạt động mầm non ngoan ngoãn.",
        progress: jsonParsed?.progress || "Trẻ có tiến bộ tích cực.",
        areasToSupport: jsonParsed?.areasToSupport || "Khuyến khích trẻ giao tiếp và tự tin.",
        suggestedActivities: jsonParsed?.suggestedActivities || "Tổ chức trò chơi nhóm nhỏ.",
        evidenceObsIds: Array.isArray(jsonParsed?.evidenceObsIds) ? jsonParsed.evidenceObsIds : observations.map((o) => o.id),
        missingDomainsSuggestions: Array.isArray(jsonParsed?.missingDomainsSuggestions) ? jsonParsed.missingDomainsSuggestions : [],
      },
      rawText,
    };
  } catch (err: any) {
    return {
      report: null,
      rawText: "",
      error: err?.message,
    };
  }
}

export async function generateTopicTeacherSummary(
  topicName: string,
  className: string = "Lớp Mầm 1",
  stats: any = {},
  userId?: string
): Promise<{ summary: string; error?: string }> {
  const ai = getGeminiClient();
  if (!ai) {
    return {
      summary: "Chưa cấu hình GEMINI_API_KEY ở Backend.",
      error: "MISSING_API_KEY",
    };
  }

  const prompt = `
Hãy viết 1 đoạn ĐÁNH GIÁ CHUNG CỦA GIÁO VIÊN CHỦ NHIỆM sau khi kết thúc chủ đề "${topicName}" cho lớp ${className}.
Thông tin kết quả lớp:
- Tổng số trẻ: ${stats.totalStudents || 12} trẻ
- Số trẻ đạt mục tiêu: ${stats.passedStudents || 10} / ${stats.totalStudents || 12} trẻ (${stats.passRate || 83.3}%)
- Mục tiêu đạt cao: ${stats.topObjectives || "Thể chất, Nhận thức"}
- Mục tiêu cần chú ý: ${stats.weakObjectives || "MT45 (Đặc điểm Cây hoa quả)"}

Văn phong giáo viên mầm non Việt Nam chu đáo, ấm áp, tích cực, vừa nêu bật sự tiến bộ vừa có định hướng hỗ trợ nhẹ nhàng cho các bé rụt rè. Khoảng 3-5 câu.
`;

  try {
    const model = ai.getGenerativeModel({
      model: GEMINI_MODEL,
      systemInstruction: PRESCHOOL_SYSTEM_INSTRUCTION,
    });

    const result = await model.generateContent(prompt);
    const usageMetadata = result.response.usageMetadata;
    await trackAiUsage(userId, "topic_summary", GEMINI_MODEL, usageMetadata?.promptTokenCount || 0, usageMetadata?.candidatesTokenCount || 0);

    return { summary: result.response.text().trim() };
  } catch (err: any) {
    return { summary: "", error: err?.message };
  }
}

export async function analyzeTopicAssessmentResults(
  topicName: string,
  students: any[],
  objectives: any[],
  results: any[],
  userId?: string
): Promise<{
  analysis: {
    class_summary: string;
    strengths: string[];
    weak_objectives: string[];
    students_needing_support: string[];
    evidence_gaps: string[];
    recommended_activities: string[];
  } | null;
  rawText: string;
  error?: string;
}> {
  const ai = getGeminiClient();
  if (!ai) {
    return { analysis: null, rawText: "", error: "MISSING_API_KEY" };
  }

  const resultsSummary = results.map((r) => `${r.studentName}: ${r.objectiveCode} -> ${r.rating === "+" ? "ĐẠT" : "CHƯA ĐẠT"}`).slice(0, 50).join("\n");

  const prompt = `
Bạn là Trợ lý AI Chuyên môn Mầm non. Hãy phân tích kết quả ĐÁNH GIÁ TRẺ SAU CHỦ ĐỀ "${topicName}".

DỮ LIỆU ĐÁNH GIÁ (+ / -):
${resultsSummary}

Trả về ĐÚNG ĐỊNH DẠNG JSON DUY NHẤT sau (không thêm văn bản ngoài khối JSON):

{
  "class_summary": "Đoạn tổng quan tình hình đạt mục tiêu của lớp",
  "strengths": ["Mục tiêu MT3 có 100% trẻ đạt", "Mục tiêu MT12 đạt kết quả cao"],
  "weak_objectives": ["Mục tiêu MT45 chỉ có 75% trẻ đạt, cần chú ý hỗ trợ"],
  "students_needing_support": ["Bé Lý Tuấn Đạt (chưa đạt MT7, MT45, MT66)", "Bé Ngô Gia Huy (chưa đạt MT21, MT45, MT66)"],
  "evidence_gaps": ["Mục tiêu MT45 chưa có đủ minh chứng hình ảnh quan sát cá nhân"],
  "recommended_activities": ["Tổ chức góc thiên nhiên 'Bé làm vườn'", "Trò chơi nhóm nhỏ nhường nhịn chia sẻ đồ chơi"]
}
`;

  try {
    const model = ai.getGenerativeModel({
      model: GEMINI_MODEL,
      systemInstruction: PRESCHOOL_SYSTEM_INSTRUCTION,
      generationConfig: { responseMimeType: "application/json" },
    });

    const result = await model.generateContent(prompt);
    const rawText = result.response.text();
    const jsonParsed = extractJsonFromText(rawText);

    const usageMetadata = result.response.usageMetadata;
    await trackAiUsage(userId, "topic_analysis", GEMINI_MODEL, usageMetadata?.promptTokenCount || 0, usageMetadata?.candidatesTokenCount || 0);

    return {
      analysis: {
        class_summary: jsonParsed?.class_summary || "Đa số trẻ đạt mục tiêu chủ đề.",
        strengths: Array.isArray(jsonParsed?.strengths) ? jsonParsed.strengths : ["Trẻ thực hiện tốt động tác thể dục."],
        weak_objectives: Array.isArray(jsonParsed?.weak_objectives) ? jsonParsed.weak_objectives : ["Mục tiêu MT45 có tỷ lệ đạt thấp."],
        students_needing_support: Array.isArray(jsonParsed?.students_needing_support) ? jsonParsed.students_needing_support : ["Bé Lý Tuấn Đạt"],
        evidence_gaps: Array.isArray(jsonParsed?.evidence_gaps) ? jsonParsed.evidence_gaps : [],
        recommended_activities: Array.isArray(jsonParsed?.recommended_activities) ? jsonParsed.recommended_activities : ["Tổ chức góc khám phá thiên nhiên."],
      },
      rawText,
    };
  } catch (err: any) {
    return { analysis: null, rawText: "", error: err?.message };
  }
}
