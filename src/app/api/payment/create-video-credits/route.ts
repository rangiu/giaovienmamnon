import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { getVideoCreditPackageById } from "@/lib/videoCredits";
import { generatePaymentCode, buildCheckoutPayment } from "@/lib/sepay";

export const dynamic = "force-dynamic";

// Mô phỏng đúng /api/payment/create — chỉ cần ĐĂNG NHẬP là mua được, không
// yêu cầu Subscription đang active (tín dụng video là sản phẩm tách riêng).
export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ success: false, error: "Chưa đăng nhập." }, { status: 401 });
  }

  try {
    const body = await request.json().catch(() => ({}));
    const packageId = String(body.packageId || "");

    const pkg = await getVideoCreditPackageById(packageId);
    if (!pkg || !pkg.isActive) {
      return NextResponse.json({ success: false, error: "Gói tín dụng không hợp lệ." }, { status: 400 });
    }

    const paymentCode = generatePaymentCode();

    const payment = await prisma.payment.create({
      data: {
        userId: user.id,
        amount: pkg.priceVnd,
        paymentCode,
        status: "PENDING",
        provider: "SEPAY",
        purchaseType: "VIDEO_CREDITS",
        creditPackageId: pkg.id,
        creditsGranted: pkg.credits,
        creditTier: pkg.tier,
        expiresAt: new Date(Date.now() + 30 * 60 * 1000), // 30 phút
      },
    });

    const appUrl = process.env.APP_URL || new URL(request.url).origin;
    const { checkoutUrl, fields } = buildCheckoutPayment({
      amount: pkg.priceVnd,
      paymentCode,
      userId: user.id,
      appUrl,
      description: `Mua ${pkg.name} - SUMFLOW - ${paymentCode}`,
      returnPath: "/video-credits",
    });

    return NextResponse.json({
      success: true,
      payment: {
        id: payment.id,
        amount: payment.amount,
        paymentCode: payment.paymentCode,
        packageId: pkg.id,
        packageName: pkg.name,
        credits: pkg.credits,
        tier: pkg.tier,
        expiresAt: payment.expiresAt,
      },
      checkoutUrl,
      fields,
    });
  } catch (error: any) {
    console.error("POST /api/payment/create-video-credits error:", error);
    return NextResponse.json({ success: false, error: "Không thể tạo yêu cầu thanh toán." }, { status: 500 });
  }
}
