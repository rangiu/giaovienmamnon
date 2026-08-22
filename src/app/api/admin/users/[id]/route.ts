import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";

export const dynamic = "force-dynamic";

interface ActivityEntry {
  type: "LOGIN" | "AI_USAGE" | "PAYMENT";
  at: string;
  title: string;
  detail?: string;
}

/** Chi tiết 1 tài khoản + log hoạt động (đăng nhập, dùng AI, thanh toán) — cho modal chi tiết ở trang Quản trị. */
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await requireAdmin();
  if (ctx instanceof NextResponse) return ctx;
  const { id: userId } = await params;

  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { subscription: true, teacher: true },
    });
    if (!user) {
      return NextResponse.json({ success: false, error: "Không tìm thấy tài khoản." }, { status: 404 });
    }

    const [sessions, aiUsages, payments] = await Promise.all([
      prisma.session.findMany({ where: { userId }, orderBy: { createdAt: "desc" }, take: 20 }),
      prisma.aiUsage.findMany({ where: { userId }, orderBy: { createdAt: "desc" }, take: 30 }),
      prisma.payment.findMany({ where: { userId }, orderBy: { createdAt: "desc" }, take: 20 }),
    ]);

    const AI_FEATURE_LABEL: Record<string, string> = {
      chat: "Chat với SUMFLOW",
      generate_lesson: "Soạn giáo án",
      student_comment: "Viết nhận xét trẻ",
      parent_message: "Viết tin nhắn phụ huynh",
      media_prompt: "Tạo prompt ảnh/video",
      assessment_synthesis: "AI tổng hợp báo cáo đánh giá",
      topic_summary: "AI tổng hợp chủ đề",
      topic_analysis: "AI phân tích chủ đề",
    };

    const activity: ActivityEntry[] = [
      ...sessions.map((s) => ({
        type: "LOGIN" as const,
        at: s.createdAt.toISOString(),
        title: "Đăng nhập",
        detail: `Hết hạn ${s.expiresAt.toLocaleDateString("vi-VN")}`,
      })),
      ...aiUsages.map((u) => ({
        type: "AI_USAGE" as const,
        at: u.createdAt.toISOString(),
        title: AI_FEATURE_LABEL[u.feature] || u.feature,
        detail: `${u.model} • ${(u.inputTokens + u.outputTokens).toLocaleString("vi-VN")} tokens`,
      })),
      ...payments.map((p) => ({
        type: "PAYMENT" as const,
        at: p.createdAt.toISOString(),
        title: `Thanh toán ${p.amount.toLocaleString("vi-VN")}đ${p.planCode ? ` (${p.planCode})` : ""}`,
        detail: p.status === "PAID" ? `Đã thanh toán lúc ${p.paidAt ? new Date(p.paidAt).toLocaleString("vi-VN") : ""}` : `Trạng thái: ${p.status}`,
      })),
    ].sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());

    // "Hoạt động gần nhất" = mốc mới nhất trong log (đăng nhập hoặc dùng AI),
    // đồng nhất với cách tính ở danh sách tài khoản.
    const lastActiveAt = activity.length > 0 ? activity[0].at : null;

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        createdAt: user.createdAt,
        isLocked: user.isLocked,
        lockedAt: user.lockedAt,
        schoolName: user.teacher?.schoolName || null,
        className: user.teacher?.className || null,
        studentCount: user.teacher?.studentCount ?? null,
        phone: user.teacher?.phone || null,
        subscription: user.subscription,
        lastActiveAt,
      },
      activity: activity.slice(0, 50),
    });
  } catch (error: any) {
    console.error("GET /api/admin/users/[id] error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
