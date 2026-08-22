import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";

export const dynamic = "force-dynamic";

/**
 * Admin cấp/gia hạn quyền truy cập cho 1 user — dùng cho cả 2 trường hợp:
 * "tặng dùng thử" (type=TRIAL, kèm số ngày) và "kích hoạt trả phí thủ công"
 * (type=ACTIVE, kèm số ngày, ví dụ sau khi xác nhận chuyển khoản tay qua Zalo).
 */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await requireAdmin();
  if (ctx instanceof NextResponse) return ctx;

  const { id: userId } = await params;

  try {
    const body = await request.json();
    const type = body.type === "ACTIVE" ? "ACTIVE" : "TRIALING";
    const days = Math.max(1, Number(body.days) || 7);

    const targetUser = await prisma.user.findUnique({ where: { id: userId } });
    if (!targetUser) {
      return NextResponse.json({ success: false, error: "Không tìm thấy tài khoản." }, { status: 404 });
    }

    const now = new Date();
    const endDate = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);

    const subscription = await prisma.subscription.upsert({
      where: { userId },
      create: {
        userId,
        status: type,
        trialEndsAt: type === "TRIALING" ? endDate : null,
        currentPeriodStart: type === "ACTIVE" ? now : null,
        currentPeriodEnd: type === "ACTIVE" ? endDate : null,
        grantedBy: ctx.user.id,
      },
      update: {
        status: type,
        trialEndsAt: type === "TRIALING" ? endDate : null,
        currentPeriodStart: type === "ACTIVE" ? now : null,
        currentPeriodEnd: type === "ACTIVE" ? endDate : null,
        grantedBy: ctx.user.id,
      },
    });

    return NextResponse.json({ success: true, subscription });
  } catch (error: any) {
    console.error("POST /api/admin/users/[id]/grant error:", error);
    return NextResponse.json({ success: false, error: "Không thể cấp quyền." }, { status: 500 });
  }
}
