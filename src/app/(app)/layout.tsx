import { getCurrentUser, getAccessStatus } from "@/lib/auth";
import { AccessBlockedScreen } from "@/components/layout/AccessBlockedScreen";
import { AppShell } from "@/components/layout/AppShell";

// Layout này bọc TOÀN BỘ các trang chính của ứng dụng (không bọc /login,
// /signup) — KHÔNG còn đá thẳng khách chưa đăng nhập về /login nữa: khách
// vào web được xem ngay mọi trang bình thường (dạng "khách xem"), chỉ khi
// thao tác cần đăng nhập thì các fetch bên trong trang đó tự trả 401 và
// AuthGateProvider (gắn ở root layout) tự bật popup đăng nhập lên — không
// cần chặn ở tầng layout này nữa.
export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();

  // Đã đăng nhập nhưng bị chặn (chưa xác minh/đã khoá) — vẫn cần chặn hẳn,
  // khác với "khách chưa đăng nhập" (được xem thoải mái).
  if (user) {
    const access = getAccessStatus(user.subscription, user.role === "admin", user.isLocked);
    if (!access.allowed) {
      return <AccessBlockedScreen reason={access.reason} userName={user.name} />;
    }
  }

  return <AppShell>{children}</AppShell>;
}
