import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { generateTopicTeacherSummary } from "@/lib/ai/aiEngine";

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const topic = await prisma.topic.findUnique({
      where: { id: params.id },
      include: {
        class: true,
        topicResults: true,
      },
    });

    if (!topic) {
      return NextResponse.json(
        { success: false, error: "Không tìm thấy chủ đề" },
        { status: 404 }
      );
    }

    const teacher = await prisma.teacher.findFirst();

    // Call AI Engine summary
    const result = await generateTopicTeacherSummary(
      topic.name,
      topic.class.name,
      {
        totalStudents: 12,
        passedStudents: 10,
        passRate: 83.3,
      },
      teacher?.userId
    );

    if (result.summary) {
      await prisma.topic.update({
        where: { id: topic.id },
        data: { teacherNotes: result.summary },
      });
    }

    return NextResponse.json({
      success: true,
      summary: result.summary,
      error: result.error,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
