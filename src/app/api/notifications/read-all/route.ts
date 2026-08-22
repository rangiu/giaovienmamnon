import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireActiveUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

/** Đánh dấu TẤT CẢ thông báo (riêng + broadcast) là đã đọc. */
export async function POST() {
  const ctx = await requireActiveUser();
  if (ctx instanceof NextResponse) return ctx;
  const { user } = ctx;

  try {
    const notifications = await prisma.notification.findMany({
      where: { OR: [{ userId: null }, { userId: user.id }] },
      select: { id: true },
    });

    await prisma.notificationRead.createMany({
      data: notifications.map((n) => ({ notificationId: n.id, userId: user.id })),
      skipDuplicates: true,
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("POST /api/notifications/read-all error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
