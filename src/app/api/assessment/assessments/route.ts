import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { studentId, domainId, level, notes } = body;

    if (!studentId || !domainId || !level) {
      return NextResponse.json(
        { success: false, error: "Thiếu thông tin đánh giá" },
        { status: 400 }
      );
    }

    let currentPeriod = await prisma.assessmentPeriod.findFirst({
      where: { isCurrent: true },
    });

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
        studentId_domainId_periodId: {
          studentId,
          domainId,
          periodId: currentPeriod.id,
        },
      },
      update: {
        level,
        notes: notes || "",
        updatedAt: new Date(),
      },
      create: {
        studentId,
        domainId,
        periodId: currentPeriod.id,
        level,
        notes: notes || "",
        createdBy: "Cô Lan",
      },
    });

    return NextResponse.json({ success: true, assessment });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
