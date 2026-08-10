import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const teacher = await prisma.teacher.findFirst();
    if (!teacher) {
      return NextResponse.json({ success: true, summary: null });
    }

    const currentClass = await prisma.class.findFirst({
      where: { teacherId: teacher.id },
      include: {
        students: {
          include: {
            assessments: {
              include: { domain: true },
            },
            observations: true,
          },
        },
      },
    });

    if (!currentClass) {
      return NextResponse.json({ success: true, summary: null });
    }

    const domains = await prisma.developmentDomain.findMany({
      orderBy: { orderIndex: "asc" },
    });

    const currentPeriod = await prisma.assessmentPeriod.findFirst({
      where: { isCurrent: true },
    });

    // Calculate domain statistics for the class
    const domainStats = domains.map((domain) => {
      let countTot = 0;
      let countDat = 0;
      let countDangPhatTrien = 0;
      let countChuaDuMinhChung = 0;

      const studentsInDomain = currentClass.students.map((st) => {
        const assessment = st.assessments.find(
          (a) => a.domainId === domain.id && (currentPeriod ? a.periodId === currentPeriod.id : true)
        );
        const level = assessment?.level || "CHUA_DU_MINH_CHUNG";

        if (level === "TOT") countTot++;
        else if (level === "DAT") countDat++;
        else if (level === "DANG_PHAT_TRIEN") countDangPhatTrien++;
        else countChuaDuMinhChung++;

        return {
          id: st.id,
          name: st.name,
          gender: st.gender,
          level,
        };
      });

      return {
        domainId: domain.id,
        code: domain.code,
        name: domain.name,
        color: domain.color,
        icon: domain.icon,
        counts: {
          tot: countTot,
          dat: countDat,
          dangPhatTrien: countDangPhatTrien,
          chuaDuMinhChung: countChuaDuMinhChung,
        },
        students: studentsInDomain,
      };
    });

    return NextResponse.json({
      success: true,
      classInfo: {
        id: currentClass.id,
        name: currentClass.name,
        ageGroup: currentClass.ageGroup,
        studentCount: currentClass.students.length,
        periodName: currentPeriod?.name || "Tháng 8/2026",
      },
      domainStats,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
