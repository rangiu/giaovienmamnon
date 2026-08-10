import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const student = await prisma.student.findUnique({
      where: { id: params.id },
      include: {
        class: true,
        observations: {
          include: { domain: true },
          orderBy: { date: "desc" },
        },
        assessments: {
          include: { domain: true, period: true },
        },
        reports: {
          include: { period: true },
          orderBy: { createdAt: "desc" },
        },
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

    const currentPeriod = await prisma.assessmentPeriod.findFirst({
      where: { isCurrent: true },
    });

    // Detect missing observation evidence per domain
    const missingDomainSuggestions: { domainId: string; domainName: string; count: number; suggestions: string[] }[] = [];

    const domainProfile = domains.map((domain) => {
      const currentObs = student.observations.filter(
        (o) => o.domainId === domain.id || o.category === domain.name
      );

      const assessment = student.assessments.find(
        (a) => a.domainId === domain.id && (currentPeriod ? a.periodId === currentPeriod.id : true)
      );

      // Check if missing evidence (< 2 observations)
      if (currentObs.length < 2) {
        let sampleSuggestions: string[] = [];
        if (domain.code === "SELF_HELP") {
          sampleSuggestions = ["Tự cất đồ dùng cá nhân", "Tự rửa tay trước khi ăn", "Tự xúc ăn ngoan", "Tự mặc/cởi dép"];
        } else if (domain.code === "SOC_EMO") {
          sampleSuggestions = ["Chủ động chơi cùng các bạn", "Biết chia sẻ đồ chơi", "Biết chào hỏi người lớn"];
        } else if (domain.code === "PHYS") {
          sampleSuggestions = ["Bật nhảy qua vạch", "Rèn kỹ năng cầm thìa/bút", "Tham gia trò chơi vận động"];
        } else if (domain.code === "LANG") {
          sampleSuggestions = ["Phát biểu cảm nghĩ", "Trả lời câu hỏi mở của cô", "Kể lại nội dung truyện ngắn"];
        } else if (domain.code === "COG") {
          sampleSuggestions = ["Phân loại hình dáng/màu sắc", "Đếm số lượng trong phạm vi 5", "Nhận biết thời tiết"];
        } else {
          sampleSuggestions = ["Tô màu không chờm ra ngoài", "Hát và nhún nhảy theo nhạc", "Nặn đất tạo hình"];
        }

        missingDomainSuggestions.push({
          domainId: domain.id,
          domainName: domain.name,
          count: currentObs.length,
          suggestions: sampleSuggestions,
        });
      }

      return {
        domainId: domain.id,
        code: domain.code,
        name: domain.name,
        color: domain.color,
        icon: domain.icon,
        level: assessment?.level || (currentObs.length > 0 ? "DANG_PHAT_TRIEN" : "CHUA_DU_MINH_CHUNG"),
        notes: assessment?.notes || "",
        observationCount: currentObs.length,
      };
    });

    return NextResponse.json({
      success: true,
      student: {
        id: student.id,
        name: student.name,
        gender: student.gender,
        dateOfBirth: student.dateOfBirth,
        notes: student.notes,
        className: student.class.name,
        ageGroup: student.class.ageGroup,
      },
      currentPeriodName: currentPeriod?.name || "Tháng 8/2026",
      domainProfile,
      observations: student.observations,
      reports: student.reports,
      missingDomainSuggestions,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
