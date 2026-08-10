import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { generateLessonPlan } from "@/lib/ai/aiEngine";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { prompt, ageGroup = "4–5 tuổi", duration = "30 phút" } = body;

    if (!prompt || typeof prompt !== "string" || prompt.trim() === "") {
      return NextResponse.json(
        { success: false, error: "Cô vui lòng nhập tên chủ đề hoặc hoạt động cần soạn nhé!" },
        { status: 400 }
      );
    }

    const teacher = await prisma.teacher.findFirst();

    const result = await generateLessonPlan(
      prompt,
      ageGroup,
      duration,
      { teacher },
      teacher?.userId
    );

    if (!result.lesson && result.error === "MISSING_API_KEY") {
      return NextResponse.json({
        success: false,
        error: "MISSING_API_KEY",
        message: "Chưa cấu hình GEMINI_API_KEY trong file .env Backend.",
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
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
