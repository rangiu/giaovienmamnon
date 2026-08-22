import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { sendAdminCustomEmail } from "@/lib/email";

export const dynamic = "force-dynamic";

/** Admin soạn và gửi email trực tiếp cho 1 tài khoản ngay từ trang Quản lý tài khoản. */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await requireAdmin();
  if (ctx instanceof NextResponse) return ctx;
  const { id: userId } = await params;

  try {
    const body = await request.json();
    const { subject, message } = body;

    if (!subject || typeof subject !== "string" || !subject.trim()) {
      return NextResponse.json({ success: false, error: "Cô vui lòng nhập tiêu đề email." }, { status: 400 });
    }
    if (!message || typeof message !== "string" || !message.trim()) {
      return NextResponse.json({ success: false, error: "Cô vui lòng nhập nội dung email." }, { status: 400 });
    }

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      return NextResponse.json({ success: false, error: "Không tìm thấy tài khoản." }, { status: 404 });
    }

    const result = await sendAdminCustomEmail(user.email, user.name, subject.trim(), message.trim());
    if (!result.success) {
      return NextResponse.json(
        { success: false, error: "Gửi email thất bại. Cô kiểm tra lại cấu hình BREVO_API_KEY nhé." },
        { status: 502 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("POST /api/admin/users/[id]/send-email error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
