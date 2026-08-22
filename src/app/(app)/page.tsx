import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { DashboardClient } from "@/components/dashboard/DashboardClient";

/**
 * "/" — Dashboard dành cho giáo viên ĐÃ ĐĂNG NHẬP (chào tên, giáo án gần
 * đây, thông tin lớp riêng của họ) — với khách CHƯA đăng nhập, trang này vốn
 * hiện gần như trống (mọi fetch 401) và KHÔNG có nội dung/metadata SEO nào,
 * trong khi /gioi-thieu mới là trang có đầy đủ nội dung + SEO thật. Chuyển
 * hướng khách sang /gioi-thieu ngay ở đây — KHÔNG đặt logic này ở layout.tsx
 * dùng chung (sẽ chặn nhầm khách xem CÁC trang khác trong app, phá nguyên
 * tắc "khách xem được mọi trang, chỉ thao tác mới cần đăng nhập" đã thống
 * nhất trước đó) — chỉ áp dụng đúng 1 mình route "/" này.
 */
export default async function Home() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/gioi-thieu");
  }

  return <DashboardClient />;
}
