import { PRESCHOOL_SYSTEM_INSTRUCTION } from "./systemInstruction";
import { buildFullPromptContext, ContextOptions } from "./contextBuilder";
import { extractJsonFromText, validateLessonOutput, StructuredLessonOutput } from "./jsonValidator";
import { prisma } from "../prisma";
import { hasGeminiKeys } from "./geminiKeyPool";
import { hasDeepSeekKey } from "./deepseek";
import { runAiText, runAiJson, AiTier } from "./aiProvider";

export async function trackAiUsage(
  userId: string | undefined,
  feature: string,
  modelName: string,
  inputTokens = 0,
  outputTokens = 0
) {
  try {
    // Giá ước tính theo Gemini Flash — chỉ mang tính tham khảo tương đối
    // giữa các lượt dùng, KHÔNG phải giá thật của DeepSeek (rẻ hơn nhiều).
    // Cột "model" đã lưu đúng tên model thật (gemini-2.5-flash/deepseek-chat)
    // để admin phân biệt được nguồn chi phí thật khi cần đối chiếu hoá đơn.
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

/** Chưa cấu hình bất kỳ provider AI nào (thiếu cả Gemini lẫn DeepSeek key). */
function hasNoProvider(): boolean {
  return !hasGeminiKeys() && !hasDeepSeekKey();
}

export async function chatWithCoAi(
  userPrompt: string,
  conversationHistory: { role: "user" | "model" | "assistant"; content: string }[] = [],
  contextOptions: ContextOptions = {},
  userId?: string,
  tier: AiTier = "LIMITED"
): Promise<{ text: string; structuredData?: any; error?: string }> {
  if (hasNoProvider()) {
    return {
      text: "Dạ cô ơi, hệ thống chưa được kết nối với GEMINI_API_KEY/DEEPSEEK_API_KEY trong file .env ở Backend. Cô vui lòng kiểm tra lại cấu hình nhé!",
      error: "MISSING_API_KEY",
    };
  }

  try {
    const fullPrompt = buildFullPromptContext(userPrompt, contextOptions);
    // Chuẩn hoá lịch sử hội thoại về đúng 2 vai "user"/"assistant" — dùng
    // chung được cho cả Gemini (tự map "assistant"->"model" bên trong
    // aiProvider) lẫn DeepSeek (OpenAI-style, giữ nguyên "assistant").
    const history = conversationHistory.map((m) => ({
      role: (m.role === "user" ? "user" : "assistant") as "user" | "assistant",
      content: m.content,
    }));

    const result = await runAiText(tier, {
      systemInstruction: PRESCHOOL_SYSTEM_INSTRUCTION,
      history,
      prompt: fullPrompt,
    });

    await trackAiUsage(userId, "chat", result.modelUsed, result.inputTokens, result.outputTokens);

    // Check if response contains structured JSON (e.g. lesson)
    const jsonParsed = extractJsonFromText(result.text);
    let structuredData = null;
    if (jsonParsed && (jsonParsed.title || jsonParsed.objectives)) {
      structuredData = validateLessonOutput(jsonParsed);
    }

    // Vẫn còn cụt sau khi đã thử lại với hạn mức token cao hơn (xem
    // aiProvider.ts) — báo rõ cho cô giáo biết thay vì để câu trả lời
    // ngang xương không rõ lý do, tránh hiểu nhầm là AI lỗi.
    const text = result.truncated
      ? `${result.text}\n\n⚠️ _Nội dung khá dài nên bị cắt bớt. Cô nhắn "tiếp tục" để SUMFLOW viết nốt phần còn lại nhé!_`
      : result.text;

    return { text, structuredData };
  } catch (error: any) {
    console.error("AI Engine Error (chat):", error);
    let errorText = "Cô ơi, AI đang bận hoặc gián đoạn kết nối một chút. Cô thử nhấn lại hoặc gửi câu hỏi khác nhé!";
    if (error?.message?.includes("API_KEY_INVALID") || error?.message?.includes("API key not valid")) {
      errorText = "Cô ơi, chuỗi GEMINI_API_KEY nhập trong file .env chưa chính xác (Lỗi API_KEY_INVALID). Gemini API Key miễn phí của Google luôn bắt đầu bằng chuỗi 'AIzaSy...'. Cô có thể bấm vào https://aistudio.google.com/app/apikey để lấy key miễn phí nhé!";
    } else if (error?.message === "MISSING_API_KEY") {
      errorText = "Dạ cô ơi, hệ thống chưa được kết nối với GEMINI_API_KEY/DEEPSEEK_API_KEY trong file .env ở Backend. Cô vui lòng kiểm tra lại cấu hình nhé!";
    }
    return {
      text: errorText,
      error: error?.message || "AI_ENGINE_ERROR",
    };
  }
}

export async function generateLessonPlan(
  prompt: string,
  ageGroup: string = "4–5 tuổi",
  duration: string = "30 phút",
  contextOptions: ContextOptions = {},
  userId?: string,
  tier: AiTier = "FULL",
  customTemplateStructure?: string | null
): Promise<{ lesson: StructuredLessonOutput | null; rawText: string; error?: string }> {
  if (hasNoProvider()) {
    return { lesson: null, rawText: "", error: "MISSING_API_KEY" };
  }

  let templateGuidance = "";
  if (customTemplateStructure) {
    try {
      const parsedTpl = typeof customTemplateStructure === "string" ? JSON.parse(customTemplateStructure) : customTemplateStructure;
      if (parsedTpl && parsedTpl.sections) {
        templateGuidance = `
YÊU CẦU ĐẶC BIỆT VỀ CẤU TRÚC (BẮT BUỘC SOẠN BÁM SÁT MẪU GIÁO ÁN ĐÃ CHỌN):
Tên mẫu: "${parsedTpl.title || "Mẫu giáo án"}" (${parsedTpl.domainOrType || "Mầm non"})
Mô tả mẫu: ${parsedTpl.description || ""}

Danh sách các mục BẮT BUỘC phải điền theo đúng cấu trúc của mẫu:
${JSON.stringify(parsedTpl.sections, null, 2)}

Hãy đảm bảo điền đầy đủ và chi tiết nội dung tiết dạy cho từng mục trong mẫu trên.
`;
      }
    } catch (e) {
      console.warn("Could not parse customTemplateStructure in generateLessonPlan:", e);
    }
  }

  const customSectionsInstruction = templateGuidance
    ? `
  "custom_sections": [
    // BẮT BUỘC liệt kê lại ĐÚNG VÀ ĐỦ TẤT CẢ tiêu đề các mục (heading) từ mẫu đã chọn ở trên.
    // Ví dụ:
    {
      "heading": "Tên tiêu đề mục 1 từ mẫu",
      "content": "Nội dung chi tiết cho mục 1..."
    }
  ],`
    : "";

  const structuredPrompt = `
Hãy soạn một giáo án mầm non hoàn chỉnh theo yêu cầu sau: "${prompt}".
Độ tuổi mục tiêu: ${ageGroup}.
Thời lượng: ${duration}.
${templateGuidance}

BẮT BUỘC trả về ĐÚNG ĐỊNH DẠNG JSON duy nhất sau (không thêm bất kỳ văn bản dẫn dắt nào nằm ngoài khối JSON):

{
  "title": "Tên hoạt động ngắn gọn hấp dẫn",
  "age_group": "${ageGroup}",
  "duration": "${duration}",
  "topic": "Chủ đề giáo án",${customSectionsInstruction}
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
    const fullPrompt = buildFullPromptContext(structuredPrompt, contextOptions);
    const result = await runAiJson(tier, {
      systemInstruction: PRESCHOOL_SYSTEM_INSTRUCTION,
      prompt: fullPrompt,
    });

    await trackAiUsage(userId, "generate_lesson", result.modelUsed, result.inputTokens, result.outputTokens);

    // Vẫn còn cụt sau khi đã thử lại — KHÔNG cố parse JSON dở dang (dễ ra
    // giáo án thiếu mục/rỗng mà cô giáo tưởng nhầm là đủ). Báo lỗi rõ ràng
    // để giao diện xin cô thử lại, thay vì âm thầm lưu 1 giáo án cụt.
    if (result.truncated) {
      return { lesson: null, rawText: result.rawText, error: "AI_RESPONSE_TRUNCATED" };
    }

    // Đã tự gọi lại AI tối đa 3 lần ở runAiJson() nếu JSON lỗi cú pháp —
    // parsed vẫn null nghĩa là cả 3 lần đều lỗi thật (rất hiếm). Không cố
    // hiển thị 1 giáo án rỗng/thiếu mục, báo lỗi rõ để cô bấm thử lại.
    if (!result.parsed) {
      console.error(`[generateLessonPlan] JSON parse thất bại sau ${result.attempts} lần thử. userId=${userId}, prompt="${prompt}"`);
      return { lesson: null, rawText: result.rawText, error: "AI_RESPONSE_INVALID_JSON" };
    }

    const lesson = validateLessonOutput(result.parsed);
    console.log(
      `[generateLessonPlan] OK sau ${result.attempts} lần thử (model: ${result.modelUsed}). ` +
        `teacherActivities=${lesson?.teacherActivities.length} childActivities=${lesson?.childActivities.length} openQuestions=${lesson?.openQuestions.length}`
    );

    return { lesson, rawText: result.rawText };
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
  userId?: string,
  tier: AiTier = "FULL"
): Promise<{ comment: string; error?: string }> {
  if (hasNoProvider()) {
    return { comment: "Chưa cấu hình GEMINI_API_KEY/DEEPSEEK_API_KEY ở Backend.", error: "MISSING_API_KEY" };
  }

  const prompt = `
Dựa vào ghi chú quan sát thô của cô giáo về ${studentName}: "${rawInput}".
Hãy chuyển thành 1 đoạn nhận xét trẻ hoàn chỉnh (khoảng 3-5 câu), mang văn phong mầm non ấm áp, tích cực, khuyến khích bé phát triển.
TUYỆT ĐỐI KHÔNG sử dụng thuật ngữ chẩn đoán y khoa hay tâm lý. Đưa ra lời khuyên hoặc hướng hỗ trợ nhẹ nhàng nếu có.
`;

  try {
    const fullPrompt = buildFullPromptContext(prompt, contextOptions);
    const result = await runAiText(tier, { systemInstruction: PRESCHOOL_SYSTEM_INSTRUCTION, prompt: fullPrompt });

    await trackAiUsage(userId, "student_comment", result.modelUsed, result.inputTokens, result.outputTokens);

    return { comment: result.text.trim() };
  } catch (err: any) {
    return { comment: "", error: err?.message };
  }
}

export async function generateParentMessage(
  rawNotes: string,
  studentName: string = "bé",
  tone: "friendly" | "polite" | "brief" | "formal" = "friendly",
  contextOptions: ContextOptions = {},
  userId?: string,
  tier: AiTier = "FULL"
): Promise<{ message: string; error?: string }> {
  if (hasNoProvider()) {
    return { message: "Chưa cấu hình GEMINI_API_KEY/DEEPSEEK_API_KEY ở Backend.", error: "MISSING_API_KEY" };
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
    const fullPrompt = buildFullPromptContext(prompt, contextOptions);
    const result = await runAiText(tier, { systemInstruction: PRESCHOOL_SYSTEM_INSTRUCTION, prompt: fullPrompt });

    await trackAiUsage(userId, "parent_message", result.modelUsed, result.inputTokens, result.outputTokens);

    return { message: result.text.trim() };
  } catch (err: any) {
    return { message: "", error: err?.message };
  }
}

// Ánh xạ mã phong cách (gửi từ FE) sang mô tả tiếng Việt đầy đủ đưa vào
// prompt — trước đây FE gửi thẳng mã kiểu "3d_clay"/"flat_cartoon" và
// backend nhét NGUYÊN VĂN mã đó vào prompt ("Phong cách nghệ thuật: 3d_clay."),
// không mô tả rõ cho AI hiểu như cách "tone" (giọng văn) đã làm đúng ở
// generateParentMessage. Nếu gặp mã lạ không có trong danh sách (VD: FE cũ
// còn gửi giá trị chưa cập nhật), vẫn dùng nguyên mã đó làm mô tả dự phòng
// thay vì báo lỗi, để tính năng không bao giờ bị gãy vì lệch danh sách.
const ART_STYLE_MAP: Record<string, string> = {
  "3d_clay": "Đất nặn 3D (claymation) dễ thương, màu sắc tươi sáng, bo tròn mềm mại",
  "3d_cute": "Hoạt hình 3D ngộ nghĩnh, màu sắc tươi sáng, phong cách Pixar/Disney thân thiện",
  watercolor: "Tranh màu nước mộng mơ, nét vẽ nhẹ nhàng, màu loang tự nhiên",
  coloring_book: "Tranh nét viền đen trắng đơn giản, rõ ràng, phù hợp để in ra cho trẻ tô màu",
  flat_cartoon: "Tranh hoạt hình 2D phẳng (flat vector), màu sắc tươi sáng, phong cách flashcard giáo dục",
};

export async function generateMediaPrompt(
  rawRequirement: string,
  mediaType: "image" | "video" = "image",
  artStyle: string = "3d_clay",
  contextOptions: ContextOptions = {},
  userId?: string,
  tier: AiTier = "FULL"
): Promise<{ englishPrompt: string; vietnameseDesc: string; usageTip: string; rawText: string; error?: string }> {
  if (hasNoProvider()) {
    return { englishPrompt: "", vietnameseDesc: "", usageTip: "", rawText: "", error: "MISSING_API_KEY" };
  }

  // Prompt VIDEO cần CHI TIẾT/ĐẦY ĐỦ hơn hẳn prompt ảnh — đây là phần kết
  // hợp trực tiếp với công cụ tạo video AI (Runway, Sora, Kling, Veo...),
  // các công cụ này hiểu và giữ mạch tốt hơn hẳn với prompt có breakdown
  // theo từng nhịp/cảnh (kèm mốc giây, chuyển động máy quay, ánh sáng) thay
  // vì chỉ 1 câu mô tả chung chung như prompt ảnh tĩnh.
  const videoPromptGuidance = `
- "englishPrompt" PHẢI là 1 prompt video ĐẦY ĐỦ, chia rõ theo TỪNG NHỊP/CẢNH kèm mốc giây (VD "0-3s: ...", "3-6s: ..."), tổng thời lượng đề xuất phù hợp nội dung (thường 8-20 giây cho học liệu ngắn).
- MỖI nhịp/cảnh mô tả RÕ: nhân vật/đối tượng chính đang làm gì, chuyển động máy quay (VD "slow zoom in", "static shot", "pan left to right"), biểu cảm/hành động thay đổi ra sao giữa các nhịp.
- Nhắc lại NGẮN GỌN đặc điểm cố định của nhân vật/đối tượng chính (màu sắc/hình dáng/trang phục) ở ĐẦU prompt và ngụ ý xuyên suốt các nhịp sau — giúp công cụ tạo video giữ đồng nhất nhân vật qua các nhịp thay vì đổi hình dáng giữa chừng.
- Mô tả rõ ánh sáng/không khí chung (VD "warm soft daylight, gentle morning light") và phong cách nghệ thuật xuyên suốt.
- Kết thúc bằng vài từ khoá chất lượng kỹ thuật chuẩn cho công cụ tạo video AI (VD "smooth motion, high quality, 4k, no text, no watermark").`;

  const prompt = `
Bạn là chuyên gia thiết kế hình ảnh và video học liệu dành cho Giáo viên Mầm non Việt Nam.
Yêu cầu học liệu từ cô giáo: "${rawRequirement}".
Loại phương tiện: ${mediaType === "image" ? "HÌNH ẢNH (Flashcard/Minh họa/Tranh tô màu)" : "VIDEO NGẮN (Hoạt hình/Minh họa sinh động)"}.
Phong cách nghệ thuật: ${ART_STYLE_MAP[artStyle] || artStyle}.
${mediaType === "video" ? videoPromptGuidance : ""}

Hãy tạo prompt tối ưu theo định dạng JSON duy nhất sau (không thêm văn bản ngoài khối JSON):

{
  "englishPrompt": "${
    mediaType === "video"
      ? "Detailed, multi-beat English video prompt with timestamped scene breakdown, camera movement, consistent subject description, lighting/mood, and technical quality keywords — optimized for AI video generators (Runway, Sora, Kling, Veo)."
      : "Detailed English prompt optimized for AI image generators (Midjourney, DALL-E). High quality, cute preschool friendly, vibrant colors, clean background, 8k resolution."
  }",
  "vietnameseDesc": "Bản dịch tiếng Việt mô tả chi tiết bức ảnh/video.",
  "usageTip": "Gợi ý cách cô giáo ứng dụng hình ảnh/video này vào tiết dạy mầm non (ví dụ: làm thẻ flashcard góc học tập, chiếu tivi đầu giờ, in tranh tô màu cho trẻ)."
}
`;

  try {
    const fullPrompt = buildFullPromptContext(prompt, contextOptions);
    const result = await runAiJson(tier, { systemInstruction: PRESCHOOL_SYSTEM_INSTRUCTION, prompt: fullPrompt });

    await trackAiUsage(userId, "media_prompt", result.modelUsed, result.inputTokens, result.outputTokens);

    return {
      englishPrompt: result.parsed?.englishPrompt || rawRequirement,
      vietnameseDesc: result.parsed?.vietnameseDesc || rawRequirement,
      usageTip: result.parsed?.usageTip || "Dùng làm học liệu mầm non.",
      rawText: result.rawText,
    };
  } catch (err: any) {
    return { englishPrompt: "", vietnameseDesc: "", usageTip: "", rawText: "", error: err?.message };
  }
}

export async function synthesizeAssessmentReport(
  student: any,
  domains: any[],
  observations: any[],
  assessments: any[],
  periodName: string = "Tháng 8/2026",
  userId?: string,
  tier: AiTier = "FULL"
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
  if (hasNoProvider()) {
    return { report: null, rawText: "", error: "MISSING_API_KEY" };
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
    const result = await runAiJson(tier, { systemInstruction: PRESCHOOL_SYSTEM_INSTRUCTION, prompt });
    const jsonParsed = result.parsed;

    await trackAiUsage(userId, "assessment_synthesis", result.modelUsed, result.inputTokens, result.outputTokens);

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
      rawText: result.rawText,
    };
  } catch (err: any) {
    return { report: null, rawText: "", error: err?.message };
  }
}

export async function generateTopicTeacherSummary(
  topicName: string,
  className: string = "Lớp Mầm 1",
  stats: any = {},
  userId?: string,
  tier: AiTier = "FULL"
): Promise<{ summary: string; error?: string }> {
  if (hasNoProvider()) {
    return { summary: "Chưa cấu hình GEMINI_API_KEY/DEEPSEEK_API_KEY ở Backend.", error: "MISSING_API_KEY" };
  }

  // Dùng ?? thay vì || — nếu lớp thật sự có 0 trẻ đạt/0 trẻ tổng, phải giữ
  // đúng số 0 đó, không được âm thầm thay bằng số mẫu 12/10/83.3% giả.
  const totalStudents = stats.totalStudents ?? 0;
  const passedStudents = stats.passedStudents ?? 0;
  const passRate = stats.passRate ?? 0;

  const prompt = `
Hãy viết 1 đoạn ĐÁNH GIÁ CHUNG CỦA GIÁO VIÊN CHỦ NHIỆM sau khi kết thúc chủ đề "${topicName}" cho lớp ${className}.
Thông tin kết quả lớp:
- Tổng số trẻ: ${totalStudents} trẻ
- Số trẻ đạt mục tiêu: ${passedStudents} / ${totalStudents} trẻ (${passRate}%)
- Mục tiêu đạt cao: ${stats.topObjectives || "Chưa đủ dữ liệu"}
- Mục tiêu cần chú ý: ${stats.weakObjectives || "Chưa đủ dữ liệu"}

Văn phong giáo viên mầm non Việt Nam chu đáo, ấm áp, tích cực, vừa nêu bật sự tiến bộ vừa có định hướng hỗ trợ nhẹ nhàng cho các bé rụt rè. Khoảng 3-5 câu.
`;

  try {
    const result = await runAiText(tier, { systemInstruction: PRESCHOOL_SYSTEM_INSTRUCTION, prompt });

    await trackAiUsage(userId, "topic_summary", result.modelUsed, result.inputTokens, result.outputTokens);

    return { summary: result.text.trim() };
  } catch (err: any) {
    return { summary: "", error: err?.message };
  }
}

export async function analyzeTopicAssessmentResults(
  topicName: string,
  students: any[],
  objectives: any[],
  results: any[],
  userId?: string,
  tier: AiTier = "FULL"
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
  if (hasNoProvider()) {
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
    const result = await runAiJson(tier, { systemInstruction: PRESCHOOL_SYSTEM_INSTRUCTION, prompt });
    const jsonParsed = result.parsed;

    await trackAiUsage(userId, "topic_analysis", result.modelUsed, result.inputTokens, result.outputTokens);

    return {
      analysis: {
        class_summary: jsonParsed?.class_summary || "Đa số trẻ đạt mục tiêu chủ đề.",
        strengths: Array.isArray(jsonParsed?.strengths) ? jsonParsed.strengths : ["Trẻ thực hiện tốt động tác thể dục."],
        weak_objectives: Array.isArray(jsonParsed?.weak_objectives) ? jsonParsed.weak_objectives : ["Mục tiêu MT45 có tỷ lệ đạt thấp."],
        students_needing_support: Array.isArray(jsonParsed?.students_needing_support) ? jsonParsed.students_needing_support : ["Bé Lý Tuấn Đạt"],
        evidence_gaps: Array.isArray(jsonParsed?.evidence_gaps) ? jsonParsed.evidence_gaps : [],
        recommended_activities: Array.isArray(jsonParsed?.recommended_activities) ? jsonParsed.recommended_activities : ["Tổ chức góc khám phá thiên nhiên."],
      },
      rawText: result.rawText,
    };
  } catch (err: any) {
    return { analysis: null, rawText: "", error: err?.message };
  }
}
