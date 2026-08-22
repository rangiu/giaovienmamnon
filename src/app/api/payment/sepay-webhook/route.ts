import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifySepayWebhookAuth, type SepayIpnPayload } from "@/lib/sepay";
import { sendPaymentConfirmedEmail, sendAdminPurchaseNotification } from "@/lib/email";
import { notifyUser } from "@/lib/notifications";
import { grantVideoCredits, isValidVideoTier, VIDEO_TIER_LABEL } from "@/lib/videoCredits";

export const dynamic = "force-dynamic";

/**
 * Endpoint SePay gọi vào mỗi khi có sự kiện thanh toán (Cổng thanh toán —
 * đăng ký URL này trong SePay dashboard: Cấu hình → IPN).
 *
 * QUAN TRỌNG: luôn trả về HTTP 200 dù xử lý thành công hay thất bại, kể cả
 * lỗi nội bộ — đối chiếu với bản tích hợp SePay đã chạy được thật (tham
 * khảo dự án cũ dùng cùng SDK `sepay-pg-node`), trả 401/500 có thể khiến
 * SePay coi là lỗi phía server và không xử lý đúng như 1 phản hồi hợp lệ.
 * Trạng thái thành công/thất bại nằm trong BODY JSON, không phải status code.
 */
export async function POST(request: Request) {
  try {
    const authHeader = request.headers.get("authorization");
    const secretKeyHeader = request.headers.get("x-secret-key") || request.headers.get("x-sepay-secret-key");

    if (!verifySepayWebhookAuth(authHeader, secretKeyHeader)) {
      console.warn("[SePay IPN] Unauthorized — thiếu/sai header xác thực.");
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 200 });
    }

    let payload: SepayIpnPayload;
    try {
      payload = await request.json();
    } catch {
      return NextResponse.json({ success: false, message: "Invalid JSON" }, { status: 200 });
    }

    console.log("[SePay IPN] Payload:", JSON.stringify(payload));

    if (payload.notification_type !== "ORDER_PAID") {
      return NextResponse.json({ success: true, message: "Event ignored" }, { status: 200 });
    }

    const paymentCode = payload.order?.order_invoice_number;
    if (!paymentCode) {
      return NextResponse.json({ success: false, message: "Missing order_invoice_number" }, { status: 200 });
    }

    const payment = await prisma.payment.findUnique({ where: { paymentCode } });
    if (!payment) {
      console.warn("[SePay IPN] Không tìm thấy Payment với mã:", paymentCode);
      return NextResponse.json({ success: false, message: "Payment not found" }, { status: 200 });
    }

    if (payment.status === "PAID") {
      // Đã xử lý trước đó (SePay có thể gọi lại IPN) — báo thành công, không xử lý lại.
      return NextResponse.json({ success: true, message: "Already processed" }, { status: 200 });
    }

    const paidAmount = Number(payload.order?.order_amount);
    if (!Number.isFinite(paidAmount) || paidAmount < payment.amount) {
      console.warn(`[SePay IPN] Số tiền (${paidAmount}) nhỏ hơn yêu cầu (${payment.amount}) cho mã ${paymentCode}`);
      await prisma.payment.update({ where: { id: payment.id }, data: { rawWebhook: JSON.stringify(payload) } });
      return NextResponse.json({ success: false, message: "Amount mismatch" }, { status: 200 });
    }

    const now = new Date();
    const updatedPayment = await prisma.payment.update({
      where: { id: payment.id },
      data: {
        status: "PAID",
        providerTxnId: payload.transaction?.transaction_id || payload.transaction?.id || "",
        rawWebhook: JSON.stringify(payload),
        paidAt: now,
      },
    });

    if (payment.purchaseType === "VIDEO_CREDITS") {
      // Giao dịch mua GÓI TÍN DỤNG VIDEO — không đụng gì tới Subscription,
      // chỉ cộng số dư tín dụng theo đúng tier/số lượng đã chốt lúc tạo
      // Payment (creditTier/creditsGranted), không phụ thuộc giá gói admin
      // có đổi sau đó.
      const tier = payment.creditTier;
      const credits = payment.creditsGranted ?? 0;
      if (isValidVideoTier(tier) && credits > 0) {
        await grantVideoCredits({ userId: payment.userId, tier, amount: credits, reason: "PURCHASE", paymentId: payment.id });
      } else {
        console.error("[SePay IPN] Payment VIDEO_CREDITS thiếu creditTier/creditsGranted hợp lệ:", payment.id);
      }

      const payer = await prisma.user.findUnique({ where: { id: payment.userId } });
      if (payer && isValidVideoTier(tier)) {
        notifyUser({
          userId: payer.id,
          title: "Nạp token video thành công! 🎬",
          message: `Cô đã được cộng ${credits} token tạo video (${VIDEO_TIER_LABEL[tier]}). Vào Video Studio để bắt đầu tạo video nhé!`,
          type: "CREDITS_PURCHASED",
          link: "/video-studio",
        }).catch((err) => console.error("notifyUser credits purchase failed:", err));
        sendAdminPurchaseNotification({
          buyerEmail: payer.email,
          buyerName: payer.name,
          amount: updatedPayment.amount,
          description: `${credits} token ${VIDEO_TIER_LABEL[tier]}`,
        }).catch((err) => console.error("sendAdminPurchaseNotification (video credits) failed:", err));
      }
    } else {
      // Gia hạn subscription đúng số ngày của GÓI ĐÃ CHỌN lúc tạo giao dịch
      // (ngày/tuần/tháng — chốt sẵn trên Payment.durationDays, không phụ
      // thuộc giá/gói admin có đổi sau đó). Payment cũ trước khi có đa dạng
      // gói không có durationDays thì coi như gói tháng (30 ngày) để tương
      // thích ngược. Tính từ ngày hiện tại hoặc từ ngày hết hạn cũ (nếu vẫn
      // còn hạn) — không bị mất phần thời gian còn lại khi gia hạn sớm.
      const durationDays = payment.durationDays ?? 30;
      const existing = await prisma.subscription.findUnique({ where: { userId: payment.userId } });
      const base = existing?.currentPeriodEnd && existing.currentPeriodEnd > now ? existing.currentPeriodEnd : now;
      const newPeriodEnd = new Date(base.getTime() + durationDays * 24 * 60 * 60 * 1000);

      await prisma.subscription.upsert({
        where: { userId: payment.userId },
        create: {
          userId: payment.userId,
          status: "ACTIVE",
          currentPeriodStart: now,
          currentPeriodEnd: newPeriodEnd,
        },
        update: {
          status: "ACTIVE",
          currentPeriodStart: existing?.currentPeriodStart || now,
          currentPeriodEnd: newPeriodEnd,
        },
      });

      const payer = await prisma.user.findUnique({ where: { id: payment.userId } });
      if (payer) {
        sendPaymentConfirmedEmail(payer.email, payer.name, updatedPayment.amount, newPeriodEnd).catch((err) =>
          console.error("sendPaymentConfirmedEmail failed:", err)
        );
        notifyUser({
          userId: payer.id,
          title: "Thanh toán thành công! 🎉",
          message: `Gói của cô đã được kích hoạt đến hết ngày ${newPeriodEnd.toLocaleDateString("vi-VN")}. Cảm ơn cô đã tin dùng SUMFLOW!`,
          type: "PAYMENT_SUCCESS",
          link: "/billing",
        }).catch((err) => console.error("notifyUser payment success failed:", err));
        sendAdminPurchaseNotification({
          buyerEmail: payer.email,
          buyerName: payer.name,
          amount: updatedPayment.amount,
          description: `Gói thuê bao ${durationDays} ngày`,
        }).catch((err) => console.error("sendAdminPurchaseNotification (subscription) failed:", err));
      }
    }

    console.log("[SePay IPN] Processed payment", paymentCode, paidAmount);
    return NextResponse.json({ success: true, message: "Payment processed" }, { status: 200 });
  } catch (error: any) {
    // Luôn trả 200 kể cả lỗi nội bộ — tránh SePay hiểu nhầm là endpoint lỗi.
    console.error("[SePay IPN] Critical error:", error?.message);
    return NextResponse.json({ success: false, message: "Internal error" }, { status: 200 });
  }
}
