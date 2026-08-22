/**
 * Gửi email transactional qua Brevo (trước đây là Sendinblue) bằng REST API
 * thuần (không cần cài SDK riêng). Nếu chưa cấu hình BREVO_API_KEY thì các
 * hàm gửi email sẽ tự bỏ qua (log cảnh báo) thay vì làm crash luồng chính
 * (VD: đăng ký tài khoản vẫn phải thành công dù gửi mail chào mừng thất bại).
 */

const BREVO_API_URL = "https://api.brevo.com/v3/smtp/email";
// Domain THẬT phục vụ ảnh tĩnh (public/logo.png) — email client (Gmail...)
// tải ảnh qua URL tuyệt đối, không nhúng base64 được (nhiều nơi chặn).
const LOGO_URL = "https://sumflow.online/logo.png";

/**
 * Bọc phần nội dung riêng của mỗi email bằng 1 khối đầu trang CHUNG có logo
 * SUMFLOW — trước đây MỌI email gửi đi đều không có logo/nhận diện thương
 * hiệu nào cả, chỉ có chữ. Dùng chung 1 hàm để đổi logo/bố cục đầu trang chỉ
 * cần sửa 1 chỗ, không phải sửa lại từng template.
 */
function wrapEmailContent(bodyHtml: string): string {
  return `
    <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
      <div style="text-align: center; padding-bottom: 18px; margin-bottom: 18px; border-bottom: 2px solid #d1fae5;">
        <img src="${LOGO_URL}" alt="SUMFLOW" width="48" height="48" style="display: inline-block; border-radius: 12px;" />
        <p style="margin: 8px 0 0; font-weight: 800; font-size: 15px; color: #047857;">SUMFLOW</p>
      </div>
      ${bodyHtml}
    </div>
  `;
}

interface SendEmailParams {
  to: { email: string; name?: string };
  subject: string;
  htmlContent: string;
}

function getBrevoConfig() {
  const apiKey = process.env.BREVO_API_KEY;
  const senderEmail = process.env.BREVO_SENDER_EMAIL;
  const senderName = process.env.BREVO_SENDER_NAME || "SUMFLOW";
  if (!apiKey || !senderEmail) return null;
  return { apiKey, senderEmail, senderName };
}

export async function sendEmail({ to, subject, htmlContent }: SendEmailParams): Promise<{ success: boolean; error?: string }> {
  const config = getBrevoConfig();
  if (!config) {
    console.warn("[Brevo] Chưa cấu hình BREVO_API_KEY/BREVO_SENDER_EMAIL — bỏ qua gửi email:", subject);
    return { success: false, error: "MISSING_BREVO_CONFIG" };
  }

  try {
    const res = await fetch(BREVO_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        "api-key": config.apiKey,
      },
      body: JSON.stringify({
        sender: { email: config.senderEmail, name: config.senderName },
        to: [to],
        subject,
        htmlContent,
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error("[Brevo] Gửi email thất bại:", res.status, errText);
      return { success: false, error: errText };
    }
    return { success: true };
  } catch (err: any) {
    console.error("[Brevo] Lỗi khi gọi API:", err);
    return { success: false, error: err?.message };
  }
}

/**
 * Email chào mừng sau khi đăng ký — CHỈ mang tính thông báo, không yêu cầu
 * bấm link hay xác minh gì cả. Giáo viên tạo tài khoản xong là vào dùng
 * được ngay lập tức (tối giản hết mức vì đa phần giáo viên mầm non ít
 * rành công nghệ, không nên bắt họ phải qua thêm bước kiểm tra Gmail).
 */
export async function sendWelcomeEmail(toEmail: string, toName: string) {
  return sendEmail({
    to: { email: toEmail, name: toName },
    subject: "Chào mừng đến với SUMFLOW 🎉",
    htmlContent: wrapEmailContent(`
        <h2>Xin chào ${toName}!</h2>
        <p>Cô đã tạo tài khoản <strong>SUMFLOW</strong> — trợ lý AI dành cho giáo viên mầm non — thành công rồi ạ! 🎉</p>
        <p>Cô có thể đăng nhập và dùng ngay tính năng Chat cơ bản miễn phí. Muốn mở khoá toàn bộ tính năng (soạn giáo án, đánh giá trẻ, sổ chủ đề...), cô nâng cấp gói tháng trong mục "Gói sử dụng & Thanh toán" bất cứ lúc nào nhé.</p>
        <p>Trân trọng,<br/>Đội ngũ SUMFLOW</p>
    `),
  });
}

/**
 * Email admin tự soạn gửi trực tiếp cho 1 tài khoản từ trang Quản lý tài
 * khoản (VD: nhắc gia hạn, hỗ trợ riêng...). `message` là văn bản thuần cô
 * admin gõ — giữ nguyên xuống dòng khi hiển thị bằng white-space: pre-wrap.
 */
export async function sendAdminCustomEmail(toEmail: string, toName: string, subject: string, message: string) {
  const escapedMessage = message
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
  return sendEmail({
    to: { email: toEmail, name: toName },
    subject,
    htmlContent: wrapEmailContent(`
        <p style="white-space: pre-wrap;">${escapedMessage}</p>
        <p style="margin-top: 24px;">Trân trọng,<br/>Đội ngũ SUMFLOW</p>
    `),
  });
}

// Email nội bộ báo cho admin biết MỖI KHI có giao dịch thanh toán thành công
// (gói thuê bao HOẶC gói tín dụng video) — gửi tới hộp thư quản trị cố định,
// KHÔNG phải email của người mua (khác hẳn sendPaymentConfirmedEmail ở
// trên). Gọi song song, không chặn luồng webhook nếu gửi lỗi.
const ADMIN_NOTIFY_EMAIL = "coai.sumflow@gmail.com";

export async function sendAdminPurchaseNotification(params: {
  buyerEmail: string;
  buyerName: string;
  amount: number;
  description: string; // VD "Gói tháng (30 ngày)" hoặc "10 lượt Hybrid"
}) {
  const { buyerEmail, buyerName, amount, description } = params;
  const amountFormatted = amount.toLocaleString("vi-VN");
  return sendEmail({
    to: { email: ADMIN_NOTIFY_EMAIL, name: "SUMFLOW Admin" },
    subject: `💰 Có đơn thanh toán mới — ${amountFormatted}đ`,
    htmlContent: wrapEmailContent(`
        <h2>Đơn thanh toán mới</h2>
        <p><strong>${buyerName}</strong> (${buyerEmail}) vừa thanh toán thành công.</p>
        <p>Nội dung: <strong>${description}</strong></p>
        <p>Số tiền: <strong>${amountFormatted}đ</strong></p>
    `),
  });
}

/** Email mã OTP đặt lại mật khẩu (quên mật khẩu) — mã gốc CHỈ nằm trong email này, server chỉ lưu hash. */
export async function sendPasswordResetOtpEmail(toEmail: string, toName: string, otp: string) {
  return sendEmail({
    to: { email: toEmail, name: toName },
    subject: `${otp} là mã đặt lại mật khẩu SUMFLOW`,
    htmlContent: wrapEmailContent(`
        <h2>Đặt lại mật khẩu</h2>
        <p>Cô ${toName} vừa yêu cầu đặt lại mật khẩu SUMFLOW. Nhập mã dưới đây để tiếp tục:</p>
        <p style="text-align: center; margin: 24px 0;">
          <span style="display: inline-block; font-size: 32px; font-weight: 800; letter-spacing: 8px; color: #047857; background: #ecfdf5; padding: 12px 24px; border-radius: 12px;">${otp}</span>
        </p>
        <p style="color: #64748b; font-size: 13px;">Mã có hiệu lực trong <strong>10 phút</strong>. Nếu cô không yêu cầu đặt lại mật khẩu, cô bỏ qua email này — mật khẩu hiện tại vẫn an toàn, không ai đổi được nếu không có mã này.</p>
        <p>Trân trọng,<br/>Đội ngũ SUMFLOW</p>
    `),
  });
}

export async function sendPaymentConfirmedEmail(toEmail: string, toName: string, amount: number, periodEnd: Date) {
  const amountFormatted = amount.toLocaleString("vi-VN");
  const periodEndFormatted = periodEnd.toLocaleDateString("vi-VN");
  return sendEmail({
    to: { email: toEmail, name: toName },
    subject: "Xác nhận thanh toán thành công — SUMFLOW",
    htmlContent: wrapEmailContent(`
        <h2>Thanh toán thành công!</h2>
        <p>Cô ${toName} đã thanh toán <strong>${amountFormatted}đ</strong> thành công.</p>
        <p>Gói sử dụng của cô đã được gia hạn đến ngày <strong>${periodEndFormatted}</strong>.</p>
        <p>Trân trọng,<br/>Đội ngũ SUMFLOW</p>
    `),
  });
}
