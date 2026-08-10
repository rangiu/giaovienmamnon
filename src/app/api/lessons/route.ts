import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search") || "";
    const ageGroup = searchParams.get("ageGroup") || "";

    const teacher = await prisma.teacher.findFirst();
    if (!teacher) {
      return NextResponse.json({ success: true, lessons: [] });
    }

    const whereClause: any = {
      teacherId: teacher.id,
    };

    if (search) {
      whereClause.OR = [
        { title: { contains: search } },
        { topic: { contains: search } },
      ];
    }

    if (ageGroup) {
      whereClause.ageGroup = ageGroup;
    }

    const lessons = await prisma.lesson.findMany({
      where: whereClause,
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ success: true, lessons });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
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

    const teacher = await prisma.teacher.findFirst();
    if (!teacher) {
      return NextResponse.json(
        { success: false, error: "Không tìm thấy thông tin giáo viên." },
        { status: 404 }
      );
    }

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
    console.error("Save lesson error:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
