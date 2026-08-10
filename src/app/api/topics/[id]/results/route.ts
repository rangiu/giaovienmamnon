import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const { studentId, objectiveId, rating } = body;

    if (!studentId || !objectiveId || !rating) {
      return NextResponse.json(
        { success: false, error: "Thiếu thông tin đánh giá" },
        { status: 400 }
      );
    }

    const updated = await prisma.studentTopicResult.upsert({
      where: {
        topicId_studentId_objectiveId: {
          topicId: params.id,
          studentId,
          objectiveId,
        },
      },
      update: {
        rating,
        updatedAt: new Date(),
      },
      create: {
        topicId: params.id,
        studentId,
        objectiveId,
        rating,
      },
    });

    return NextResponse.json({ success: true, result: updated });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
