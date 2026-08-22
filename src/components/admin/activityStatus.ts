/**
 * Suy ra "trạng thái hoạt động" hiển thị ở trang Quản trị từ mốc thời gian
 * hoạt động gần nhất (lastActiveAt = mốc mới nhất giữa lần đăng nhập / dùng
 * AI / thanh toán — tính ở backend). Cố tình KHÔNG suy đoán "đang online"
 * (session sống tới 30 ngày dù không mở web nữa) — chỉ báo đúng khoảng thời
 * gian đã trôi qua kể từ hành động thật gần nhất, tránh gây hiểu lầm.
 */
export interface ActivityStatusInfo {
  label: string;
  className: string;
  dotClassName: string;
}

const THIRTY_MIN_MS = 30 * 60 * 1000;
const ONE_DAY_MS = 24 * 60 * 60 * 1000;
const SEVEN_DAYS_MS = 7 * ONE_DAY_MS;

export function getActivityStatus(lastActiveAt: string | null): ActivityStatusInfo {
  if (!lastActiveAt) {
    return {
      label: "Chưa từng hoạt động",
      className: "bg-slate-100 text-slate-400",
      dotClassName: "bg-slate-300",
    };
  }

  const diff = Date.now() - new Date(lastActiveAt).getTime();

  if (diff < THIRTY_MIN_MS) {
    return {
      label: "Đang hoạt động",
      className: "bg-emerald-100 text-emerald-700",
      dotClassName: "bg-emerald-500 animate-pulse",
    };
  }
  if (diff < ONE_DAY_MS) {
    return {
      label: "Hoạt động hôm nay",
      className: "bg-emerald-50 text-emerald-700",
      dotClassName: "bg-emerald-400",
    };
  }
  if (diff < SEVEN_DAYS_MS) {
    return {
      label: "Hoạt động tuần này",
      className: "bg-sky-50 text-sky-700",
      dotClassName: "bg-sky-400",
    };
  }
  return {
    label: "Không hoạt động",
    className: "bg-slate-100 text-slate-500",
    dotClassName: "bg-slate-300",
  };
}

/** Chuỗi hiển thị "Lần cuối: ..." — dùng kèm badge khi cần chi tiết hơn. */
export function formatLastActive(lastActiveAt: string | null): string {
  if (!lastActiveAt) return "Chưa có hoạt động nào";
  return new Date(lastActiveAt).toLocaleString("vi-VN");
}
