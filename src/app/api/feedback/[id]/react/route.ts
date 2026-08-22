import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireActiveUser } from "@/lib/auth";
import { isValidReaction } from "@/lib/reactions";

export const dynamic = "force-dynamic";

/**
 * Thả biểu cảm kiểu Facebook cho 1 bài phản hồi — bấm đúng biểu cảm đang
 * chọn để BỎ chọn, bấm biểu cảm khác để ĐỔI (mỗi người chỉ 1 biểu cảm/bài,
 * giống hệt cách Facebook Reactions hoạt động).
 */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await requireActiveUser();
  if (ctx instanceof NextResponse) return ctx;
  const { user } = ctx;
  const { id: feedbackId } = await params;

  try {
    const body = await request.json();
    const { emoji } = body;

    if (!isValidReaction(emoji)) {
      return NextResponse.json({ success: false, error: "Biểu cảm không hợp lệ." }, { status: 400 });
    }

    const feedback = await prisma.feedback.findUnique({ where: { id: feedbackId }, select: { id: true } });
    if (!feedback) {
      return NextResponse.json({ success: false, error: "Không tìm thấy bài phản hồi." }, { status: 404 });
    }

    const existing = await prisma.feedbackReaction.findUnique({
      where: { feedbackId_userId: { feedbackId, userId: user.id } },
    });

    let myReaction: string | null;
    if (existing && existing.emoji === emoji) {
      // Bấm lại đúng biểu cảm đã chọn -> bỏ chọn
      await prisma.feedbackReaction.delete({ where: { id: existing.id } });
      myReaction = null;
    } else {
      await prisma.feedbackReaction.upsert({
        where: { feedbackId_userId: { feedbackId, userId: user.id } },
        create: { feedbackId, userId: user.id, emoji },
        update: { emoji },
      });
      myReaction = emoji;
    }

    const counts = await prisma.feedbackReaction.groupBy({
      by: ["emoji"],
      where: { feedbackId },
      _count: { emoji: true },
    });

    return NextResponse.json({
      success: true,
      myReaction,
      counts: Object.fromEntries(counts.map((c) => [c.emoji, c._count.emoji])),
    });
  } catch (error: any) {
    console.error("POST /api/feedback/[id]/react error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
