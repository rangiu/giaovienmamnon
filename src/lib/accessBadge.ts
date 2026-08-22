/**
 * Nhãn trạng thái gói sử dụng hiển thị cạnh tên tài khoản (Navbar/Sidebar) —
 * dùng chung 1 chỗ để Navbar và Sidebar luôn hiển thị đồng nhất.
 */
export interface AccessBadgeInput {
  access: { tier: string; reason: string } | null;
  subscription: { trialEndsAt: string | null; currentPeriodEnd: string | null } | null;
}

export interface AccessBadge {
  label: string;
  className: string;
}

function daysLeft(dateStr: string | null): number | null {
  if (!dateStr) return null;
  const diffMs = new Date(dateStr).getTime() - Date.now();
  return Math.max(0, Math.ceil(diffMs / (24 * 60 * 60 * 1000)));
}

export function getAccessBadge({ access, subscription }: AccessBadgeInput): AccessBadge {
  if (!access) return { label: "", className: "" };

  switch (access.reason) {
    case "ADMIN":
      return { label: "👑 Admin", className: "bg-amber-100 text-amber-800 border border-amber-200" };
    case "ACTIVE": {
      const left = daysLeft(subscription?.currentPeriodEnd || null);
      return {
        label: left !== null ? `💎 Trả phí • còn ${left} ngày` : "💎 Trả phí",
        className: "bg-emerald-100 text-emerald-800 border border-emerald-200",
      };
    }
    case "TRIALING": {
      const left = daysLeft(subscription?.trialEndsAt || null);
      return {
        label: left !== null ? `🎁 Dùng thử • còn ${left} ngày` : "🎁 Dùng thử",
        className: "bg-sky-100 text-sky-800 border border-sky-200",
      };
    }
    case "EXPIRED":
      return { label: "⏰ Đã hết hạn", className: "bg-rose-100 text-rose-800 border border-rose-200" };
    case "FREE":
      return { label: "🆓 Miễn phí", className: "bg-slate-100 text-slate-600 border border-slate-200" };
    case "PENDING":
      return { label: "✉️ Chưa xác minh", className: "bg-slate-100 text-slate-500 border border-slate-200" };
    default:
      return { label: "", className: "" };
  }
}
