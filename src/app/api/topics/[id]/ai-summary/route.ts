import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireActiveUser } from "@/lib/auth";
import { generateTopicTeacherSummary } from "@/lib/ai/aiEngine";

export const dynamic = "force-dynamic";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await requireActiveUser();
  if (ctx instanceof NextResponse) return ctx;
  const { user, teacher } = ctx;
  const { id } = await params;

  try {
    const topic = await prisma.topic.findFirst({
      where: { id, class: { teacherId: teacher.id } },
      include: {
        class: { include: { students: true } },
        topicObjectives: true,
        topicResults: true,
      },
    });

    if (!topic) {
      return NextResponse.json({ success: false, error: "Không tìm thấy chủ đề" }, { status: 404 });
    }

    // Tính số liệu THẬT từ dữ liệu, không dùng số giả cố định nữa.
    const totalStudents = topic.class.students.length;
    const objectiveCount = topic.topicObjectives.length || 1;
    const passedByStudent = new Map<string, number>();
    for (const r of topic.topicResults) {
      if (r.rating === "+") {
        passedByStudent.set(r.studentId, (passedByStudent.get(r.studentId) || 0) + 1);
      }
    }
    const passedStudents = topic.class.students.filter(
      (st) => ((passedByStudent.get(st.id) || 0) / objectiveCount) * 100 >= 80
    ).length;
    const passRate = totalStudents > 0 ? Number(((passedStudents / totalStudents) * 100).toFixed(1)) : 0;

    const result = await generateTopicTeacherSummary(
      topic.name,
      topic.class.name,
      { totalStudents, passedStudents, passRate },
      user.id
    );

    if (result.summary) {
      await prisma.topic.update({ where: { id: topic.id }, data: { teacherNotes: result.summary } });
    }

    return NextResponse.json({ success: true, summary: result.summary, error: result.error });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
