import { redirect } from "next/navigation";
import { getCurrentUser, getAccessStatus } from "@/lib/auth";
import { VideoCreditsClient } from "@/components/billing/VideoCreditsClient";
import { AppShell } from "@/components/layout/AppShell";

// Mô phỏng đúng src/app/billing/page.tsx — chỉ cần đăng nhập, KHÔNG yêu cầu
// Subscription đang active (tín dụng video là sản phẩm bán riêng). Đặt
// ngoài route group (app) để không bị layout đó chặn hẳn trước khi tới đây,
// nhưng vẫn tự bọc AppShell để giữ đủ Sidebar/Navbar/MobileNav như mọi trang
// khác — xem billing/page.tsx cho lý do đầy đủ.
export default async function VideoCreditsPage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }

  const access = getAccessStatus(user.subscription, user.role === "admin", user.isLocked);

  return (
    <AppShell>
      <VideoCreditsClient userName={user.name} accessAllowed={access.allowed} />
    </AppShell>
  );
}
