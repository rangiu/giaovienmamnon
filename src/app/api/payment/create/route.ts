import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { getPlanByCode } from "@/lib/settings";
import { generatePaymentCode, buildCheckoutPayment } from "@/lib/sepay";

export const dynamic = "force-dynamic";

// Chỉ cần ĐĂNG NHẬP là tạo được yêu cầu thanh toán (không cần subscription
// đang active — đây chính là chỗ để user hết hạn/PENDING vào gia hạn).
export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ success: false, error: "Chưa đăng nhập." }, { status: 401 });
  }

  try {
    const body = await request.json().catch(() => ({}));
    const planCode = String(body.planCode || "MONTHLY").toUpperCase();

    const plan = await getPlanByCode(planCode);
    if (!plan) {
      return NextResponse.json({ success: false, error: "Gói không hợp lệ." }, { status: 400 });
    }

    const paymentCode = generatePaymentCode();

    const payment = await prisma.payment.create({
      data: {
        userId: user.id,
        amount: plan.priceVnd,
        paymentCode,
        status: "PENDING",
        provider: "SEPAY",
        planCode: plan.code,
        durationDays: plan.durationDays,
        expiresAt: new Date(Date.now() + 30 * 60 * 1000), // 30 phút
      },
    });

    const appUrl = process.env.APP_URL || new URL(request.url).origin;
    const { checkoutUrl, fields } = buildCheckoutPayment({
      amount: plan.priceVnd,
      paymentCode,
      userId: user.id,
      appUrl,
      description: `Nang cap goi ${plan.label} - Co AI - ${paymentCode}`,
    });

    return NextResponse.json({
      success: true,
      payment: {
        id: payment.id,
        amount: payment.amount,
        paymentCode: payment.paymentCode,
        planCode: plan.code,
        planLabel: plan.label,
        durationDays: plan.durationDays,
        expiresAt: payment.expiresAt,
      },
      checkoutUrl,
      fields,
    });
  } catch (error: any) {
    console.error("POST /api/payment/create error:", error);
    return NextResponse.json({ success: false, error: "Không thể tạo yêu cầu thanh toán." }, { status: 500 });
  }
}
