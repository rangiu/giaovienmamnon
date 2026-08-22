import type { VideoJob } from "@prisma/client";
import { prisma } from "../prisma";
import { generateVideoStoryboard } from "../ai/videoScriptEngine";
import { runHybridPipeline } from "./hybridPipeline";
import { runVeoPipeline } from "./veoPipeline";
import { refundVideoCredit, estimateSceneCount, type VideoCreditTier } from "../videoCredits";
import { notifyUser } from "../notifications";
import { cleanupIntermediateFiles, cleanupJobDir } from "./storage";

/**
 * Vòng lặp xử lý VideoJob — KHÔNG dùng thư viện queue/worker nào (repo
 * chưa có, thêm BullMQ+Redis là quá nặng cho VPS 1.9GB RAM đang chia sẻ
 * với 2 project khác). Thay vào đó: 1 setInterval độc lập, đăng ký ĐÚNG 1
 * LẦN cho cả tiến trình `node server.js` (singleton qua globalThis — sống
 * sót qua hot-reload dev, và vì docker-compose chạy app dạng 1 container/1
 * process đơn nên singleton này THẬT SỰ là mutex toàn hệ thống, không phải
 * mutex giả trong 1 request).
 *
 * VideoProcessingSlot (bảng singleton, 1 dòng duy nhất id="singleton") là
 * khoá CHỈ 1 JOB xử lý cùng lúc — claim bằng 1 UPDATE có điều kiện (atomic
 * ở tầng Postgres), KHÔNG đếm-rồi-ghi (race condition). claimedAt cho phép
 * tự "giải cứu" nếu tiến trình cũ crash giữa chừng mà không kịp nhả khoá.
 */

const POLL_INTERVAL_MS = 5000;
const STALE_SLOT_MS = 20 * 60 * 1000; // 20 phút — quá hạn này coi như tiến trình cũ đã chết, cho claim lại

async function claimSlot(jobId: string): Promise<boolean> {
  await prisma.videoProcessingSlot.upsert({
    where: { id: "singleton" },
    create: { id: "singleton" },
    update: {},
  });

  const staleThreshold = new Date(Date.now() - STALE_SLOT_MS);
  const result = await prisma.videoProcessingSlot.updateMany({
    where: {
      id: "singleton",
      OR: [{ busy: false }, { claimedAt: { lt: staleThreshold } }],
    },
    data: { busy: true, claimedJobId: jobId, claimedAt: new Date() },
  });
  return result.count === 1;
}

async function releaseSlot(): Promise<void> {
  await prisma.videoProcessingSlot.updateMany({
    where: { id: "singleton" },
    data: { busy: false, claimedJobId: null, claimedAt: null },
  });
}

async function processJob(job: VideoJob): Promise<void> {
  try {
    await prisma.videoJob.update({ where: { id: job.id }, data: { status: "SCRIPTING" } });

    const targetSceneCount = job.requestedDurationSeconds ? estimateSceneCount(job.requestedDurationSeconds) : undefined;
    const { storyboard, error } = await generateVideoStoryboard(
      job.rawRequest,
      job.tier as VideoCreditTier,
      {},
      job.userId,
      "FULL",
      targetSceneCount,
      job.requestedDurationSeconds ?? undefined
    );
    if (!storyboard) {
      throw new Error(
        error === "MISSING_API_KEY" ? "Chưa cấu hình AI trên hệ thống." : error || "Không tạo được kịch bản video."
      );
    }
    await prisma.videoJob.update({ where: { id: job.id }, data: { storyboardJson: JSON.stringify(storyboard) } });

    const isVeo = job.tier === "VEO";
    let finalRelativePath: string;
    let durationSeconds: number;
    let contentWasTrimmed = false;
    if (isVeo) {
      const result = await runVeoPipeline(job.id, storyboard);
      finalRelativePath = result.finalRelativePath;
      durationSeconds = result.durationSeconds;
    } else {
      const result = await runHybridPipeline(job.id, storyboard, job.userId);
      finalRelativePath = result.finalRelativePath;
      durationSeconds = result.durationSeconds;
      contentWasTrimmed = result.contentWasTrimmed;
    }

    await prisma.videoJob.update({
      where: { id: job.id },
      data: { status: "COMPLETED", finalVideoPath: finalRelativePath, durationSeconds, contentWasTrimmed, completedAt: new Date() },
    });
    await cleanupIntermediateFiles(job.id);

    notifyUser({
      userId: job.userId,
      title: "Video đã sẵn sàng! 🎬",
      message: `Video "${storyboard.title}" của cô đã tạo xong — vào Video Studio để xem nhé!`,
      type: "VIDEO_READY",
      link: "/video-studio",
      dedupeKey: `video_ready:${job.id}`,
    }).catch((err) => console.error("notifyUser video ready failed:", err));
  } catch (err: any) {
    console.error(`[VideoProcessor] Job ${job.id} thất bại:`, err);
    await prisma.videoJob
      .update({
        where: { id: job.id },
        data: { status: "FAILED", errorMessage: String(err?.message || err).slice(0, 500) },
      })
      .catch((e) => console.error("Cập nhật VideoJob FAILED thất bại:", e));

    if (job.creditConsumed && job.tokensConsumed) {
      await refundVideoCredit({
        userId: job.userId,
        tier: job.tier as VideoCreditTier,
        amount: job.tokensConsumed,
        videoJobId: job.id,
      }).catch((e) => console.error("refundVideoCredit failed:", e));
    }

    notifyUser({
      userId: job.userId,
      title: "Tạo video thất bại 😢",
      message: "Đã có lỗi khi tạo video của cô — tín dụng đã được hoàn lại, cô thử tạo lại giúp em nhé!",
      type: "VIDEO_FAILED",
      link: "/video-studio",
    }).catch((e) => console.error("notifyUser video failed failed:", e));
  }
}

// Dọn thư mục job FAILED quá hạn (giữ lại để debug 1 thời gian, không giữ
// vô thời hạn vì đĩa VPS có hạn) — piggyback vào tick() thay vì tạo thêm 1
// scheduler riêng (repo chưa có cron/queue nào để tái dùng), nhưng chỉ thực
// sự quét DB/đĩa mỗi CLEANUP_CHECK_INTERVAL_MS chứ không phải mỗi 5s.
const FAILED_JOB_RETENTION_MS = 3 * 24 * 60 * 60 * 1000; // 3 ngày
const CLEANUP_CHECK_INTERVAL_MS = 30 * 60 * 1000; // 30 phút
let lastCleanupAt = 0;

async function cleanupStaleFailedJobs(): Promise<void> {
  const now = Date.now();
  if (now - lastCleanupAt < CLEANUP_CHECK_INTERVAL_MS) return;
  lastCleanupAt = now;

  const staleThreshold = new Date(now - FAILED_JOB_RETENTION_MS);
  const staleJobs = await prisma.videoJob.findMany({
    where: { status: "FAILED", updatedAt: { lt: staleThreshold } },
    select: { id: true },
  });
  for (const job of staleJobs) {
    await cleanupJobDir(job.id).catch((err) => console.error(`[VideoProcessor] Dọn thư mục job ${job.id} lỗi:`, err));
  }
}

async function tick(): Promise<void> {
  cleanupStaleFailedJobs().catch((err) => console.error("[VideoProcessor] cleanupStaleFailedJobs lỗi:", err));

  const pending = await prisma.videoJob.findFirst({ where: { status: "PENDING" }, orderBy: { createdAt: "asc" } });
  if (!pending) return;

  const claimed = await claimSlot(pending.id);
  if (!claimed) return; // đang có job khác xử lý (hoặc slot vẫn trong hạn) — chờ tick sau

  try {
    await processJob(pending);
  } finally {
    await releaseSlot();
  }
}

/**
 * Khởi động poller — gọi ở đầu mọi route đụng tới tính năng video (idempotent,
 * chỉ thực sự đăng ký setInterval đúng 1 lần nhờ cờ globalThis).
 */
export function startVideoJobPoller(): void {
  const g = globalThis as unknown as { __videoPollerStarted?: boolean };
  if (g.__videoPollerStarted) return;
  g.__videoPollerStarted = true;

  setInterval(() => {
    tick().catch((err) => console.error("[VideoProcessor] Lỗi tick:", err));
  }, POLL_INTERVAL_MS);

  console.log("[VideoProcessor] Poller video đã khởi động.");
}
