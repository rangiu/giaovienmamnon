import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireActiveUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

/** Đánh dấu cô vừa xem Diễn đàn phản hồi — gọi lúc trang /dien-dan vừa mở, tự reset số đỏ ở Sidebar. */
export async function POST() {
  const ctx = await requireActiveUser();
  if (ctx instanceof NextResponse) return ctx;
  const { user } = ctx;

  await prisma.user.update({ where: { id: user.id }, data: { forumLastSeenAt: new Date() } });

  return NextResponse.json({ success: true });
}
