import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireActiveUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const ctx = await requireActiveUser();
  if (ctx instanceof NextResponse) return ctx;
  const { teacher, user } = ctx;

  try {
    const body = await request.json();
    const { studentId, domainId, level, notes } = body;

    if (!studentId || !domainId || !level) {
      return NextResponse.json({ success: false, error: "Thiếu thông tin đánh giá" }, { status: 400 });
    }

    // Chỉ cho phép đánh giá học sinh thuộc lớp của chính giáo viên đang đăng nhập.
    const student = await prisma.student.findFirst({
      where: { id: studentId, class: { teacherId: teacher.id } },
    });
    if (!student) {
      return NextResponse.json({ success: false, error: "Không tìm thấy học sinh trong lớp của bạn." }, { status: 404 });
    }

    let currentPeriod = await prisma.assessmentPeriod.findFirst({ where: { isCurrent: true } });
    if (!currentPeriod) {
      currentPeriod = await prisma.assessmentPeriod.create({
        data: {
          name: "Tháng 8/2026",
          startDate: new Date("2026-08-01"),
          endDate: new Date("2026-08-31"),
          isCurrent: true,
        },
      });
    }

    const assessment = await prisma.studentAssessment.upsert({
      where: {
        studentId_domainId_periodId: { studentId, domainId, periodId: currentPeriod.id },
      },
      update: { level, notes: notes || "", createdBy: user.name, updatedAt: new Date() },
      create: { studentId, domainId, periodId: currentPeriod.id, level, notes: notes || "", createdBy: user.name },
    });

    return NextResponse.json({ success: true, assessment });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
