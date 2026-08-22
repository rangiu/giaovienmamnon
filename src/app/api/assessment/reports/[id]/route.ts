import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireActiveUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await requireActiveUser();
  if (ctx instanceof NextResponse) return ctx;
  const { teacher } = ctx;
  const { id } = await params;

  try {
    // Chỉ trả về báo cáo của học sinh thuộc lớp giáo viên đang đăng nhập.
    const report = await prisma.assessmentReport.findFirst({
      where: { id, student: { class: { teacherId: teacher.id } } },
      include: { student: { include: { class: true } }, period: true },
    });

    if (!report) {
      return NextResponse.json({ success: false, error: "Không tìm thấy báo cáo" }, { status: 404 });
    }

    let evidenceObsIds: string[] = [];
    if (report.evidenceObsIds) {
      try {
        evidenceObsIds = JSON.parse(report.evidenceObsIds);
      } catch {
        evidenceObsIds = [];
      }
    }

    const observations = await prisma.observation.findMany({
      where: { studentId: report.studentId },
      include: { domain: true },
      orderBy: { date: "desc" },
    });

    return NextResponse.json({ success: true, report, observations });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await requireActiveUser();
  if (ctx instanceof NextResponse) return ctx;
  const { teacher } = ctx;
  const { id } = await params;

  try {
    const existing = await prisma.assessmentReport.findFirst({
      where: { id, student: { class: { teacherId: teacher.id } } },
    });
    if (!existing) {
      return NextResponse.json({ success: false, error: "Không tìm thấy báo cáo" }, { status: 404 });
    }

    const body = await request.json();
    const { overview, strengths, progress, areasToSupport, suggestedActivities, status } = body;

    const updateData: any = {};
    if (overview !== undefined) updateData.overview = overview;
    if (strengths !== undefined) updateData.strengths = strengths;
    if (progress !== undefined) updateData.progress = progress;
    if (areasToSupport !== undefined) updateData.areasToSupport = areasToSupport;
    if (suggestedActivities !== undefined) updateData.suggestedActivities = suggestedActivities;
    if (status) {
      updateData.status = status;
      if (status === "TEACHER_CONFIRMED") updateData.confirmedAt = new Date();
    }

    const updated = await prisma.assessmentReport.update({ where: { id }, data: updateData });
    return NextResponse.json({ success: true, report: updated });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
