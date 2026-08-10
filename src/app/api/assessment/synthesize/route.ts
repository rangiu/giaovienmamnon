import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { synthesizeAssessmentReport } from "@/lib/ai/aiEngine";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { studentId } = body;

    if (!studentId) {
      return NextResponse.json(
        { success: false, error: "Vui lòng chọn học sinh" },
        { status: 400 }
      );
    }

    const student = await prisma.student.findUnique({
      where: { id: studentId },
      include: {
        observations: { include: { domain: true }, orderBy: { date: "desc" } },
        assessments: { include: { domain: true } },
      },
    });

    if (!student) {
      return NextResponse.json(
        { success: false, error: "Không tìm thấy học sinh" },
        { status: 404 }
      );
    }

    const domains = await prisma.developmentDomain.findMany({
      orderBy: { orderIndex: "asc" },
    });

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

    const teacher = await prisma.teacher.findFirst();

    // Call AI Engine synthesize
    const aiResult = await synthesizeAssessmentReport(
      student,
      domains,
      student.observations,
      student.assessments,
      currentPeriod.name,
      teacher?.userId
    );

    if (!aiResult.report) {
      return NextResponse.json(
        { success: false, error: aiResult.error || "Không thể tổng hợp báo cáo AI" },
        { status: 500 }
      );
    }

    // Save as DRAFT report in Database
    const report = await prisma.assessmentReport.create({
      data: {
        studentId: student.id,
        periodId: currentPeriod.id,
        type: "MONTHLY",
        overview: aiResult.report.overview,
        strengths: aiResult.report.strengths,
        progress: aiResult.report.progress,
        areasToSupport: aiResult.report.areasToSupport,
        suggestedActivities: aiResult.report.suggestedActivities,
        evidenceObsIds: JSON.stringify(aiResult.report.evidenceObsIds || []),
        status: "DRAFT",
        createdBy: "Cô Lan",
      },
    });

    return NextResponse.json({
      success: true,
      report,
      missingDomainsSuggestions: aiResult.report.missingDomainsSuggestions,
    });
  } catch (error: any) {
    console.error("Synthesize error:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
