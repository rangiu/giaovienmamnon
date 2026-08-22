import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getActiveVideoCreditPackages, getUserVideoCreditBalances } from "@/lib/videoCredits";

export const dynamic = "force-dynamic";

/** Danh sách gói tín dụng video ĐANG BÁN + số dư hiện tại — cho trang mua tín dụng hiển thị. */
export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ success: false, error: "Chưa đăng nhập." }, { status: 401 });
  }

  const [packages, balances] = await Promise.all([
    getActiveVideoCreditPackages(),
    getUserVideoCreditBalances(user.id),
  ]);

  return NextResponse.json({ success: true, packages, balances });
}
