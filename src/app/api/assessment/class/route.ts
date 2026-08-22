import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireActiveUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET() {
  const ctx = await requireActiveUser();
  if (ctx instanceof NextResponse) return ctx;
  const { currentClass } = ctx;

  try {
    const classWithData = await prisma.class.findUnique({
      where: { id: currentClass.id },
      include: {
        students: {
          include: {
            assessments: { include: { domain: true } },
            observations: true,
          },
        },
      },
    });

    if (!classWithData) {
      return NextResponse.json({ success: true, summary: null });
    }

    const domains = await prisma.developmentDomain.findMany({ orderBy: { orderIndex: "asc" } });
    const currentPeriod = await prisma.assessmentPeriod.findFirst({ where: { isCurrent: true } });

    const domainStats = domains.map((domain) => {
      let countTot = 0;
      let countDat = 0;
      let countDangPhatTrien = 0;
      let countChuaDuMinhChung = 0;

      const studentsInDomain = classWithData.students.map((st) => {
        const assessment = st.assessments.find(
          (a) => a.domainId === domain.id && (currentPeriod ? a.periodId === currentPeriod.id : true)
        );
        const level = assessment?.level || "CHUA_DU_MINH_CHUNG";

        if (level === "TOT") countTot++;
        else if (level === "DAT") countDat++;
        else if (level === "DANG_PHAT_TRIEN") countDangPhatTrien++;
        else countChuaDuMinhChung++;

        return { id: st.id, name: st.name, gender: st.gender, level };
      });

      return {
        domainId: domain.id,
        code: domain.code,
        name: domain.name,
        color: domain.color,
        icon: domain.icon,
        counts: { tot: countTot, dat: countDat, dangPhatTrien: countDangPhatTrien, chuaDuMinhChung: countChuaDuMinhChung },
        students: studentsInDomain,
      };
    });

    return NextResponse.json({
      success: true,
      classInfo: {
        id: classWithData.id,
        name: classWithData.name,
        ageGroup: classWithData.ageGroup,
        studentCount: classWithData.students.length,
        periodName: currentPeriod?.name || "Chưa có kỳ đánh giá",
      },
      domainStats,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
