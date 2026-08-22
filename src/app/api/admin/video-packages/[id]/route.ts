import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { isValidVideoTier } from "@/lib/videoCredits";

export const dynamic = "force-dynamic";

/** Sửa gói tín dụng video (tên/tier/số lượt/giá/thứ tự/ẩn-hiện). */
export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await requireAdmin();
  if (ctx instanceof NextResponse) return ctx;
  const { id } = await params;

  try {
    const body = await request.json();
    const data: Record<string, any> = {};

    if (typeof body.name === "string") {
      if (!body.name.trim()) {
        return NextResponse.json({ success: false, error: "Tên gói không được để trống." }, { status: 400 });
      }
      data.name = body.name.trim();
    }
    if (body.tier !== undefined) {
      if (!isValidVideoTier(body.tier)) {
        return NextResponse.json({ success: false, error: "Tier không hợp lệ (HYBRID hoặc VEO)." }, { status: 400 });
      }
      data.tier = body.tier;
    }
    if (body.credits !== undefined) {
      const creditsNum = Number(body.credits);
      if (!Number.isInteger(creditsNum) || creditsNum <= 0) {
        return NextResponse.json({ success: false, error: "Số lượt tín dụng không hợp lệ." }, { status: 400 });
      }
      data.credits = creditsNum;
    }
    if (body.priceVnd !== undefined) {
      const priceNum = Number(body.priceVnd);
      if (!Number.isFinite(priceNum) || priceNum < 0) {
        return NextResponse.json({ success: false, error: "Giá gói không hợp lệ." }, { status: 400 });
      }
      data.priceVnd = Math.round(priceNum);
    }
    if (typeof body.orderIndex === "number" && Number.isFinite(body.orderIndex)) {
      data.orderIndex = Math.round(body.orderIndex);
    }
    if (typeof body.isActive === "boolean") {
      data.isActive = body.isActive;
    }

    const pkg = await prisma.videoCreditPackage.update({ where: { id }, data });
    return NextResponse.json({ success: true, package: pkg });
  } catch (error: any) {
    if (error?.code === "P2025") {
      return NextResponse.json({ success: false, error: "Không tìm thấy gói tín dụng." }, { status: 404 });
    }
    console.error("PUT /api/admin/video-packages/[id] error:", error);
    return NextResponse.json({ success: false, error: "Không thể cập nhật gói tín dụng." }, { status: 500 });
  }
}

// Xoá cứng — chỉ nên dùng cho gói TẠO NHẦM chưa ai mua (ẩn bằng isActive:false
// là lựa chọn khuyến nghị cho gói đã có giao dịch, để giữ lịch sử Payment).
export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await requireAdmin();
  if (ctx instanceof NextResponse) return ctx;
  const { id } = await params;

  try {
    await prisma.videoCreditPackage.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error: any) {
    if (error?.code === "P2025") {
      return NextResponse.json({ success: false, error: "Không tìm thấy gói tín dụng." }, { status: 404 });
    }
    console.error("DELETE /api/admin/video-packages/[id] error:", error);
    return NextResponse.json({ success: false, error: "Không thể xoá gói tín dụng." }, { status: 500 });
  }
}
