import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireActiveUser } from "@/lib/auth";
import { cleanupJobDir } from "@/lib/media/storage";

export const dynamic = "force-dynamic";

const NON_TERMINAL_STATUSES = new Set(["PENDING", "SCRIPTING", "GENERATING_ASSETS", "RENDERING"]);

/** Chi tiết 1 job — đích poll của frontend trong lúc chờ video tạo xong (mô phỏng /api/payment/status/[code]). */
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await requireActiveUser();
  if (ctx instanceof NextResponse) return ctx;
  const { user } = ctx;
  const { id } = await params;

  const job = await prisma.videoJob.findUnique({ where: { id } });
  if (!job || job.userId !== user.id) {
    return NextResponse.json({ success: false, error: "Không tìm thấy video." }, { status: 404 });
  }

  return NextResponse.json({
    success: true,
    job: {
      id: job.id,
      tier: job.tier,
      rawRequest: job.rawRequest,
      status: job.status,
      errorMessage: job.errorMessage,
      durationSeconds: job.durationSeconds,
      createdAt: job.createdAt,
      completedAt: job.completedAt,
      videoUrl: job.finalVideoPath ? `/api/media/videos/${job.id}` : null,
    },
  });
}

/**
 * Xoá 1 video khỏi Kho Video — giáo viên tự dọn bớt để nhường chỗ cho video
 * mới khi đã chạm trần MAX_VIDEO_JOBS_PER_USER (xem video-jobs/route.ts).
 * KHÔNG cho xoá job đang xử lý dở (PENDING/SCRIPTING/GENERATING_ASSETS/
 * RENDERING) — xoá row DB giữa chừng trong khi videoProcessor.ts's poller
 * vẫn đang cầm khoá xử lý (VideoProcessingSlot) job đó sẽ làm hàm update
 * status/ghi VideoJobScene sau đó lỗi "record not found" giữa pipeline,
 * KHÔNG hoàn tín dụng đúng cách (khác hẳn đường lỗi bình thường trong
 * videoProcessor.ts's catch-block).
 */
export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await requireActiveUser();
  if (ctx instanceof NextResponse) return ctx;
  const { user } = ctx;
  const { id } = await params;

  const job = await prisma.videoJob.findUnique({ where: { id } });
  if (!job || job.userId !== user.id) {
    return NextResponse.json({ success: false, error: "Không tìm thấy video." }, { status: 404 });
  }
  if (NON_TERMINAL_STATUSES.has(job.status)) {
    return NextResponse.json(
      { success: false, error: "Video đang được xử lý, chưa thể xoá lúc này. Cô vui lòng chờ xong nhé!" },
      { status: 409 }
    );
  }

  // Xoá row DB trước (VideoJobScene/VideoJobAsset tự xoá theo — onDelete: Cascade
  // trong schema), rồi mới dọn file trên đĩa — lỡ dọn file thất bại (log lỗi,
  // không throw) thì DB vẫn nhất quán, không để lại video "ma" hiện trong Kho.
  await prisma.videoJob.delete({ where: { id } });
  await cleanupJobDir(id).catch((err) => console.error(`[video-jobs] Xoá thư mục job ${id} thất bại:`, err));

  return NextResponse.json({ success: true });
}
