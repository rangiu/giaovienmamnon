import { prisma } from "./prisma";

/**
 * Hệ thống tín dụng tạo video — TÁCH RIÊNG khỏi Subscription (settings.ts).
 * 2 loại tín dụng độc lập, không dùng lẫn:
 *   - HYBRID: ảnh AI (tái sử dụng nhân vật/nền qua các cảnh) + Remotion, rẻ.
 *   - VEO: video chuyển động thật qua Google Veo, đắt hơn nhiều.
 * Số dư là "nguồn sự thật" (VideoCreditBalance.balance), mọi thay đổi đều
 * ghi thêm 1 dòng VideoCreditLedgerEntry để đối soát/debug.
 */

export const VIDEO_CREDIT_TIERS = ["HYBRID", "VEO"] as const;
export type VideoCreditTier = (typeof VIDEO_CREDIT_TIERS)[number];

export const VIDEO_TIER_LABEL: Record<VideoCreditTier, string> = {
  HYBRID: "Hybrid (ảnh AI + hoạt hình)",
  VEO: "Veo (chuyển động thật)",
};

export function isValidVideoTier(value: any): value is VideoCreditTier {
  return VIDEO_CREDIT_TIERS.includes(value);
}

/**
 * Định giá theo THỜI LƯỢNG thay vì "lượt" cố định — trước đây MỌI video trừ
 * đúng 1 lượt bất kể ngắn/dài, không phản ánh đúng chi phí AI thật (video
 * càng nhiều cảnh càng tốn nhiều lần gọi sinh ảnh + giọng đọc). Đơn vị
 * "token" = ĐÚNG 1 lần gọi AI sinh ảnh (1 cảnh HOẶC 1 ảnh tham chiếu nhân
 * vật) — gắn thẳng vào biến chi phí thật, không cần hệ số quy đổi phức tạp.
 *
 * Giá 1 token hiện là SỐ TẠM (chưa có dữ liệu chi phí thật/request tách
 * riêng theo model từ shopaikey.com — API usage chỉ trả tổng gộp, không
 * tách theo loại) — admin điều chỉnh lại qua AppSetting khi có số liệu thật.
 */
export const SECONDS_PER_SCENE_ESTIMATE = 5;
export const TOKENS_PER_CHARACTER_ASSET_ESTIMATE = 1; // ước tính trung bình 1 nhân vật/video lúc CHƯA có storyboard thật
export const MIN_VIDEO_DURATION_SECONDS = 15;
export const MAX_VIDEO_DURATION_SECONDS = 120;
const MIN_SCENES = 5;
const MAX_SCENES = 14; // khớp khuyến nghị 5-14 cảnh ở videoScriptEngine.ts

export function estimateSceneCount(durationSeconds: number): number {
  const raw = Math.ceil(durationSeconds / SECONDS_PER_SCENE_ESTIMATE);
  return Math.min(MAX_SCENES, Math.max(MIN_SCENES, raw));
}

/** Số token ƯỚC TÍNH hiện NGAY trên màn hình trước khi cô bấm tạo — đây cũng CHÍNH LÀ số token thật sự bị trừ (không đổi số sau khi có storyboard thật, xem videoScriptEngine.ts's targetSceneCount). */
export function estimateTokenCost(durationSeconds: number): number {
  return estimateSceneCount(durationSeconds) + TOKENS_PER_CHARACTER_ASSET_ESTIMATE;
}

/** Danh sách gói ĐANG BÁN, cho trang mua tín dụng của giáo viên. */
export async function getActiveVideoCreditPackages() {
  return prisma.videoCreditPackage.findMany({
    where: { isActive: true },
    orderBy: { orderIndex: "asc" },
  });
}

/** Toàn bộ gói kể cả đã ẩn, cho trang quản trị. */
export async function getAllVideoCreditPackages() {
  return prisma.videoCreditPackage.findMany({ orderBy: { orderIndex: "asc" } });
}

export async function getVideoCreditPackageById(id: string) {
  return prisma.videoCreditPackage.findUnique({ where: { id } });
}

/** Số dư hiện tại của 1 giáo viên, theo từng tier — mặc định 0 nếu chưa từng mua/được tặng. */
export async function getUserVideoCreditBalances(userId: string): Promise<Record<VideoCreditTier, number>> {
  const rows = await prisma.videoCreditBalance.findMany({ where: { userId } });
  const result = { HYBRID: 0, VEO: 0 } as Record<VideoCreditTier, number>;
  for (const row of rows) {
    if (isValidVideoTier(row.tier)) result[row.tier] = row.balance;
  }
  return result;
}

/**
 * Cộng tín dụng (mua thành công / admin tặng / hoàn khi job lỗi) — upsert
 * balance + ghi ledger trong cùng 1 transaction để 2 bảng không bao giờ lệch nhau.
 */
export async function grantVideoCredits(params: {
  userId: string;
  tier: VideoCreditTier;
  amount: number;
  reason: "PURCHASE" | "ADMIN_GRANT" | "JOB_REFUND";
  paymentId?: string;
  videoJobId?: string;
}) {
  const { userId, tier, amount, reason, paymentId, videoJobId } = params;
  if (amount <= 0) return;

  await prisma.$transaction(async (tx) => {
    await tx.videoCreditBalance.upsert({
      where: { userId_tier: { userId, tier } },
      create: { userId, tier, balance: amount },
      update: { balance: { increment: amount } },
    });
    await tx.videoCreditLedgerEntry.create({
      data: { userId, tier, delta: amount, reason, paymentId, videoJobId },
    });
  });
}

/**
 * Trừ ĐÚNG "amount" token khi giáo viên nộp yêu cầu tạo video (amount tính
 * theo thời lượng yêu cầu — xem estimateTokenCost()) — UPDATE có điều kiện
 * `balance >= amount` trong 1 transaction cùng dòng ledger, atomic ở tầng
 * Postgres nên 2 request gần như đồng thời không thể cùng trừ được khi
 * không đủ số dư (không phải kiểu đếm-rồi-ghi dễ dính race condition).
 * Trả về true nếu trừ thành công, false nếu không đủ token.
 */
export async function consumeVideoCredit(params: {
  userId: string;
  tier: VideoCreditTier;
  amount: number;
  videoJobId?: string;
}): Promise<boolean> {
  const { userId, tier, amount, videoJobId } = params;
  if (amount <= 0) return false;

  return prisma.$transaction(async (tx) => {
    const result = await tx.videoCreditBalance.updateMany({
      where: { userId, tier, balance: { gte: amount } },
      data: { balance: { decrement: amount } },
    });
    if (result.count !== 1) return false;

    await tx.videoCreditLedgerEntry.create({
      data: { userId, tier, delta: -amount, reason: "JOB_CONSUME", videoJobId },
    });
    return true;
  });
}

/** Hoàn lại ĐÚNG số token đã trừ khi VideoJob thất bại SAU KHI đã trừ (VideoJob.tokensConsumed). */
export async function refundVideoCredit(params: { userId: string; tier: VideoCreditTier; amount: number; videoJobId?: string }) {
  return grantVideoCredits({
    userId: params.userId,
    tier: params.tier,
    amount: params.amount,
    reason: "JOB_REFUND",
    videoJobId: params.videoJobId,
  });
}
