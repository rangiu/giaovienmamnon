import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireActiveUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

/**
 * Dòng thời gian phát triển — ghép từ 2 nguồn dữ liệu THẬT của đúng lớp
 * giáo viên đang đăng nhập (không lấy của tài khoản khác):
 *  1. StudentAssessment: mỗi lần đánh giá/đổi mức độ (Đạt/Đang phát triển/Tốt...)
 *  2. Observation: mỗi ghi chú quan sát giáo viên nhập trong ngày
 * Không còn milestone mẫu viết cứng — lớp chưa có học sinh/observation nào
 * thì trả về mảng rỗng, FE phải tự hiển thị trạng thái "chưa có dữ liệu".
 */
export async function GET() {
  const ctx = await requireActiveUser();
  if (ctx instanceof NextResponse) return ctx;
  const { currentClass } = ctx;

  try {
    const students = await prisma.student.findMany({
      where: { classId: currentClass.id },
      select: { id: true, name: true, gender: true },
    });
    const studentIds = students.map((s) => s.id);
    const studentMap = new Map(students.map((s) => [s.id, s]));

    if (studentIds.length === 0) {
      return NextResponse.json({ success: true, timeline: [] });
    }

    const [assessments, observations] = await Promise.all([
      prisma.studentAssessment.findMany({
        where: { studentId: { in: studentIds } },
        include: { domain: true },
        orderBy: { updatedAt: "desc" },
        take: 30,
      }),
      prisma.observation.findMany({
        where: { studentId: { in: studentIds } },
        include: { domain: true },
        orderBy: { date: "desc" },
        take: 30,
      }),
    ]);

    const timeline = [
      ...assessments.map((a) => ({
        type: "ASSESSMENT" as const,
        id: a.id,
        date: a.updatedAt,
        studentName: studentMap.get(a.studentId)?.name || "Học sinh",
        studentId: a.studentId,
        domainName: a.domain?.name || "Chung",
        level: a.level,
        notes: a.notes || "",
      })),
      ...observations.map((o) => ({
        type: "OBSERVATION" as const,
        id: o.id,
        date: o.date,
        studentName: studentMap.get(o.studentId)?.name || "Học sinh",
        studentId: o.studentId,
        domainName: o.domain?.name || o.category || "Chung",
        content: o.content,
      })),
    ]
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 30);

    return NextResponse.json({ success: true, timeline });
  } catch (error: any) {
    console.error("GET /api/assessment/timeline error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
