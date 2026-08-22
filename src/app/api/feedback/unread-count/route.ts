import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

/**
 * Số bài phản hồi MỚI (của NGƯỜI KHÁC, không tính bài của chính mình) đăng
 * sau lần cuối cô mở trang Diễn đàn phản hồi — hiện thành số đỏ cạnh mục
 * "Diễn đàn phản hồi" ở Sidebar. Khách chưa đăng nhập luôn trả 0 (badge chỉ
 * có ý nghĩa khi đã đăng nhập, giống mọi thông báo khác trong app).
 */
export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ success: true, count: 0 });
  }

  const count = await prisma.feedback.count({
    where: {
      isHidden: false,
      userId: { not: user.id },
      createdAt: { gt: user.forumLastSeenAt ?? new Date(0) },
    },
  });

  return NextResponse.json({ success: true, count });
}
