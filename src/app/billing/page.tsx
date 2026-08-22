import { redirect } from "next/navigation";
import { getCurrentUser, getAccessStatus } from "@/lib/auth";
import { BillingClient } from "@/components/billing/BillingClient";
import { AppShell } from "@/components/layout/AppShell";

// Trang này CHỈ yêu cầu đã đăng nhập, KHÔNG yêu cầu subscription đang active
// — vì đây chính là nơi user PENDING/EXPIRED vào để thanh toán/gia hạn.
// Đặt ngoài route group (app) để không bị layout đó CHẶN HẲN trước khi tới
// đây — nhưng vẫn tự bọc trong AppShell để có đủ Sidebar/Navbar/MobileNav
// như mọi trang khác trong app (trước đây thiếu hẳn, bấm vào trông như
// "văng ra khỏi web", chỉ riêng phần chặn truy cập là bỏ qua).
export default async function BillingPage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }

  const access = getAccessStatus(user.subscription, user.role === "admin", user.isLocked);

  return (
    <AppShell>
      <BillingClient
        userName={user.name}
        currentStatus={user.subscription?.status || "NO_SUBSCRIPTION"}
        currentPeriodEnd={user.subscription?.currentPeriodEnd?.toISOString() || null}
        accessAllowed={access.allowed}
      />
    </AppShell>
  );
}
