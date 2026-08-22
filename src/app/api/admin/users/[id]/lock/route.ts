import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { notifyUser } from "@/lib/notifications";

export const dynamic = "force-dynamic";

/**
 * Khoá/mở khoá 1 tài khoản. Khi khoá: đánh dấu isLocked + xoá hết session
 * đang mở của người đó để họ bị đăng xuất ngay lập tức, không cần đợi
 * session hết hạn tự nhiên.
 */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await requireAdmin();
  if (ctx instanceof NextResponse) return ctx;
  const { id: userId } = await params;

  try {
    const body = await request.json();
    const locked = Boolean(body.locked);

    if (userId === ctx.user.id && locked) {
      return NextResponse.json({ success: false, error: "Không thể tự khoá chính tài khoản đang đăng nhập." }, { status: 400 });
    }

    const targetUser = await prisma.user.findUnique({ where: { id: userId } });
    if (!targetUser) {
      return NextResponse.json({ success: false, error: "Không tìm thấy tài khoản." }, { status: 404 });
    }

    await prisma.user.update({
      where: { id: userId },
      data: { isLocked: locked, lockedAt: locked ? new Date() : null },
    });

    if (locked) {
      await prisma.session.deleteMany({ where: { userId } });
    }

    // Lưu vết dù lúc khoá tài khoản bị đăng xuất ngay nên chưa thấy được —
    // khi mở khoá và đăng nhập lại, cô sẽ thấy đủ lịch sử khoá/mở khoá.
    notifyUser({
      userId,
      title: locked ? "Tài khoản đã bị tạm khoá" : "Tài khoản đã được mở khoá",
      message: locked
        ? "Tài khoản của cô đã bị quản trị viên tạm khoá. Vui lòng liên hệ hỗ trợ qua Zalo 0899442256 để biết thêm chi tiết."
        : "Tài khoản của cô đã được mở khoá trở lại, cô có thể đăng nhập và sử dụng bình thường.",
      type: locked ? "ACCOUNT_LOCKED" : "ACCOUNT_UNLOCKED",
    }).catch((err) => console.error("notifyUser lock/unlock failed:", err));

    return NextResponse.json({ success: true, isLocked: locked });
  } catch (error: any) {
    console.error("POST /api/admin/users/[id]/lock error:", error);
    return NextResponse.json({ success: false, error: "Không thể cập nhật trạng thái khoá." }, { status: 500 });
  }
}
