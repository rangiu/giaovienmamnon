import { NextResponse } from "next/server";
import { getBannerConfig } from "@/lib/settings";

export const dynamic = "force-dynamic";

/** Cấu hình banner khẩn — công khai hoàn toàn, kể cả khách chưa đăng nhập cũng cần thấy. */
export async function GET() {
  try {
    const config = await getBannerConfig();
    return NextResponse.json({ success: true, banner: config });
  } catch (error: any) {
    console.error("GET /api/banner error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
