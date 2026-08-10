import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { generateStudentComment } from "@/lib/ai/aiEngine";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { input, studentName, studentId } = body;

    if (!input || typeof input !== "string" || input.trim() === "") {
      return NextResponse.json(
        { success: false, error: "Cô vui lòng nhập nội dung ghi chú quan sát trẻ nhé!" },
        { status: 400 }
      );
    }

    const teacher = await prisma.teacher.findFirst();

    let studentWithObs = null;
    if (studentId) {
      studentWithObs = await prisma.student.findUnique({
        where: { id: studentId },
        include: { observations: { orderBy: { date: "desc" }, take: 5 } },
      });
    }

    const result = await generateStudentComment(
      input,
      studentName || "bé",
      { teacher, student: studentWithObs },
      teacher?.userId
    );

    return NextResponse.json({
      success: true,
      comment: result.comment,
      error: result.error,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
