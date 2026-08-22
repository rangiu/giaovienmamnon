import { NextResponse } from "next/server";
import { prisma, getOrCreateTeacherAndClassForUser } from "@/lib/prisma";
import { hashPassword, createSession, SESSION_COOKIE_NAME } from "@/lib/auth";
import { sendWelcomeEmail } from "@/lib/email";
import { notifyUser } from "@/lib/notifications";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const email = String(body.email || "").trim().toLowerCase();
    const password = String(body.password || "");
    const name = String(body.name || "").trim();

    if (!email || !email.includes("@")) {
      return NextResponse.json({ success: false, error: "Email không hợp lệ." }, { status: 400 });
    }
    if (password.length < 6) {
      return NextResponse.json({ success: false, error: "Mật khẩu cần tối thiểu 6 ký tự." }, { status: 400 });
    }
    if (!name) {
      return NextResponse.json({ success: false, error: "Vui lòng nhập họ tên." }, { status: 400 });
    }

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json({ success: false, error: "Email này đã được đăng ký." }, { status: 409 });
    }

    const passwordHash = await hashPassword(password);
    const adminEmail = (process.env.ADMIN_EMAIL || "").trim().toLowerCase();
    const isAdmin = adminEmail.length > 0 && email === adminEmail;

    // Giáo viên mầm non đa phần ít rành công nghệ — bỏ hẳn bước "phải vào
    // Gmail bấm link kích hoạt" để càng dễ càng tốt: tạo tài khoản xong là
    // vào dùng được luôn. Email giờ chỉ là thông báo chào mừng, không có
    // hành động bắt buộc nào cả.
    const user = await prisma.user.create({
      data: {
        email,
        name,
        passwordHash,
        role: isAdmin ? "admin" : "teacher",
        emailVerified: true,
      },
    });

    // Admin tự động được kích hoạt luôn (ACTIVE ~10 năm). Tài khoản thường
    // vào thẳng FREE — dùng được Chat cơ bản ngay, nâng cấp gói tháng bất
    // cứ lúc nào để mở khoá toàn bộ tính năng.
    await prisma.subscription.create({
      data: isAdmin
        ? {
            userId: user.id,
            status: "ACTIVE",
            currentPeriodStart: new Date(),
            currentPeriodEnd: new Date(Date.now() + 3650 * 24 * 60 * 60 * 1000), // ~10 năm
          }
        : {
            userId: user.id,
            status: "FREE",
          },
    });

    await getOrCreateTeacherAndClassForUser(user.id);

    const token = await createSession(user.id);

    // Gửi email chào mừng — không chặn luồng đăng ký nếu gửi mail lỗi.
    sendWelcomeEmail(email, name).catch((err) => console.error("sendWelcomeEmail failed:", err));

    notifyUser({
      userId: user.id,
      title: "Chào mừng đến với SUMFLOW! 🎉",
      message: "Tài khoản của cô đã tạo thành công. Cô có thể dùng ngay Chat AI, Kho giáo án và Quản lý lớp học miễn phí!",
      type: "WELCOME",
      link: "/chat",
    }).catch((err) => console.error("notifyUser welcome failed:", err));

    const response = NextResponse.json({
      success: true,
      user: { id: user.id, email, name, role: user.role },
    });
    response.cookies.set(SESSION_COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 30 * 24 * 60 * 60,
    });
    return response;
  } catch (error: any) {
    console.error("POST /api/auth/signup error:", error);
    return NextResponse.json({ success: false, error: "Đã có lỗi xảy ra, vui lòng thử lại." }, { status: 500 });
  }
}
