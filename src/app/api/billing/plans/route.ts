import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getAllPlanPricesVnd, getOfflinePriceVnd } from "@/lib/settings";

export const dynamic = "force-dynamic";

/** Danh sách gói thuê bao (ngày/tuần/tháng) + giá tham khảo gói offline — cho trang Billing hiển thị để chọn. */
export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ success: false, error: "Chưa đăng nhập." }, { status: 401 });
  }

  const plans = await getAllPlanPricesVnd();
  const offlinePriceVnd = await getOfflinePriceVnd();

  return NextResponse.json({ success: true, plans, offlinePriceVnd });
}
