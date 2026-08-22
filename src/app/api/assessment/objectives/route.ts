import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireActiveUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

/**
 * Danh sách mục tiêu đánh giá (MT3, MT6...) — dữ liệu tham chiếu dùng
 * chung toàn hệ thống, không thuộc riêng tài khoản nào. Dùng để giáo viên
 * chọn mục tiêu khi tạo chủ đề mới (trang Sổ đánh giá sau chủ đề).
 */
export async function GET() {
  const ctx = await requireActiveUser();
  if (ctx instanceof NextResponse) return ctx;

  try {
    const [objectives, domains] = await Promise.all([
      prisma.assessmentObjective.findMany({
        where: { isActive: true },
        orderBy: { code: "asc" },
      }),
      prisma.developmentDomain.findMany({ orderBy: { orderIndex: "asc" } }),
    ]);

    return NextResponse.json({ success: true, objectives, domains });
  } catch (error: any) {
    console.error("GET /api/assessment/objectives error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
