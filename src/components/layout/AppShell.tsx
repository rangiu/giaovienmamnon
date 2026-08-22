import { Navbar } from "@/components/layout/Navbar";
import { Sidebar } from "@/components/layout/Sidebar";
import { MobileBottomNav } from "@/components/layout/MobileBottomNav";

/**
 * Khung giao diện chung (Sidebar + Navbar + MobileBottomNav) — tách riêng
 * khỏi (app)/layout.tsx để dùng lại được ở /billing và /video-credits, 2
 * trang CỐ Ý đặt NGOÀI route group (app) (để không bị AccessBlockedScreen
 * chặn trước khi user kịp vào thanh toán) nhưng trước đây vì vậy bị THIẾU
 * LUÔN cả Sidebar/Navbar — trông như "văng ra khỏi app". Giờ 2 trang đó tự
 * bọc nội dung trong <AppShell> để có đủ khung như mọi trang khác trong app,
 * chỉ riêng phần chặn truy cập là bỏ qua.
 */
export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col md:flex-row">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0 min-h-screen">
        <Navbar />
        <main className="flex-1 p-4 md:p-8 pb-20 md:pb-8 max-w-7xl w-full mx-auto">{children}</main>
        <MobileBottomNav />
      </div>
    </div>
  );
}
