import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const report = await prisma.assessmentReport.findUnique({
      where: { id: params.id },
      include: {
        student: { include: { class: true } },
        period: true,
      },
    });

    if (!report) {
      return NextResponse.json(
        { success: false, error: "Không tìm thấy báo cáo" },
        { status: 404 }
      );
    }

    // Fetch linked evidence observations
    let evidenceObsIds: string[] = [];
    if (report.evidenceObsIds) {
      try {
        evidenceObsIds = JSON.parse(report.evidenceObsIds);
      } catch {
        evidenceObsIds = [];
      }
    }

    const observations = await prisma.observation.findMany({
      where: {
        studentId: report.studentId,
      },
      include: { domain: true },
      orderBy: { date: "desc" },
    });

    return NextResponse.json({
      success: true,
      report,
      observations,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const {
      overview,
      strengths,
      progress,
      areasToSupport,
      suggestedActivities,
      status,
    } = body;

    const updateData: any = {};
    if (overview !== undefined) updateData.overview = overview;
    if (strengths !== undefined) updateData.strengths = strengths;
    if (progress !== undefined) updateData.progress = progress;
    if (areasToSupport !== undefined) updateData.areasToSupport = areasToSupport;
    if (suggestedActivities !== undefined) updateData.suggestedActivities = suggestedActivities;

    if (status) {
      updateData.status = status;
      if (status === "TEACHER_CONFIRMED") {
        updateData.confirmedAt = new Date();
      }
    }

    const updated = await prisma.assessmentReport.update({
      where: { id: params.id },
      data: updateData,
    });

    return NextResponse.json({ success: true, report: updated });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
