import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { analyzeTopicAssessmentResults } from "@/lib/ai/aiEngine";

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const topic = await prisma.topic.findUnique({
      where: { id: params.id },
      include: {
        class: { include: { students: true } },
        topicObjectives: { include: { objective: true } },
        topicResults: { include: { student: true, objective: true } },
      },
    });

    if (!topic) {
      return NextResponse.json(
        { success: false, error: "Không tìm thấy chủ đề" },
        { status: 404 }
      );
    }

    const teacher = await prisma.teacher.findFirst();

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
      teacher?.userId
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

    return NextResponse.json({
      success: true,
      analysis: result.analysis,
      error: result.error,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
