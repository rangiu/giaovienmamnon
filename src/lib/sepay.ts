import { SePayPgClient } from "sepay-pg-node";

/**
 * Tích hợp SePay — dùng đúng sản phẩm "Cổng thanh toán" (Payment Gateway)
 * của SePay qua SDK chính thức `sepay-pg-node`, KHÔNG tự vẽ ảnh VietQR và
 * dựa vào webhook "đồng bộ ngân hàng chung" (Bank Hub) như bản cũ.
 *
 * LÝ DO ĐỔI: bản cũ tự tạo ảnh QR bằng vietqr.app rồi hy vọng SePay tự
 * nhận diện giao dịch vào tài khoản ngân hàng và bắn webhook — nhưng tài
 * khoản merchant thực tế của dự án KHÔNG có kiểu webhook "Bank Hub" đó
 * chạy được: tiền vào tài khoản thật (SePay có ghi nhận ở mục "Giao dịch")
 * nhưng không hề bắn IPN, khiến thanh toán thật không lên gói. Đối chiếu
 * với dự án cũ đã chạy được (dùng đúng SDK `sepay-pg-node`, tạo đơn hàng
 * thật qua API "Cổng thanh toán", chuyển hướng khách sang trang do SePay
 * host) mới xác định đúng nguyên nhân — merchant account này được kích
 * hoạt cho sản phẩm Cổng thanh toán, không phải Bank Hub webhook chung.
 */

function getSepayClient(): SePayPgClient {
  const env = (process.env.SEPAY_ENV as "sandbox" | "production") || "production";
  const merchantId = process.env.SEPAY_MERCHANT_ID || process.env.SEPAY_UNIT_CODE;
  const secretKey = process.env.SEPAY_SECRET_KEY;
  if (!merchantId || !secretKey) {
    throw new Error("Thiếu SEPAY_MERCHANT_ID (hoặc SEPAY_UNIT_CODE) / SEPAY_SECRET_KEY trong .env");
  }
  return new SePayPgClient({ env, merchant_id: merchantId, secret_key: secretKey });
}

export function generatePaymentCode(): string {
  // Tiền tố ngắn để dễ nhận diện, không dấu, không khoảng trắng.
  const random = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `COAI${Date.now().toString(36).toUpperCase()}${random}`;
}

/**
 * Tạo biểu mẫu thanh toán 1 lần (đã ký chữ ký HMAC) + URL trang thanh toán
 * do SePay host — frontend chỉ cần POST form ẩn sang checkoutUrl với các
 * field trả về, KHÔNG tự vẽ QR nữa.
 */
export function buildCheckoutPayment(params: {
  amount: number;
  paymentCode: string;
  userId: string;
  appUrl: string;
  description?: string;
  // Trang quay lại sau khi thanh toán — mặc định "/billing" (gia hạn thuê
  // bao), truyền "/video-credits" khi đây là giao dịch mua tín dụng video.
  returnPath?: string;
}) {
  const client = getSepayClient();
  const { amount, paymentCode, userId, appUrl, description, returnPath = "/billing" } = params;

  const checkoutUrl = client.checkout.initCheckoutUrl();
  const fields = client.checkout.initOneTimePaymentFields({
    operation: "PURCHASE",
    payment_method: "BANK_TRANSFER",
    order_invoice_number: paymentCode,
    order_amount: Math.round(amount),
    currency: "VND",
    order_description: description || `Nang cap goi Co AI - ${paymentCode}`,
    customer_id: userId,
    success_url: `${appUrl}${returnPath}?code=${paymentCode}&result=success`,
    error_url: `${appUrl}${returnPath}?code=${paymentCode}&result=error`,
    cancel_url: `${appUrl}${returnPath}?code=${paymentCode}&result=cancel`,
  });

  return { checkoutUrl, fields };
}

/**
 * Xác thực webhook IPN — SePay hỗ trợ nhiều kiểu Auth Type khác nhau, mỗi
 * kiểu gửi key ở 1 header riêng, KHÔNG dùng chung:
 *   - Auth Type "API Key"    → header Authorization: Apikey <key>
 *   - Auth Type "Secret Key" → header X-Secret-Key: <key> (đang dùng)
 * Kiểm tra cả 2 để không phụ thuộc dashboard đang chọn kiểu nào.
 */
export function verifySepayWebhookAuth(authorizationHeader: string | null, secretKeyHeader: string | null): boolean {
  const expectedKey = process.env.SEPAY_WEBHOOK_API_KEY || process.env.SEPAY_SECRET_KEY;
  if (!expectedKey) return false;

  if (secretKeyHeader && secretKeyHeader.trim() === expectedKey) return true;

  if (authorizationHeader) {
    const token = authorizationHeader.replace(/^Apikey\s+/i, "").replace(/^Bearer\s+/i, "").trim();
    if (token === expectedKey) return true;
  }

  return false;
}

/** Payload IPN của sản phẩm "Cổng thanh toán" SePay (khác Bank Hub webhook cũ). */
export interface SepayIpnPayload {
  notification_type?: "ORDER_PAID" | "TRANSACTION_VOID" | string;
  order?: {
    order_invoice_number?: string;
    order_amount?: number;
    order_status?: string;
  };
  transaction?: {
    id?: string;
    transaction_id?: string;
    transaction_status?: string;
  };
}
