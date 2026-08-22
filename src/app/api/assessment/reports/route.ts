import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireActiveUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

/**
 * Danh sách TẤT CẢ báo cáo đánh giá của TẤT CẢ học sinh thuộc lớp giáo
 * viên đang đăng nhập — trước đây trang FE chỉ gọi
 * /api/assessment/students/{id đầu tiên} nên chỉ thấy báo cáo của đúng 1
 * bé, còn tiêu đề lại viết cứng "Nguyễn Minh" cho mọi báo cáo bất kể của
 * bé nào. Giờ trả về đủ báo cáo, kèm tên bé thật để FE hiển thị đúng.
 */
export async function GET() {
  const ctx = await requireActiveUser();
  if (ctx instanceof NextResponse) return ctx;
  const { teacher } = ctx;

  try {
    const reports = await prisma.assessmentReport.findMany({
      where: { student: { class: { teacherId: teacher.id } } },
      include: { student: true, period: true },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ success: true, reports });
  } catch (error: any) {
    console.error("GET /api/assessment/reports error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
