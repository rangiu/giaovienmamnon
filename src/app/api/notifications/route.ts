import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireActiveUser, requireAdmin } from "@/lib/auth";
import { notifyUser, notifyAll } from "@/lib/notifications";
import { sendAdminCustomEmail } from "@/lib/email";

export const dynamic = "force-dynamic";

/** Danh sách thông báo của TÔI (riêng + broadcast), kèm trạng thái đã đọc. */
export async function GET() {
  const ctx = await requireActiveUser();
  if (ctx instanceof NextResponse) return ctx;
  const { user } = ctx;

  try {
    const notifications = await prisma.notification.findMany({
      where: { OR: [{ userId: null }, { userId: user.id }] },
      orderBy: { createdAt: "desc" },
      take: 50,
      include: { reads: { where: { userId: user.id }, select: { id: true } } },
    });

    const items = notifications.map((n) => ({
      id: n.id,
      title: n.title,
      message: n.message,
      type: n.type,
      link: n.link,
      createdAt: n.createdAt,
      isRead: n.reads.length > 0,
    }));

    return NextResponse.json({
      success: true,
      notifications: items,
      unreadCount: items.filter((n) => !n.isRead).length,
    });
  } catch (error: any) {
    console.error("GET /api/notifications error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

/**
 * Admin soạn & gửi thông báo — target: "ALL" (broadcast) hoặc MẢNG userId
 * (chọn nhiều tài khoản cụ thể, xem AdminDashboard's ô tìm kiếm chọn tài
 * khoản — trước đây chỉ chọn được ĐÚNG 1 tài khoản qua 1 dropdown dài liệt
 * kê hết mọi người, không tìm được ai với danh sách dài). Kèm tuỳ chọn
 * sendEmail — gửi THÊM qua email (không thay thế thông báo chuông trong
 * app), dùng đúng nội dung title/message.
 */
export async function POST(request: Request) {
  const ctx = await requireAdmin();
  if (ctx instanceof NextResponse) return ctx;

  try {
    const body = await request.json();
    const { title, message, target, link, sendEmail } = body;

    if (!title || typeof title !== "string" || !title.trim()) {
      return NextResponse.json({ success: false, error: "Vui lòng nhập tiêu đề thông báo." }, { status: 400 });
    }
    if (!message || typeof message !== "string" || !message.trim()) {
      return NextResponse.json({ success: false, error: "Vui lòng nhập nội dung thông báo." }, { status: 400 });
    }
    if (!target || (target !== "ALL" && !Array.isArray(target))) {
      return NextResponse.json({ success: false, error: "Vui lòng chọn đối tượng nhận." }, { status: 400 });
    }

    const trimmedTitle = title.trim();
    const trimmedMessage = message.trim();
    const trimmedLink = typeof link === "string" && link.trim() ? link.trim() : undefined;

    let recipientCount = 0;

    if (target === "ALL") {
      await notifyAll({ title: trimmedTitle, message: trimmedMessage, link: trimmedLink });
      if (sendEmail) {
        const allUsers = await prisma.user.findMany({
          where: { role: { not: "admin" } },
          select: { email: true, name: true },
        });
        recipientCount = allUsers.length;
        // Không await — gửi hàng loạt qua email có thể mất nhiều giây, không
        // để giáo viên admin phải chờ response, thông báo chuông (việc chính)
        // đã tạo xong ngay ở trên rồi.
        Promise.all(allUsers.map((u) => sendAdminCustomEmail(u.email, u.name, trimmedTitle, trimmedMessage))).catch(
          (err) => console.error("Gửi email hàng loạt (ALL) thất bại:", err)
        );
      }
    } else {
      const targetIds = target.filter((t: any) => typeof t === "string" && t.trim());
      if (targetIds.length === 0) {
        return NextResponse.json({ success: false, error: "Vui lòng chọn ít nhất 1 tài khoản nhận." }, { status: 400 });
      }
      const targetUsers = await prisma.user.findMany({ where: { id: { in: targetIds } } });
      recipientCount = targetUsers.length;

      await Promise.all(
        targetUsers.map((u) =>
          notifyUser({ userId: u.id, title: trimmedTitle, message: trimmedMessage, type: "ADMIN", link: trimmedLink })
        )
      );
      if (sendEmail) {
        Promise.all(targetUsers.map((u) => sendAdminCustomEmail(u.email, u.name, trimmedTitle, trimmedMessage))).catch(
          (err) => console.error("Gửi email hàng loạt (SELECTED) thất bại:", err)
        );
      }
    }

    return NextResponse.json({ success: true, recipientCount });
  } catch (error: any) {
    console.error("POST /api/notifications error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
