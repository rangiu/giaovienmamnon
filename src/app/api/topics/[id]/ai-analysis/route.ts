import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireActiveUser } from "@/lib/auth";
import { analyzeTopicAssessmentResults } from "@/lib/ai/aiEngine";

export const dynamic = "force-dynamic";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await requireActiveUser();
  if (ctx instanceof NextResponse) return ctx;
  const { user, teacher } = ctx;
  const { id } = await params;

  try {
    // Chỉ phân tích chủ đề thuộc lớp của giáo viên đang đăng nhập.
    const topic = await prisma.topic.findFirst({
      where: { id, class: { teacherId: teacher.id } },
      include: {
        class: { include: { students: true } },
        topicObjectives: { include: { objective: true } },
        topicResults: { include: { student: true, objective: true } },
      },
    });

    if (!topic) {
      return NextResponse.json({ success: false, error: "Không tìm thấy chủ đề" }, { status: 404 });
    }

    const formattedResults = topic.topicResults.map((r) => ({
      studentName: r.student.name,
      objectiveCode: r.objective.code,
      rating: r.rating,
    }));

    const result = await analyzeTopicAssessmentResults(
      topic.name,
      topic.class.students,
      topic.topicObjectives.map((o) => o.objective),
      formattedResults,
      user.id
    );

    if (result.analysis) {
      await prisma.topicReport.create({
        data: {
          topicId: topic.id,
          classSummary: result.analysis.class_summary,
          strengthsSummary: result.analysis.strengths.join("\n• "),
          weakObjectivesSummary: result.analysis.weak_objectives.join("\n• "),
          studentsNeedingSupport: result.analysis.students_needing_support.join("\n• "),
          recommendedActivities: result.analysis.recommended_activities.join("\n• "),
          evidenceGaps: result.analysis.evidence_gaps.join("\n• "),
          rawJson: JSON.stringify(result.analysis),
        },
      });
    }

    return NextResponse.json({ success: true, analysis: result.analysis, error: result.error });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
