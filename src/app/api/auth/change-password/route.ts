import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession, hashPassword, verifyPassword } from "@/lib/auth";

export const dynamic = "force-dynamic";

/** Đổi mật khẩu khi ĐÃ đăng nhập — bắt buộc nhập đúng mật khẩu hiện tại (không dùng OTP, đã chứng minh danh tính qua session). */
export async function POST(request: Request) {
  const ctx = await requireSession();
  if (ctx instanceof NextResponse) return ctx;
  const { user } = ctx;

  try {
    const body = await request.json();
    const currentPassword = String(body.currentPassword || "");
    const newPassword = String(body.newPassword || "");

    if (!currentPassword || !newPassword) {
      return NextResponse.json({ success: false, error: "Cô vui lòng nhập đầy đủ mật khẩu." }, { status: 400 });
    }
    if (newPassword.length < 6) {
      return NextResponse.json({ success: false, error: "Mật khẩu mới tối thiểu 6 ký tự." }, { status: 400 });
    }

    const fullUser = await prisma.user.findUnique({ where: { id: user.id } });
    if (!fullUser || !(await verifyPassword(currentPassword, fullUser.passwordHash))) {
      return NextResponse.json({ success: false, error: "Mật khẩu hiện tại không đúng." }, { status: 400 });
    }

    const passwordHash = await hashPassword(newPassword);
    await prisma.user.update({ where: { id: user.id }, data: { passwordHash } });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("POST /api/auth/change-password error:", error);
    return NextResponse.json({ success: false, error: "Không thể đổi mật khẩu. Cô thử lại giúp em nhé!" }, { status: 500 });
  }
}
