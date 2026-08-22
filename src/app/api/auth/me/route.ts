import { NextResponse } from "next/server";
import { getCurrentUser, getAccessStatus } from "@/lib/auth";
import { checkAndNotifyExpiringSoon } from "@/lib/notifications";
import { getUserVideoCreditBalances } from "@/lib/videoCredits";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ success: true, user: null });
  }

  const access = getAccessStatus(user.subscription, user.role === "admin", user.isLocked);

  // /api/auth/me được Navbar/Sidebar gọi ở HẦU HẾT các trang — điểm "lười
  // kiểm tra" (lazy check) tiện lợi để tự nhắc gói sắp hết hạn mà không cần
  // dựng riêng 1 cron job. dedupeKey theo ngày hết hạn nên chỉ nhắc đúng 1
  // lần/kỳ hạn, không làm chậm response (chạy nền, không await chặn response).
  if (user.subscription?.currentPeriodEnd) {
    checkAndNotifyExpiringSoon(user.id, user.subscription.currentPeriodEnd).catch((err) =>
      console.error("checkAndNotifyExpiringSoon failed:", err)
    );
  }

  const videoCredits = await getUserVideoCreditBalances(user.id).catch(() => ({ HYBRID: 0, VEO: 0 }));

  return NextResponse.json({
    success: true,
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    },
    subscription: user.subscription,
    access,
    videoCredits,
  });
}
