import { NextResponse } from "next/server";
import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/auth";

export const dynamic = "force-dynamic";

function hashOtp(otp: string): string {
  return crypto.createHash("sha256").update(otp).digest("hex");
}

/**
 * Đặt lại mật khẩu bằng mã OTP đã gửi qua email (xem forgot-password).
 * Thành công thì XOÁ HẾT session cũ của tài khoản đó (đăng xuất khỏi mọi nơi
 * đang đăng nhập) — phòng trường hợp thiết bị/trình duyệt cũ bị lộ mật khẩu
 * cũ mà đây chính là lý do phải đặt lại mật khẩu.
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const email = String(body.email || "").trim().toLowerCase();
    const otp = String(body.otp || "").trim();
    const newPassword = String(body.newPassword || "");

    if (!email || !otp) {
      return NextResponse.json({ success: false, error: "Thiếu email hoặc mã OTP." }, { status: 400 });
    }
    if (newPassword.length < 6) {
      return NextResponse.json({ success: false, error: "Mật khẩu mới tối thiểu 6 ký tự." }, { status: 400 });
    }

    const user = await prisma.user.findUnique({ where: { email } });
    if (
      !user ||
      !user.resetOtpHash ||
      !user.resetOtpExpiresAt ||
      user.resetOtpExpiresAt < new Date() ||
      user.resetOtpHash !== hashOtp(otp)
    ) {
      return NextResponse.json(
        { success: false, error: "Mã OTP không đúng hoặc đã hết hạn. Cô yêu cầu gửi lại mã mới nhé!" },
        { status: 400 }
      );
    }

    const passwordHash = await hashPassword(newPassword);
    await prisma.$transaction([
      prisma.user.update({
        where: { id: user.id },
        data: { passwordHash, resetOtpHash: null, resetOtpExpiresAt: null },
      }),
      prisma.session.deleteMany({ where: { userId: user.id } }),
    ]);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("POST /api/auth/reset-password error:", error);
    return NextResponse.json({ success: false, error: "Không thể đặt lại mật khẩu. Cô thử lại giúp em nhé!" }, { status: 500 });
  }
}
