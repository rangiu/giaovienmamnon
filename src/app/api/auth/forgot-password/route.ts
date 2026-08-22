import { NextResponse } from "next/server";
import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import { sendPasswordResetOtpEmail } from "@/lib/email";

export const dynamic = "force-dynamic";

const OTP_TTL_MS = 10 * 60 * 1000; // 10 phút
// Chặn spam gửi lại OTP liên tục (làm phiền hộp thư người khác nếu bị lạm
// dụng nhập email của người khác) — chỉ cho gửi lại sau khi mã cũ đã dùng
// hết quá nửa thời hạn (~1 phút kể từ lúc gửi mã trước).
const RESEND_COOLDOWN_MS = 60 * 1000;

function hashOtp(otp: string): string {
  return crypto.createHash("sha256").update(otp).digest("hex");
}

/**
 * Quên mật khẩu — gửi mã OTP 6 số qua email. LUÔN trả về success:true dù
 * email có tồn tại hay không (tránh lộ email nào đã đăng ký trong hệ thống
 * — nguyên tắc bảo mật chuẩn cho luồng quên mật khẩu).
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const email = String(body.email || "").trim().toLowerCase();
    if (!email) {
      return NextResponse.json({ success: false, error: "Cô vui lòng nhập email." }, { status: 400 });
    }

    const user = await prisma.user.findUnique({ where: { email } });
    if (user) {
      const now = new Date();
      if (user.resetOtpExpiresAt && user.resetOtpExpiresAt.getTime() - now.getTime() > OTP_TTL_MS - RESEND_COOLDOWN_MS) {
        // Mã trước vừa gửi chưa lâu — không tạo mã mới, tránh spam email.
        return NextResponse.json({ success: true });
      }

      const otp = String(Math.floor(100000 + Math.random() * 900000));
      await prisma.user.update({
        where: { id: user.id },
        data: { resetOtpHash: hashOtp(otp), resetOtpExpiresAt: new Date(now.getTime() + OTP_TTL_MS) },
      });

      sendPasswordResetOtpEmail(user.email, user.name, otp).catch((err) =>
        console.error("sendPasswordResetOtpEmail failed:", err)
      );
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("POST /api/auth/forgot-password error:", error);
    return NextResponse.json({ success: false, error: "Không thể gửi mã. Cô thử lại giúp em nhé!" }, { status: 500 });
  }
}
