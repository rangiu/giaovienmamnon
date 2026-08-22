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
    // Chỉ trả về chủ đề thuộc lớp giáo viên đang đăng nhập.
    const topic = await prisma.topic.findFirst({
      where: { id, class: { teacherId: teacher.id } },
      include: {
        class: {
          include: {
            students: {
              include: { observations: { include: { domain: true }, orderBy: { date: "desc" } } },
              orderBy: { name: "asc" },
            },
          },
        },
        topicObjectives: { include: { objective: true }, orderBy: { orderIndex: "asc" } },
        topicResults: { include: { objective: true, student: true } },
        topicReports: { orderBy: { createdAt: "desc" } },
      },
    });

    if (!topic) {
      return NextResponse.json({ success: false, error: "Không tìm thấy chủ đề." }, { status: 404 });
    }

    const rule = (await prisma.assessmentRule.findFirst()) || { minimumPercentage: 80.0 };
    const minPercent = rule.minimumPercentage;

    const students = topic.class.students;
    const objectives = topic.topicObjectives.map((to) => to.objective);
    const resultsMap = new Map<string, string>();
    for (const r of topic.topicResults) {
      resultsMap.set(`${r.studentId}_${r.objectiveId}`, r.rating);
    }

    let passedStudentsCount = 0;
    let failedStudentsCount = 0;
    let totalAchievedGoalRatings = 0;
    let totalGoalRatings = 0;

    const studentRows = students.map((st, idx) => {
      let studentAchievedCount = 0;
      const ratings: { objectiveId: string; code: string; rating: string }[] = [];

      for (const obj of objectives) {
        // Chưa chấm thì coi là "chưa đủ minh chứng" (o) — KHÔNG mặc định "+" (đạt) như trước,
        // vì mặc định "đạt sẵn" cho cả những mục chưa hề chấm là số liệu bịa, gây hiểu nhầm.
        const rating = resultsMap.get(`${st.id}_${obj.id}`) || "o";
        ratings.push({ objectiveId: obj.id, code: obj.code, rating });

        if (rating === "+") {
          studentAchievedCount++;
          totalAchievedGoalRatings++;
        }
        totalGoalRatings++;
      }

      const passPercentage = objectives.length > 0 ? (studentAchievedCount / objectives.length) * 100 : 0;
      const isPassed = passPercentage >= minPercent;

      if (isPassed) passedStudentsCount++;
      else failedStudentsCount++;

      return {
        stt: idx + 1,
        studentId: st.id,
        name: st.name,
        gender: st.gender,
        ratings,
        achievedCount: studentAchievedCount,
        totalObjectives: objectives.length,
        passPercentage: Number(passPercentage.toFixed(1)),
        classification: isPassed ? "ĐẠT" : "CHƯA ĐẠT",
        notes: st.notes,
        observations: st.observations,
      };
    });

    const objectiveStats = objectives.map((obj) => {
      let passedCount = 0;
      let failedCount = 0;
      let pendingCount = 0;

      for (const st of students) {
        const rating = resultsMap.get(`${st.id}_${obj.id}`) || "o";
        if (rating === "+") passedCount++;
        else if (rating === "-") failedCount++;
        else pendingCount++;
      }

      const totalSt = students.length;
      const passRate = totalSt > 0 ? (passedCount / totalSt) * 100 : 0;

      return {
        objectiveId: obj.id,
        code: obj.code,
        name: obj.name,
        description: obj.description,
        passedCount,
        failedCount,
        pendingCount,
        totalCount: totalSt,
        passRate: Number(passRate.toFixed(1)),
      };
    });

    const completionRate = students.length > 0 ? (passedStudentsCount / students.length) * 100 : 0;
    const overallObjectivePassRate = totalGoalRatings > 0 ? (totalAchievedGoalRatings / totalGoalRatings) * 100 : 0;

    return NextResponse.json({
      success: true,
      topicInfo: {
        id: topic.id,
        name: topic.name,
        ageGroup: topic.ageGroup,
        className: topic.class.name,
        startDate: topic.startDate,
        endDate: topic.endDate,
        teacherNotes: topic.teacherNotes || "",
      },
      stats: {
        totalStudents: students.length,
        passedStudents: passedStudentsCount,
        failedStudents: failedStudentsCount,
        completionRate: Number(completionRate.toFixed(1)),
        overallObjectivePassRate: Number(overallObjectivePassRate.toFixed(1)),
        totalObjectivesCount: objectives.length,
        minimumPercentageRule: minPercent,
      },
      objectives,
      studentRows,
      objectiveStats,
      reports: topic.topicReports,
    });
  } catch (error: any) {
    console.error("GET /api/topics/[id] DB Error:", error);
    return NextResponse.json({ success: false, error: "Không thể tải chủ đề." }, { status: 500 });
  }
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await requireActiveUser();
  if (ctx instanceof NextResponse) return ctx;
  const { teacher } = ctx;
  const { id } = await params;

  try {
    const existing = await prisma.topic.findFirst({ where: { id, class: { teacherId: teacher.id } } });
    if (!existing) {
      return NextResponse.json({ success: false, error: "Không tìm thấy chủ đề." }, { status: 404 });
    }

    const body = await request.json();
    const { teacherNotes } = body;

    const updated = await prisma.topic.update({ where: { id }, data: { teacherNotes } });
    return NextResponse.json({ success: true, topic: updated });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
