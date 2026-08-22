import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireActiveUser } from "@/lib/auth";
import {
  consumeVideoCredit,
  isValidVideoTier,
  estimateTokenCost,
  MIN_VIDEO_DURATION_SECONDS,
  MAX_VIDEO_DURATION_SECONDS,
} from "@/lib/videoCredits";
import { startVideoJobPoller } from "@/lib/media/videoProcessor";
import { checkProfanity } from "@/lib/profanityFilter";

export const dynamic = "force-dynamic";

const MAX_REQUEST_LENGTH = 500;
// Trần số video LƯU/giáo viên (Kho Video) — video chiếm khá nhiều dung
// lượng đĩa (final.mp4 giữ vĩnh viễn, xem storage.ts), giáo viên tự xoá bớt
// video cũ (route DELETE video-jobs/[id]) để tạo video mới khi đã đầy.
const MAX_VIDEO_JOBS_PER_USER = 10;

// Đã MỞ LẠI sau khi thay hẳn ruột pipeline Hybrid sang kiến trúc "1 ảnh/cảnh"
// (xem videoScriptEngine.ts, assetEngine.ts, hybridPipeline.ts) — bỏ hoàn
// toàn cách ghép lớp (nền+nhân vật+vật phụ tách rời, sprite sheet, xoá nền)
// từng gây lỗi khung trắng đè nhân vật lặp lại nhiều vòng. Đổi lại thành
// true NGAY nếu phát hiện vấn đề tương tự sau khi triển khai.
const HYBRID_TIER_PAUSED = false;

/**
 * Nộp yêu cầu tạo video — trừ NGAY 1 tín dụng (atomic, xem consumeVideoCredit),
 * tạo VideoJob ở trạng thái PENDING rồi trả về NGAY LẬP TỨC — KHÔNG chờ
 * pipeline chạy xong trong request này (pipeline chạy nhiều phút, sẽ vượt
 * timeout của reverse proxy). Việc xử lý thật do videoProcessor.ts's poller
 * (setInterval độc lập, đã khởi động bằng dòng gọi bên dưới) đảm nhiệm.
 */
export async function POST(request: Request) {
  const ctx = await requireActiveUser();
  if (ctx instanceof NextResponse) return ctx;
  const { user } = ctx;

  startVideoJobPoller();

  try {
    const body = await request.json();
    const tier = body.tier;
    const rawRequest = String(body.rawRequest || "").trim();
    const requestedDurationSeconds = Math.round(Number(body.durationSeconds));

    if (!isValidVideoTier(tier)) {
      return NextResponse.json({ success: false, error: "Tier không hợp lệ." }, { status: 400 });
    }
    if (
      !Number.isFinite(requestedDurationSeconds) ||
      requestedDurationSeconds < MIN_VIDEO_DURATION_SECONDS ||
      requestedDurationSeconds > MAX_VIDEO_DURATION_SECONDS
    ) {
      return NextResponse.json(
        {
          success: false,
          error: `Thời lượng video phải từ ${MIN_VIDEO_DURATION_SECONDS} đến ${MAX_VIDEO_DURATION_SECONDS} giây.`,
        },
        { status: 400 }
      );
    }
    if (tier === "HYBRID" && HYBRID_TIER_PAUSED) {
      return NextResponse.json(
        {
          success: false,
          error: "Tính năng tạo video Hybrid đang tạm ngưng để nâng cấp chất lượng — cô vui lòng quay lại sau nhé!",
          code: "TIER_PAUSED",
        },
        { status: 503 }
      );
    }
    if (!rawRequest) {
      return NextResponse.json({ success: false, error: "Cô vui lòng nhập yêu cầu cho video." }, { status: 400 });
    }
    if (rawRequest.length > MAX_REQUEST_LENGTH) {
      return NextResponse.json(
        { success: false, error: `Yêu cầu tối đa ${MAX_REQUEST_LENGTH} ký tự.` },
        { status: 400 }
      );
    }

    // Chặn NGAY từ lúc nhập nếu có ngôn từ không chuẩn mực — rẻ hơn hẳn chờ
    // tới lúc AI tự chặn (đã có safetySettings chặt ở tầng sinh nội dung,
    // xem safetySettings.ts), và không tốn credit oan cho 1 job chắc chắn sẽ
    // lỗi/không phù hợp với trẻ mầm non.
    const profanity = checkProfanity(rawRequest);
    if (profanity.flagged) {
      return NextResponse.json(
        {
          success: false,
          error: "Yêu cầu có chứa ngôn từ không phù hợp. Cô vui lòng chỉnh sửa lại giúp em nhé!",
          code: "PROFANITY_DETECTED",
        },
        { status: 400 }
      );
    }

    // Kiểm tra trần SỐ VIDEO ĐANG LƯU trước khi trừ tín dụng — tạo mà đầy
    // kho thì chặn NGAY, không trừ tín dụng oan (giáo viên cần xoá bớt video
    // cũ trước, xem DELETE /api/video-jobs/[id]).
    const existingCount = await prisma.videoJob.count({ where: { userId: user.id } });
    if (existingCount >= MAX_VIDEO_JOBS_PER_USER) {
      return NextResponse.json(
        {
          success: false,
          error: `Kho Video của cô đã đầy (tối đa ${MAX_VIDEO_JOBS_PER_USER} video). Cô xoá bớt video cũ để tạo video mới nhé!`,
          code: "VIDEO_LIMIT_REACHED",
        },
        { status: 409 }
      );
    }

    const tokenCost = estimateTokenCost(requestedDurationSeconds);
    const consumed = await consumeVideoCredit({ userId: user.id, tier, amount: tokenCost });
    if (!consumed) {
      return NextResponse.json(
        {
          success: false,
          error: `Cô không đủ token (${tier === "HYBRID" ? "Hybrid" : "Veo"}) — video ${requestedDurationSeconds}s cần ${tokenCost} token. Vui lòng nạp thêm.`,
          code: "OUT_OF_CREDITS",
        },
        { status: 402 }
      );
    }

    const job = await prisma.videoJob.create({
      data: {
        userId: user.id,
        tier,
        rawRequest,
        requestedDurationSeconds,
        tokensConsumed: tokenCost,
        status: "PENDING",
        creditConsumed: true,
      },
    });

    return NextResponse.json({ success: true, job });
  } catch (error: any) {
    console.error("POST /api/video-jobs error:", error);
    return NextResponse.json({ success: false, error: "Không thể tạo yêu cầu video." }, { status: 500 });
  }
}

/**
 * Danh sách video của giáo viên hiện tại (Kho Video), mới nhất trước.
 *
 * BẮT BUỘC gọi startVideoJobPoller() Ở ĐÂY nữa (không chỉ ở POST) — bug
 * thật đã gặp: poller chỉ đăng ký qua cờ globalThis (sống trong RAM của
 * process, mất sạch khi container restart) — trước đây CHỈ POST mới gọi
 * hàm này, nên sau 1 lần restart container (VD lúc deploy đợt khác) mà
 * KHÔNG có ai submit job MỚI (chỉ có job cũ đang PENDING/RENDERING dở
 * dang), trang Kho Video chỉ gọi GET để poll trạng thái — poller không bao
 * giờ được khởi động lại trong process mới, job cũ kẹt vĩnh viễn ở
 * PENDING dù khoá xử lý (VideoProcessingSlot) đã trống. Gọi ở cả GET đảm
 * bảo chỉ cần 1 giáo viên MỞ trang Kho Video sau khi restart là poller
 * chắc chắn sống lại — không cần chờ có ai đó submit job mới.
 */
export async function GET() {
  const ctx = await requireActiveUser();
  if (ctx instanceof NextResponse) return ctx;
  const { user } = ctx;

  startVideoJobPoller();

  const jobs = await prisma.videoJob.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    // Khớp MAX_VIDEO_JOBS_PER_USER — trước đây take:50 cứng, thấp hơn hẳn
    // trần thật (10) nên không sao; giờ trần lên 999 thì take cũng phải
    // theo, không thì danh sách hiển thị/đếm ở FE bị cắt ở 50 dù trần thật
    // cao hơn nhiều, làm cảnh báo "gần đầy kho" hiện sai lúc chưa đầy thật.
    take: MAX_VIDEO_JOBS_PER_USER,
    select: {
      id: true,
      tier: true,
      rawRequest: true,
      status: true,
      errorMessage: true,
      finalVideoPath: true,
      durationSeconds: true,
      requestedDurationSeconds: true,
      tokensConsumed: true,
      contentWasTrimmed: true,
      createdAt: true,
      completedAt: true,
    },
  });

  return NextResponse.json({
    success: true,
    jobs: jobs.map((j) => ({ ...j, videoUrl: j.finalVideoPath ? `/api/media/videos/${j.id}` : null })),
  });
}
