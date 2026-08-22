import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireFullAccess } from "@/lib/auth";
import { generateStudentComment } from "@/lib/ai/aiEngine";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const ctx = await requireFullAccess();
  if (ctx instanceof NextResponse) return ctx;
  const { user, teacher } = ctx;

  try {
    const body = await request.json();
    const { input, studentName, studentId } = body;

    if (!input || typeof input !== "string" || input.trim() === "") {
      return NextResponse.json(
        { success: false, error: "Cô vui lòng nhập nội dung ghi chú quan sát trẻ nhé!" },
        { status: 400 }
      );
    }

    // Chỉ lấy đúng học sinh thuộc lớp của giáo viên đang đăng nhập.
    let studentWithObs = null;
    if (studentId) {
      studentWithObs = await prisma.student.findFirst({
        where: { id: studentId, class: { teacherId: teacher.id } },
        include: { observations: { orderBy: { date: "desc" }, take: 5 } },
      });
    }

    const result = await generateStudentComment(input, studentName || "bé", { teacher, student: studentWithObs }, user.id);

    return NextResponse.json({
      success: true,
      comment: result.comment,
      error: result.error,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
