import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireActiveUser, getCurrentUser } from "@/lib/auth";
import { checkProfanity } from "@/lib/profanityFilter";

export const dynamic = "force-dynamic";

/**
 * Danh sách phản hồi CÔNG KHAI — khách vãng lai (chưa đăng nhập) cũng xem
 * được, giống tinh thần "duyệt web tự do, chỉ thao tác mới cần đăng nhập"
 * đã áp dụng cho cả app. Chỉ ẩn các mục admin đã ẩn thủ công (isHidden).
 */
export async function GET() {
  try {
    const feedbacks = await prisma.feedback.findMany({
      where: { isHidden: false },
      orderBy: { createdAt: "desc" },
      take: 100,
      select: {
        id: true,
        authorName: true,
        rating: true,
        content: true,
        createdAt: true,
        userId: true,
        reactions: { select: { emoji: true, userId: true } },
      },
    });

    // Người đang xem (nếu có đăng nhập) để FE biết mục nào là của chính
    // mình, hiện nút xoá — không lộ userId của người khác ra ngoài payload.
    const currentUser = await getCurrentUser().catch(() => null);

    const ratedCount = feedbacks.filter((f) => f.rating).length;
    const avgRating =
      ratedCount > 0 ? feedbacks.reduce((sum, f) => sum + (f.rating || 0), 0) / ratedCount : null;

    return NextResponse.json({
      success: true,
      feedbacks: feedbacks.map((f) => {
        const counts: Record<string, number> = {};
        let myReaction: string | null = null;
        for (const r of f.reactions) {
          counts[r.emoji] = (counts[r.emoji] || 0) + 1;
          if (currentUser && r.userId === currentUser.id) myReaction = r.emoji;
        }
        return {
          id: f.id,
          authorName: f.authorName,
          rating: f.rating,
          content: f.content,
          createdAt: f.createdAt,
          isMine: currentUser?.id === f.userId,
          reactionCounts: counts,
          myReaction,
        };
      }),
      stats: { total: feedbacks.length, ratedCount, avgRating },
    });
  } catch (error: any) {
    console.error("GET /api/feedback error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const ctx = await requireActiveUser();
  if (ctx instanceof NextResponse) return ctx;
  const { user } = ctx;

  try {
    const body = await request.json();
    const { content, rating } = body;

    if (!content || typeof content !== "string" || !content.trim()) {
      return NextResponse.json({ success: false, error: "Cô vui lòng nhập nội dung phản hồi nhé!" }, { status: 400 });
    }
    if (content.trim().length > 1000) {
      return NextResponse.json({ success: false, error: "Nội dung phản hồi tối đa 1000 ký tự." }, { status: 400 });
    }

    const parsedRating = rating === undefined || rating === null || rating === "" ? null : Number(rating);
    if (parsedRating !== null && (!Number.isInteger(parsedRating) || parsedRating < 1 || parsedRating > 5)) {
      return NextResponse.json({ success: false, error: "Số sao đánh giá phải từ 1 đến 5." }, { status: 400 });
    }

    // Chặn ngay lúc gửi nếu chứa ngôn từ không chuẩn mực — không lưu vào DB.
    const profanity = checkProfanity(content);
    if (profanity.flagged) {
      return NextResponse.json(
        {
          success: false,
          error: "Nội dung phản hồi có chứa ngôn từ không phù hợp. Cô vui lòng chỉnh sửa lại giúp em nhé!",
          code: "PROFANITY_DETECTED",
        },
        { status: 400 }
      );
    }

    const feedback = await prisma.feedback.create({
      data: {
        userId: user.id,
        authorName: user.name,
        content: content.trim(),
        rating: parsedRating,
      },
    });

    return NextResponse.json({
      success: true,
      feedback: { id: feedback.id, authorName: feedback.authorName, rating: feedback.rating, content: feedback.content, createdAt: feedback.createdAt, isMine: true },
    });
  } catch (error: any) {
    console.error("POST /api/feedback error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
