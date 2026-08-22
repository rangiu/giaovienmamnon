import { NextResponse } from "next/server";
import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import { requireAdmin, hashPassword } from "@/lib/auth";
import { notifyUser } from "@/lib/notifications";

export const dynamic = "force-dynamic";

// Ký tự dễ đọc/dễ đọc-cho-qua-điện-thoại khi admin đọc lại cho cô giáo qua
// Zalo — bỏ các ký tự dễ nhầm (0/O, 1/l/I).
const READABLE_CHARS = "ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";

function generateTempPassword(length = 10): string {
  let result = "";
  const bytes = crypto.randomBytes(length);
  for (let i = 0; i < length; i++) {
    result += READABLE_CHARS[bytes[i] % READABLE_CHARS.length];
  }
  return result;
}

/**
 * Admin hỗ trợ đặt lại mật khẩu cho giáo viên KHÔNG truy cập được email đã
 * đăng ký (không dùng được luồng OTP tự phục vụ ở forgot-password/route.ts).
 * Sinh mật khẩu tạm ngẫu nhiên, trả về NGUYÊN VĂN 1 LẦN DUY NHẤT trong
 * response này để admin đọc/gửi tay cho cô (qua Zalo...) — KHÔNG lưu
 * plaintext ở đâu cả (chỉ lưu hash, giống mọi mật khẩu khác), không tự gửi
 * email (nhiều trường hợp cần đặt lại vì cô KHÔNG còn truy cập được email
 * đó). Xoá hết session cũ để mật khẩu cũ (có thể đã lộ) không còn dùng được
 * nữa ở bất kỳ thiết bị nào đang đăng nhập.
 */
export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await requireAdmin();
  if (ctx instanceof NextResponse) return ctx;
  const { id: userId } = await params;

  try {
    const targetUser = await prisma.user.findUnique({ where: { id: userId } });
    if (!targetUser) {
      return NextResponse.json({ success: false, error: "Không tìm thấy tài khoản." }, { status: 404 });
    }

    const tempPassword = generateTempPassword();
    const passwordHash = await hashPassword(tempPassword);

    await prisma.$transaction([
      prisma.user.update({
        where: { id: userId },
        data: { passwordHash, resetOtpHash: null, resetOtpExpiresAt: null },
      }),
      prisma.session.deleteMany({ where: { userId } }),
    ]);

    notifyUser({
      userId,
      title: "Mật khẩu đã được đặt lại",
      message: "Quản trị viên vừa hỗ trợ đặt lại mật khẩu cho tài khoản của cô. Nếu không phải cô yêu cầu, liên hệ ngay Zalo 0899442256.",
      type: "ADMIN",
    }).catch((err) => console.error("notifyUser reset-password failed:", err));

    return NextResponse.json({ success: true, tempPassword });
  } catch (error: any) {
    console.error("POST /api/admin/users/[id]/reset-password error:", error);
    return NextResponse.json({ success: false, error: "Không thể đặt lại mật khẩu." }, { status: 500 });
  }
}
