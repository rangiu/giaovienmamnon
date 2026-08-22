import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireActiveUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const ctx = await requireActiveUser();
  if (ctx instanceof NextResponse) return ctx;
  const { teacher } = ctx;

  try {
    const lessons = await prisma.lesson.findMany({
      where: { teacherId: teacher.id },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ success: true, lessons });
  } catch (error: any) {
    console.error("GET /api/lessons DB Error:", error);
    return NextResponse.json({ success: false, error: "Không thể tải danh sách giáo án." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const ctx = await requireActiveUser();
  if (ctx instanceof NextResponse) return ctx;
  const { teacher } = ctx;

  try {
    const body = await request.json();
    const {
      title,
      ageGroup,
      duration,
      topic,
      objectives,
      preparation,
      teacherActivities,
      childActivities,
      openQuestions,
      reinforcementGame,
      conclusion,
      assessment,
      extension,
      rawJson,
    } = body;

    const newLesson = await prisma.lesson.create({
      data: {
        teacherId: teacher.id,
        title: title || "Giáo án mầm non mới",
        ageGroup: ageGroup || "4–5 tuổi",
        duration: duration || "30 phút",
        topic: topic || "Khám phá",
        objectives: typeof objectives === "string" ? objectives : JSON.stringify(objectives || {}),
        preparation: typeof preparation === "string" ? preparation : JSON.stringify(preparation || {}),
        teacherActivities: typeof teacherActivities === "string" ? teacherActivities : JSON.stringify(teacherActivities || []),
        childActivities: typeof childActivities === "string" ? childActivities : JSON.stringify(childActivities || []),
        openQuestions: typeof openQuestions === "string" ? openQuestions : JSON.stringify(openQuestions || []),
        reinforcementGame: typeof reinforcementGame === "string" ? reinforcementGame : JSON.stringify(reinforcementGame || {}),
        conclusion: conclusion || "",
        assessment: assessment || "",
        extension: extension || "",
        rawJson: typeof rawJson === "string" ? rawJson : JSON.stringify(rawJson || {}),
      },
    });

    return NextResponse.json({ success: true, lesson: newLesson });
  } catch (error: any) {
    console.error("Save lesson DB error:", error);
    return NextResponse.json({ success: false, error: "Không thể lưu giáo án, vui lòng thử lại." }, { status: 500 });
  }
}
