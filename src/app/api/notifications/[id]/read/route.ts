import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireActiveUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

/** Đánh dấu 1 thông báo là đã đọc — dùng upsert vì unique(notificationId, userId) chống trùng. */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await requireActiveUser();
  if (ctx instanceof NextResponse) return ctx;
  const { user } = ctx;
  const { id } = await params;

  try {
    // Chỉ đánh dấu đọc được thông báo THẬT SỰ gửi cho mình (riêng hoặc
    // broadcast) — tránh tự ý tạo NotificationRead trỏ tới id bất kỳ.
    const notification = await prisma.notification.findFirst({
      where: { id, OR: [{ userId: null }, { userId: user.id }] },
      select: { id: true },
    });
    if (!notification) {
      return NextResponse.json({ success: false, error: "Không tìm thấy thông báo." }, { status: 404 });
    }

    await prisma.notificationRead.upsert({
      where: { notificationId_userId: { notificationId: id, userId: user.id } },
      create: { notificationId: id, userId: user.id },
      update: {},
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("POST /api/notifications/[id]/read error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
