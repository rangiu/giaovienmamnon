import { NextResponse } from "next/server";
import { requireFullAccess } from "@/lib/auth";
import { generateLessonPlan } from "@/lib/ai/aiEngine";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const ctx = await requireFullAccess();
  if (ctx instanceof NextResponse) return ctx;
  const { user, teacher, access } = ctx;

  try {
    const body = await request.json();
    const { prompt, ageGroup = "4–5 tuổi", duration = "30 phút", templateId } = body;

    if (!prompt || typeof prompt !== "string" || prompt.trim() === "") {
      return NextResponse.json(
        { success: false, error: "Cô vui lòng nhập tên chủ đề hoặc hoạt động cần soạn nhé!" },
        { status: 400 }
      );
    }

    let customStructure: string | null = null;
    if (templateId) {
      const template = await prisma.lessonTemplate.findUnique({ where: { id: templateId } });
      if (template) {
        customStructure = template.structureJson;
        // Tăng lượt sử dụng mẫu
        await prisma.lessonTemplate.update({
          where: { id: templateId },
          data: { useCount: { increment: 1 } },
        }).catch(() => {});
      }
    }

    const aiTier = access.tier === "FULL" ? "FULL" : "LIMITED";
    const result = await generateLessonPlan(
      prompt,
      ageGroup,
      duration,
      { teacher },
      user.id,
      aiTier,
      customStructure
    );

    if (!result.lesson && result.error === "MISSING_API_KEY") {
      return NextResponse.json({
        success: false,
        error: "MISSING_API_KEY",
        message: "Chưa cấu hình GEMINI_API_KEY trong file .env Backend.",
      });
    }

    if (!result.lesson && result.error === "AI_RESPONSE_TRUNCATED") {
      return NextResponse.json({
        success: false,
        error: "AI_RESPONSE_TRUNCATED",
        message: "Nội dung giáo án khá dài nên AI trả lời chưa kịp xong. Cô vui lòng bấm soạn lại giúp em, hoặc rút gọn yêu cầu (ví dụ giảm thời lượng hoạt động) nhé!",
      });
    }

    return NextResponse.json({
      success: true,
      lesson: result.lesson,
      rawText: result.rawText,
      error: result.error,
    });
  } catch (error: any) {
    console.error("Generate lesson error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
