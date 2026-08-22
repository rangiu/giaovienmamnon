import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { getAllVideoCreditPackages, isValidVideoTier } from "@/lib/videoCredits";

export const dynamic = "force-dynamic";

/** Toàn bộ gói tín dụng video (kể cả đã ẩn) — cho trang quản trị. */
export async function GET() {
  const ctx = await requireAdmin();
  if (ctx instanceof NextResponse) return ctx;

  const packages = await getAllVideoCreditPackages();
  return NextResponse.json({ success: true, packages });
}

/** Tạo gói tín dụng video mới. */
export async function POST(request: Request) {
  const ctx = await requireAdmin();
  if (ctx instanceof NextResponse) return ctx;

  try {
    const body = await request.json();
    const { name, tier, credits, priceVnd, orderIndex } = body;

    if (!name || typeof name !== "string" || !name.trim()) {
      return NextResponse.json({ success: false, error: "Tên gói không được để trống." }, { status: 400 });
    }
    if (!isValidVideoTier(tier)) {
      return NextResponse.json({ success: false, error: "Tier không hợp lệ (HYBRID hoặc VEO)." }, { status: 400 });
    }
    const creditsNum = Number(credits);
    const priceNum = Number(priceVnd);
    if (!Number.isInteger(creditsNum) || creditsNum <= 0) {
      return NextResponse.json({ success: false, error: "Số lượt tín dụng không hợp lệ." }, { status: 400 });
    }
    if (!Number.isFinite(priceNum) || priceNum < 0) {
      return NextResponse.json({ success: false, error: "Giá gói không hợp lệ." }, { status: 400 });
    }

    const pkg = await prisma.videoCreditPackage.create({
      data: {
        name: name.trim(),
        tier,
        credits: creditsNum,
        priceVnd: Math.round(priceNum),
        orderIndex: Number.isFinite(Number(orderIndex)) ? Math.round(Number(orderIndex)) : 0,
      },
    });

    return NextResponse.json({ success: true, package: pkg });
  } catch (error: any) {
    console.error("POST /api/admin/video-packages error:", error);
    return NextResponse.json({ success: false, error: "Không thể tạo gói tín dụng." }, { status: 500 });
  }
}
