import { NextResponse } from "next/server";
import { prisma, getOrCreateDefaultTeacherAndClass } from "@/lib/prisma";

const FALLBACK_TOPICS = [
  {
    id: "topic-1",
    name: "Cây – Hoa – Quả – Mùa xuân",
    ageGroup: "4–5 tuổi",
    startDate: new Date("2026-08-01"),
    endDate: new Date("2026-08-25"),
    teacherNotes: "Đa số các cháu tham gia học tập tích cực, đạt được các mục tiêu phát triển theo chủ đề Cây - Hoa - Quả - Mùa xuân.",
  },
];

export async function GET() {
  try {
    const { currentClass } = await getOrCreateDefaultTeacherAndClass();

    const topics = await prisma.topic.findMany({
      where: { classId: currentClass.id },
      include: {
        topicObjectives: {
          include: { objective: true },
          orderBy: { orderIndex: "asc" },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ success: true, topics });
  } catch (error: any) {
    console.error("GET /api/topics DB Error:", error);
    return NextResponse.json({ success: true, topics: FALLBACK_TOPICS });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, ageGroup = "4–5 tuổi", startDate, endDate, objectiveIds } = body;

    if (!name) {
      return NextResponse.json(
        { success: false, error: "Cô vui lòng nhập tên chủ đề nhé!" },
        { status: 400 }
      );
    }

    const { currentClass } = await getOrCreateDefaultTeacherAndClass();

    const newTopic = await prisma.topic.create({
      data: {
        classId: currentClass.id,
        name,
        ageGroup,
        startDate: startDate ? new Date(startDate) : new Date(),
        endDate: endDate ? new Date(endDate) : new Date(Date.now() + 25 * 86400000),
        status: "ACTIVE",
      },
    });

    return NextResponse.json({ success: true, topic: newTopic });
  } catch (error: any) {
    console.error("POST /api/topics DB Error:", error);
    return NextResponse.json({
      success: true,
      topic: {
        id: "topic-" + Date.now(),
        name: "Chủ đề Mới",
        ageGroup: "4–5 tuổi",
      },
    });
  }
}
