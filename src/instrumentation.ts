/**
 * Hook khởi động server Next.js (chạy ĐÚNG 1 LẦN khi process "node server.js"
 * bắt đầu, KHÔNG phụ thuộc route nào được gọi trước) — chỗ ĐÚNG ĐẮN để khởi
 * động poller video thay vì rải rác gọi startVideoJobPoller() ở đầu từng
 * route và hy vọng ĐÚNG route đó được gọi trước.
 *
 * Bug thật đã gặp: trước đây CHỈ có POST /api/video-jobs gọi
 * startVideoJobPoller() — cờ đăng ký (globalThis.__videoPollerStarted)
 * sống trong RAM, mất sạch mỗi khi container restart (VD lúc deploy bản vá
 * khác). Nếu sau restart KHÔNG có ai submit job MỚI (chỉ có job cũ đang dở
 * dang PENDING/RENDERING từ trước lúc restart) mà chỉ mở trang Kho Video
 * (GET), poller không bao giờ được khởi động lại trong process mới — job
 * cũ kẹt VĨNH VIỄN dù khoá xử lý đã trống, y hệt sự cố thật đã gặp: 1 video
 * thật của giáo viên bị kẹt ở "Đang dựng video" hàng chục phút sau khi
 * container restart để deploy 1 bản vá KHÔNG LIÊN QUAN, mà không có tín
 * hiệu lỗi nào để biết. Đăng ký ở đây đảm bảo poller LUÔN sống ngay khi
 * server khởi động, không phụ thuộc route nào được gọi trước — vẫn giữ lại
 * lời gọi ở GET/POST video-jobs làm lớp an toàn thứ 2 (hàm này idempotent,
 * gọi nhiều lần không sao).
 *
 * VỊ TRÍ FILE: bắt buộc nằm trong src/ (KHÔNG phải project root) — repo này
 * dùng cấu trúc "src/ directory" (src/app, src/lib, ...), Next.js chỉ nhận
 * diện instrumentation.ts ở gốc thư mục src/ trong trường hợp đó. Bug thật
 * đã gặp thêm 1 lớp nữa: bản đầu đặt nhầm ở project root nên hook NÀY chưa
 * từng thực sự chạy — chỉ được "cứu" nhờ lớp an toàn thứ 2 (GET/POST) tình
 * cờ luôn có request tới sớm sau mỗi lần restart trong thực tế.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { startVideoJobPoller } = await import("./lib/media/videoProcessor");
    startVideoJobPoller();
  }
}
