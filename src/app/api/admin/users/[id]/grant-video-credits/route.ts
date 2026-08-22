import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { grantVideoCredits, isValidVideoTier } from "@/lib/videoCredits";

export const dynamic = "force-dynamic";

/** Admin tặng tay N tín dụng video cho 1 tài khoản (VD: hỗ trợ khách, khuyến mãi). */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await requireAdmin();
  if (ctx instanceof NextResponse) return ctx;
  const { id: userId } = await params;

  try {
    const body = await request.json();
    const { tier, amount } = body;

    if (!isValidVideoTier(tier)) {
      return NextResponse.json({ success: false, error: "Tier không hợp lệ (HYBRID hoặc VEO)." }, { status: 400 });
    }
    const amountNum = Math.max(1, Math.round(Number(amount) || 0));
    if (!Number.isFinite(amountNum) || amountNum <= 0) {
      return NextResponse.json({ success: false, error: "Số lượt tặng không hợp lệ." }, { status: 400 });
    }

    const targetUser = await prisma.user.findUnique({ where: { id: userId } });
    if (!targetUser) {
      return NextResponse.json({ success: false, error: "Không tìm thấy tài khoản." }, { status: 404 });
    }

    await grantVideoCredits({ userId, tier, amount: amountNum, reason: "ADMIN_GRANT" });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("POST /api/admin/users/[id]/grant-video-credits error:", error);
    return NextResponse.json({ success: false, error: "Không thể tặng tín dụng." }, { status: 500 });
  }
}
