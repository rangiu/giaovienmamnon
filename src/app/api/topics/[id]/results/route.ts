import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireActiveUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await requireActiveUser();
  if (ctx instanceof NextResponse) return ctx;
  const { teacher } = ctx;
  const { id } = await params;

  try {
    // Chỉ cho phép ghi kết quả cho chủ đề thuộc lớp giáo viên đang đăng nhập.
    const topic = await prisma.topic.findFirst({ where: { id, class: { teacherId: teacher.id } } });
    if (!topic) {
      return NextResponse.json({ success: false, error: "Không tìm thấy chủ đề" }, { status: 404 });
    }

    const body = await request.json();
    const { studentId, objectiveId, rating } = body;

    if (!studentId || !objectiveId || !rating) {
      return NextResponse.json({ success: false, error: "Thiếu thông tin đánh giá" }, { status: 400 });
    }

    // Xác nhận học sinh cũng thuộc đúng lớp này.
    const student = await prisma.student.findFirst({ where: { id: studentId, classId: topic.classId } });
    if (!student) {
      return NextResponse.json({ success: false, error: "Học sinh không thuộc lớp của chủ đề này." }, { status: 400 });
    }

    const updated = await prisma.studentTopicResult.upsert({
      where: { topicId_studentId_objectiveId: { topicId: id, studentId, objectiveId } },
      update: { rating, updatedAt: new Date() },
      create: { topicId: id, studentId, objectiveId, rating },
    });

    return NextResponse.json({ success: true, result: updated });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
