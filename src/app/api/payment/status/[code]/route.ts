import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

// Client poll route này để biết khi nào webhook SePay đã xác nhận thanh
// toán, mà không cần tự làm real-time/socket phức tạp cho quy mô nhỏ này.
export async function GET(request: Request, { params }: { params: Promise<{ code: string }> }) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ success: false, error: "Chưa đăng nhập." }, { status: 401 });
  }

  const { code } = await params;

  const payment = await prisma.payment.findUnique({ where: { paymentCode: code } });
  if (!payment || payment.userId !== user.id) {
    return NextResponse.json({ success: false, error: "Không tìm thấy giao dịch." }, { status: 404 });
  }

  return NextResponse.json({ success: true, status: payment.status, paidAt: payment.paidAt });
}
