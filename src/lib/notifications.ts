import { prisma } from "./prisma";

export type NotificationType =
  | "ADMIN"
  | "PAYMENT_SUCCESS"
  | "EXPIRING_SOON"
  | "ACCOUNT_LOCKED"
  | "ACCOUNT_UNLOCKED"
  | "WELCOME"
  | "CREDITS_PURCHASED"
  | "VIDEO_READY"
  | "VIDEO_FAILED";

/** Gửi thông báo cho ĐÚNG 1 tài khoản. */
export async function notifyUser(params: {
  userId: string;
  title: string;
  message: string;
  type?: NotificationType;
  link?: string;
  dedupeKey?: string;
}) {
  try {
    return await prisma.notification.create({
      data: {
        userId: params.userId,
        title: params.title,
        message: params.message,
        type: params.type || "ADMIN",
        link: params.link,
        dedupeKey: params.dedupeKey,
      },
    });
  } catch (err: any) {
    // Vi phạm unique dedupeKey => thông báo này đã gửi trước đó rồi, bỏ
    // qua trong im lặng thay vì báo lỗi (đây chính là mục đích của dedupeKey).
    if (err?.code === "P2002") return null;
    console.error("notifyUser failed:", err);
    return null;
  }
}

/** Gửi thông báo cho TẤT CẢ tài khoản (broadcast) — chỉ cần 1 dòng Notification (userId=null). */
export async function notifyAll(params: { title: string; message: string; link?: string }) {
  return prisma.notification.create({
    data: {
      userId: null,
      title: params.title,
      message: params.message,
      type: "ADMIN",
      link: params.link,
    },
  });
}

/**
 * Kiểm tra & tự tạo thông báo "sắp hết hạn gói" nếu tài khoản có gói trả
 * phí sắp hết hạn trong vòng `withinDays` ngày tới — dùng dedupeKey theo
 * đúng ngày hết hạn nên mỗi kỳ hạn chỉ nhắc 1 lần duy nhất, không spam mỗi
 * lần tải trang. Gọi lười (lazy) từ endpoint hay được gọi (VD: /api/auth/me)
 * thay vì cần 1 cron job riêng — đủ dùng cho quy mô hiện tại.
 */
export async function checkAndNotifyExpiringSoon(userId: string, currentPeriodEnd: Date | null, withinDays = 3) {
  if (!currentPeriodEnd) return;
  const now = Date.now();
  const msUntilExpiry = currentPeriodEnd.getTime() - now;
  const withinMs = withinDays * 24 * 60 * 60 * 1000;
  if (msUntilExpiry <= 0 || msUntilExpiry > withinMs) return;

  const dateKey = currentPeriodEnd.toISOString().slice(0, 10);
  await notifyUser({
    userId,
    title: "Gói sắp hết hạn",
    message: `Gói sử dụng của cô sẽ hết hạn vào ngày ${currentPeriodEnd.toLocaleDateString("vi-VN")}. Gia hạn ngay để không bị gián đoạn tính năng AI nhé!`,
    type: "EXPIRING_SOON",
    link: "/billing",
    dedupeKey: `expiring:${userId}:${dateKey}`,
  });
}
