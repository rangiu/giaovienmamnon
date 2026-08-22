"use client";

import React, { useEffect, useMemo, useState } from "react";
import { ShieldCheck, Users, Settings2, Save, Gift, Zap, RefreshCw, Lock, Unlock, Eye, Search, Filter, Phone, Megaphone, Bell, Send } from "lucide-react";
import { UserDetailModal } from "./UserDetailModal";
import { getActivityStatus } from "./activityStatus";
import { AutoGrowTextarea } from "@/components/ui/AutoGrowTextarea";
import { VideoCreditPackagesPanel } from "./VideoCreditPackagesPanel";
import { BlogAdminPanel } from "./BlogAdminPanel";
import { TemplateModerationPanel } from "./TemplateModerationPanel";

interface Subscription {
  status: string;
  trialEndsAt: string | null;
  currentPeriodEnd: string | null;
}

interface AdminUser {
  id: string;
  email: string;
  name: string;
  role: string;
  createdAt: string;
  isLocked: boolean;
  schoolName: string | null;
  phone: string | null;
  subscription: Subscription | null;
  lastActiveAt: string | null;
}

const ACTIVITY_FILTER_OPTIONS = [
  { value: "ALL", label: "Tất cả hoạt động" },
  { value: "ACTIVE", label: "Đang hoạt động" },
  { value: "TODAY", label: "Hoạt động hôm nay" },
  { value: "WEEK", label: "Hoạt động tuần này" },
  { value: "INACTIVE", label: "Không hoạt động" },
  { value: "NEVER", label: "Chưa từng hoạt động" },
];

/** So khớp bộ lọc "trạng thái hoạt động" với nhãn thực tế đang hiển thị (activityStatus.ts) — tránh 2 nơi định nghĩa lệch nhau. */
function matchesActivityFilter(lastActiveAt: string | null, filter: string): boolean {
  if (filter === "ALL") return true;
  const label = getActivityStatus(lastActiveAt).label;
  const map: Record<string, string> = {
    ACTIVE: "Đang hoạt động",
    TODAY: "Hoạt động hôm nay",
    WEEK: "Hoạt động tuần này",
    INACTIVE: "Không hoạt động",
    NEVER: "Chưa từng hoạt động",
  };
  return label === map[filter];
}

/** Ngày hết hạn hiển thị: ưu tiên hạn trả phí, không có thì hạn dùng thử. */
function expiryLabel(sub: Subscription | null): string | null {
  const date = sub?.currentPeriodEnd || sub?.trialEndsAt;
  if (!date) return null;
  return new Date(date).toLocaleDateString("vi-VN");
}

const STATUS_LABEL: Record<string, { label: string; className: string }> = {
  PENDING: { label: "Chưa xác minh email", className: "bg-slate-100 text-slate-600" },
  FREE: { label: "Miễn phí (Chat giới hạn)", className: "bg-amber-100 text-amber-700" },
  TRIALING: { label: "Đang dùng thử (tặng)", className: "bg-sky-100 text-sky-700" },
  ACTIVE: { label: "Đang trả phí", className: "bg-emerald-100 text-emerald-700" },
  EXPIRED: { label: "Đã hết hạn (về Miễn phí)", className: "bg-rose-100 text-rose-700" },
  CANCELLED: { label: "Đã huỷ", className: "bg-slate-100 text-slate-500" },
};

export function AdminDashboard() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [dailyPrice, setDailyPrice] = useState<number>(5000);
  const [weeklyPrice, setWeeklyPrice] = useState<number>(25000);
  const [monthlyPrice, setMonthlyPrice] = useState<number>(99000);
  const [offlinePrice, setOfflinePrice] = useState<number>(1990000);
  const [freeChatLimit, setFreeChatLimit] = useState<number>(3);
  const [savingPrice, setSavingPrice] = useState(false);
  const [grantingId, setGrantingId] = useState<string | null>(null);
  const [lockingId, setLockingId] = useState<string | null>(null);
  const [detailUserId, setDetailUserId] = useState<string | null>(null);

  // Banner thông báo khẩn chạy ngang đầu trang
  const [bannerEnabled, setBannerEnabled] = useState(false);
  const [bannerMessage, setBannerMessage] = useState("");
  const [bannerLink, setBannerLink] = useState("");
  const [bannerStyle, setBannerStyle] = useState<"info" | "urgent" | "promo">("info");
  const [savingBanner, setSavingBanner] = useState(false);

  // Soạn & gửi thông báo chuông (+ email tuỳ chọn) — trước đây chỉ chọn được
  // ĐÚNG 1 người nhận qua 1 dropdown liệt kê hết mọi tài khoản, danh sách
  // dài không tìm ra ai. Giờ: "ALL" (mọi tài khoản) hoặc chọn NHIỀU người
  // qua ô tìm kiếm + danh sách checkbox lọc theo tên/email.
  const [notifyTitle, setNotifyTitle] = useState("");
  const [notifyMessage, setNotifyMessage] = useState("");
  const [notifyLink, setNotifyLink] = useState("");
  const [notifyTargetMode, setNotifyTargetMode] = useState<"ALL" | "SELECTED">("ALL");
  const [selectedRecipientIds, setSelectedRecipientIds] = useState<string[]>([]);
  const [recipientSearch, setRecipientSearch] = useState("");
  const [notifySendEmail, setNotifySendEmail] = useState(false);
  const [sendingNotify, setSendingNotify] = useState(false);
  const [notifyResult, setNotifyResult] = useState<{ ok: boolean; message: string } | null>(null);

  // Bộ lọc danh sách tài khoản
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [lockFilter, setLockFilter] = useState("ALL");
  const [activityFilter, setActivityFilter] = useState("ALL");

  const loadUsers = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/users");
      const data = await res.json();
      if (data.success) setUsers(data.users);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
    fetch("/api/admin/settings")
      .then((r) => r.json())
      .then((data) => {
        if (data.success) {
          const plans: { code: string; priceVnd: number }[] = data.settings.plans || [];
          setDailyPrice(plans.find((p) => p.code === "DAILY")?.priceVnd ?? 5000);
          setWeeklyPrice(plans.find((p) => p.code === "WEEKLY")?.priceVnd ?? 25000);
          setMonthlyPrice(plans.find((p) => p.code === "MONTHLY")?.priceVnd ?? data.settings.monthlyPriceVnd ?? 99000);
          setOfflinePrice(data.settings.offlinePriceVnd ?? 1990000);
          setFreeChatLimit(data.settings.freeChatLimitPerDay ?? 3);
          if (data.settings.banner) {
            setBannerEnabled(Boolean(data.settings.banner.enabled));
            setBannerMessage(data.settings.banner.message || "");
            setBannerLink(data.settings.banner.link || "");
            setBannerStyle(data.settings.banner.style || "info");
          }
        }
      });
  }, []);

  const saveBanner = async () => {
    setSavingBanner(true);
    try {
      await fetch("/api/admin/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          banner: { enabled: bannerEnabled, message: bannerMessage, link: bannerLink, style: bannerStyle },
        }),
      });
    } finally {
      setSavingBanner(false);
    }
  };

  const sendNotification = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!notifyTitle.trim() || !notifyMessage.trim()) return;
    if (notifyTargetMode === "SELECTED" && selectedRecipientIds.length === 0) {
      setNotifyResult({ ok: false, message: "Cô chưa chọn tài khoản nào để gửi." });
      return;
    }
    setSendingNotify(true);
    setNotifyResult(null);
    try {
      const res = await fetch("/api/notifications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: notifyTitle,
          message: notifyMessage,
          target: notifyTargetMode === "ALL" ? "ALL" : selectedRecipientIds,
          link: notifyLink || undefined,
          sendEmail: notifySendEmail,
        }),
      });
      const data = await res.json();
      if (data.success) {
        const countLabel = notifyTargetMode === "ALL" ? "tất cả tài khoản" : `${data.recipientCount ?? selectedRecipientIds.length} tài khoản đã chọn`;
        setNotifyResult({
          ok: true,
          message: `Đã gửi thông báo${notifySendEmail ? " + email" : ""} cho ${countLabel}!`,
        });
        setNotifyTitle("");
        setNotifyMessage("");
        setNotifyLink("");
        setSelectedRecipientIds([]);
        setRecipientSearch("");
      } else {
        setNotifyResult({ ok: false, message: data.error || "Không thể gửi thông báo." });
      }
    } catch {
      setNotifyResult({ ok: false, message: "Lỗi kết nối." });
    } finally {
      setSendingNotify(false);
    }
  };

  const savePrice = async () => {
    setSavingPrice(true);
    try {
      await fetch("/api/admin/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          dailyPriceVnd: dailyPrice,
          weeklyPriceVnd: weeklyPrice,
          monthlyPriceVnd: monthlyPrice,
          offlinePriceVnd: offlinePrice,
          freeChatLimitPerDay: freeChatLimit,
        }),
      });
    } finally {
      setSavingPrice(false);
    }
  };

  const grant = async (userId: string, type: "TRIAL" | "ACTIVE", days: number) => {
    setGrantingId(userId);
    try {
      await fetch(`/api/admin/users/${userId}/grant`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, days }),
      });
      await loadUsers();
    } finally {
      setGrantingId(null);
    }
  };

  const toggleLock = async (userId: string, locked: boolean) => {
    setLockingId(userId);
    try {
      await fetch(`/api/admin/users/${userId}/lock`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ locked }),
      });
      await loadUsers();
    } finally {
      setLockingId(null);
    }
  };

  const filteredUsers = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    return users.filter((u) => {
      if (term) {
        const haystack = `${u.name} ${u.email} ${u.phone || ""}`.toLowerCase();
        if (!haystack.includes(term)) return false;
      }
      if (statusFilter !== "ALL") {
        const status = u.subscription?.status || "NO_SUB";
        if (status !== statusFilter) return false;
      }
      if (lockFilter === "LOCKED" && !u.isLocked) return false;
      if (lockFilter === "UNLOCKED" && u.isLocked) return false;
      if (!matchesActivityFilter(u.lastActiveAt, activityFilter)) return false;
      return true;
    });
  }, [users, searchTerm, statusFilter, lockFilter, activityFilter]);

  return (
    <div className="space-y-6 pb-12">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center">
          <ShieldCheck className="w-5 h-5" />
        </div>
        <div>
          <h1 className="text-lg font-black text-slate-900">Quản trị hệ thống</h1>
          <p className="text-xs text-slate-500">Quản lý tài khoản, cấp quyền dùng thử/kích hoạt, chỉnh giá gói</p>
        </div>
      </div>

      {/* Pricing config */}
      <div className="bg-white rounded-3xl border border-emerald-100 shadow-sm p-6 space-y-4">
        <div className="flex items-center gap-2 font-bold text-slate-800 text-sm">
          <Settings2 className="w-4 h-4 text-emerald-600" />
          Giá các gói
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1">Gói theo ngày (VNĐ)</label>
            <input
              type="number"
              value={dailyPrice}
              onChange={(e) => setDailyPrice(Number(e.target.value))}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-300"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1">Gói theo tuần (VNĐ)</label>
            <input
              type="number"
              value={weeklyPrice}
              onChange={(e) => setWeeklyPrice(Number(e.target.value))}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-300"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1">Gói theo tháng (VNĐ)</label>
            <input
              type="number"
              value={monthlyPrice}
              onChange={(e) => setMonthlyPrice(Number(e.target.value))}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-300"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1">Offline vĩnh viễn (VNĐ, tham khảo)</label>
            <input
              type="number"
              value={offlinePrice}
              onChange={(e) => setOfflinePrice(Number(e.target.value))}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-300"
            />
          </div>
        </div>

        <div className="pt-2 border-t border-slate-100">
          <label className="block text-xs font-bold text-slate-600 mb-1">
            Giới hạn Chat cho tài khoản Miễn phí (lượt / ngày)
          </label>
          <input
            type="number"
            min={0}
            value={freeChatLimit}
            onChange={(e) => setFreeChatLimit(Number(e.target.value))}
            className="w-40 px-3 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-300"
          />
          <p className="text-[11px] text-slate-400 mt-1">
            Tài khoản chưa trả phí (Miễn phí/Hết hạn) chỉ chat được tối đa số lượt này trong mỗi ngày.
          </p>
        </div>

        <button
          onClick={savePrice}
          disabled={savingPrice}
          className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-4 py-2 rounded-xl transition-colors disabled:opacity-60"
        >
          <Save className="w-3.5 h-3.5" />
          {savingPrice ? "Đang lưu..." : "Lưu cài đặt"}
        </button>
      </div>

      {/* Banner khẩn chạy ngang đầu trang */}
      <div className="bg-white rounded-3xl border border-emerald-100 shadow-sm p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 font-bold text-slate-800 text-sm">
            <Megaphone className="w-4 h-4 text-emerald-600" />
            Banner thông báo khẩn (chạy ngang đầu trang)
          </div>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={bannerEnabled}
              onChange={(e) => setBannerEnabled(e.target.checked)}
              className="w-4 h-4 accent-emerald-600"
            />
            <span className="text-xs font-bold text-slate-600">{bannerEnabled ? "Đang bật" : "Đang tắt"}</span>
          </label>
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-600 mb-1">Nội dung banner</label>
          <AutoGrowTextarea
            minRows={2}
            value={bannerMessage}
            onChange={(e) => setBannerMessage(e.target.value)}
            placeholder="Ví dụ: 🎉 Ưu đãi Tết — Giảm 50% tất cả các gói từ nay đến hết 20/01!"
            className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-300"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1">Link khi bấm vào (không bắt buộc)</label>
            <input
              type="text"
              value={bannerLink}
              onChange={(e) => setBannerLink(e.target.value)}
              placeholder="/billing"
              className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-300"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1">Màu sắc</label>
            <select
              value={bannerStyle}
              onChange={(e) => setBannerStyle(e.target.value as "info" | "urgent" | "promo")}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-emerald-300"
            >
              <option value="info">🔵 Thông tin (xanh dương)</option>
              <option value="urgent">🔴 Khẩn cấp (đỏ)</option>
              <option value="promo">🟠 Khuyến mãi (cam)</option>
            </select>
          </div>
        </div>

        <button
          onClick={saveBanner}
          disabled={savingBanner}
          className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-4 py-2 rounded-xl transition-colors disabled:opacity-60"
        >
          <Save className="w-3.5 h-3.5" />
          {savingBanner ? "Đang lưu..." : "Lưu banner"}
        </button>
      </div>

      {/* Quản lý Kho Mẫu Giáo Án & Kiểm Duyệt */}
      <TemplateModerationPanel />

      {/* Gói tín dụng tạo video (bán riêng) */}
      <VideoCreditPackagesPanel />

      {/* Blog — bài viết ở trang giới thiệu */}
      <BlogAdminPanel />

      {/* Soạn & gửi thông báo chuông */}
      <div className="bg-white rounded-3xl border border-emerald-100 shadow-sm p-6 space-y-4">
        <div className="flex items-center gap-2 font-bold text-slate-800 text-sm">
          <Bell className="w-4 h-4 text-emerald-600" />
          Gửi thông báo (chuông) cho người dùng
        </div>

        <form onSubmit={sendNotification} className="space-y-3">
          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1.5">Đối tượng nhận</label>
            <div className="flex gap-2 mb-2">
              <button
                type="button"
                onClick={() => setNotifyTargetMode("ALL")}
                className={`flex-1 text-xs font-bold py-2 rounded-xl border-2 transition-colors ${
                  notifyTargetMode === "ALL"
                    ? "border-emerald-500 bg-emerald-50 text-emerald-800"
                    : "border-slate-200 text-slate-500 hover:border-emerald-300"
                }`}
              >
                📢 Tất cả tài khoản
              </button>
              <button
                type="button"
                onClick={() => setNotifyTargetMode("SELECTED")}
                className={`flex-1 text-xs font-bold py-2 rounded-xl border-2 transition-colors ${
                  notifyTargetMode === "SELECTED"
                    ? "border-emerald-500 bg-emerald-50 text-emerald-800"
                    : "border-slate-200 text-slate-500 hover:border-emerald-300"
                }`}
              >
                🔍 Chọn tài khoản ({selectedRecipientIds.length})
              </button>
            </div>

            {notifyTargetMode === "SELECTED" && (
              <div className="border border-slate-200 rounded-xl p-2.5 space-y-2 bg-slate-50/60">
                <input
                  type="text"
                  value={recipientSearch}
                  onChange={(e) => setRecipientSearch(e.target.value)}
                  placeholder="Tìm theo tên hoặc email..."
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-emerald-300"
                />
                <div className="max-h-48 overflow-y-auto space-y-0.5 pr-1">
                  {users
                    .filter((u) => u.role !== "admin")
                    .filter((u) => {
                      const q = recipientSearch.trim().toLowerCase();
                      if (!q) return true;
                      return u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q);
                    })
                    .map((u) => {
                      const checked = selectedRecipientIds.includes(u.id);
                      return (
                        <label
                          key={u.id}
                          className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs cursor-pointer ${
                            checked ? "bg-emerald-100" : "hover:bg-white"
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={(e) => {
                              setSelectedRecipientIds((prev) =>
                                e.target.checked ? [...prev, u.id] : prev.filter((id) => id !== u.id)
                              );
                            }}
                            className="accent-emerald-600"
                          />
                          <span className="font-bold text-slate-700 truncate">{u.name}</span>
                          <span className="text-slate-400 truncate">({u.email})</span>
                        </label>
                      );
                    })}
                </div>
                {selectedRecipientIds.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setSelectedRecipientIds([])}
                    className="text-[11px] font-bold text-rose-600 hover:underline"
                  >
                    Bỏ chọn tất cả ({selectedRecipientIds.length})
                  </button>
                )}
              </div>
            )}
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1">Tiêu đề</label>
            <input
              type="text"
              required
              value={notifyTitle}
              onChange={(e) => setNotifyTitle(e.target.value)}
              placeholder="Ví dụ: Bảo trì hệ thống"
              className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-300"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1">Nội dung</label>
            <AutoGrowTextarea
              minRows={3}
              required
              value={notifyMessage}
              onChange={(e) => setNotifyMessage(e.target.value)}
              placeholder="Nội dung chi tiết gửi tới cô giáo..."
              className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-300"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1">Link khi bấm vào (không bắt buộc)</label>
            <input
              type="text"
              value={notifyLink}
              onChange={(e) => setNotifyLink(e.target.value)}
              placeholder="/billing"
              className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-300"
            />
          </div>

          <label className="flex items-center gap-2 text-xs font-bold text-slate-600 cursor-pointer">
            <input
              type="checkbox"
              checked={notifySendEmail}
              onChange={(e) => setNotifySendEmail(e.target.checked)}
              className="accent-emerald-600"
            />
            Đồng thời gửi qua email (ngoài thông báo chuông trong app)
          </label>

          {notifyResult && (
            <p className={`text-xs font-semibold rounded-xl px-3 py-2 border ${notifyResult.ok ? "text-emerald-700 bg-emerald-50 border-emerald-200" : "text-rose-600 bg-rose-50 border-rose-200"}`}>
              {notifyResult.message}
            </p>
          )}

          <button
            type="submit"
            disabled={sendingNotify}
            className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-4 py-2 rounded-xl transition-colors disabled:opacity-60"
          >
            <Send className="w-3.5 h-3.5" />
            {sendingNotify ? "Đang gửi..." : "Gửi thông báo"}
          </button>
        </form>
      </div>

      {/* User list */}
      <div className="bg-white rounded-3xl border border-emerald-100 shadow-sm p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 font-bold text-slate-800 text-sm">
            <Users className="w-4 h-4 text-emerald-600" />
            Danh sách tài khoản ({filteredUsers.length}/{users.length})
          </div>
          <button onClick={loadUsers} className="text-slate-400 hover:text-emerald-600">
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>

        {/* Bộ lọc */}
        <div className="flex flex-col sm:flex-row flex-wrap items-stretch sm:items-center gap-2 bg-slate-50 border border-slate-200 rounded-2xl p-3">
          <div className="relative flex-1 min-w-[180px]">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Tìm tên, email, SĐT..."
              className="w-full pl-8 pr-3 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-300"
            />
          </div>
          <div className="flex items-center gap-1.5 text-slate-400 shrink-0">
            <Filter className="w-3.5 h-3.5" />
            <span className="text-[10px] font-bold uppercase tracking-wide">Lọc:</span>
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="text-xs font-semibold bg-white border border-slate-200 rounded-xl px-2.5 py-2"
          >
            <option value="ALL">Mọi trạng thái gói</option>
            {Object.entries(STATUS_LABEL).map(([code, info]) => (
              <option key={code} value={code}>{info.label}</option>
            ))}
            <option value="NO_SUB">Chưa có gói</option>
          </select>
          <select
            value={lockFilter}
            onChange={(e) => setLockFilter(e.target.value)}
            className="text-xs font-semibold bg-white border border-slate-200 rounded-xl px-2.5 py-2"
          >
            <option value="ALL">Mọi trạng thái khoá</option>
            <option value="LOCKED">Đã khoá</option>
            <option value="UNLOCKED">Chưa khoá</option>
          </select>
          <select
            value={activityFilter}
            onChange={(e) => setActivityFilter(e.target.value)}
            className="text-xs font-semibold bg-white border border-slate-200 rounded-xl px-2.5 py-2"
          >
            {ACTIVITY_FILTER_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
          {(searchTerm || statusFilter !== "ALL" || lockFilter !== "ALL" || activityFilter !== "ALL") && (
            <button
              onClick={() => {
                setSearchTerm("");
                setStatusFilter("ALL");
                setLockFilter("ALL");
                setActivityFilter("ALL");
              }}
              className="text-[11px] font-bold text-slate-500 hover:text-rose-600 px-2 shrink-0"
            >
              Xoá lọc
            </button>
          )}
        </div>

        <div className="space-y-3">
          {filteredUsers.map((u) => {
            const status = u.subscription?.status || "NO_SUB";
            const statusInfo = STATUS_LABEL[status] || { label: "Chưa có gói", className: "bg-slate-100 text-slate-500" };
            const expiry = expiryLabel(u.subscription);
            const activityInfo = getActivityStatus(u.lastActiveAt);
            return (
              <div
                key={u.id}
                className={`flex flex-col sm:flex-row sm:items-center gap-3 border rounded-2xl p-4 ${
                  u.isLocked ? "border-rose-200 bg-rose-50/40" : "border-slate-100"
                }`}
              >
                <button
                  onClick={() => setDetailUserId(u.id)}
                  className="flex-1 min-w-0 text-left hover:bg-slate-50 -m-1 p-1 rounded-xl transition-colors"
                >
                  <p className="font-bold text-sm text-slate-900 truncate flex items-center gap-1.5">
                    {u.name}
                    {u.role === "admin" && <span className="text-[10px] bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full">Admin</span>}
                    {u.isLocked && <span className="text-[10px] bg-rose-100 text-rose-700 px-2 py-0.5 rounded-full">Đã khoá</span>}
                  </p>
                  <p className="text-xs text-slate-500 truncate">{u.email}</p>
                  {u.phone && (
                    <p className="text-[11px] text-slate-400 flex items-center gap-1">
                      <Phone className="w-3 h-3" /> {u.phone}
                    </p>
                  )}
                  {u.schoolName && <p className="text-[11px] text-slate-400">{u.schoolName}</p>}
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Tạo: {new Date(u.createdAt).toLocaleDateString("vi-VN")}
                    {expiry && <> • Hết hạn: {expiry}</>}
                  </p>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    {u.lastActiveAt
                      ? `Hoạt động gần nhất: ${new Date(u.lastActiveAt).toLocaleString("vi-VN")}`
                      : "Chưa từng hoạt động"}
                  </p>
                </button>

                <div className="flex flex-col items-start sm:items-end gap-1.5 shrink-0">
                  <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full ${statusInfo.className}`}>
                    {statusInfo.label}
                  </span>
                  <span className={`inline-flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-1 rounded-full ${activityInfo.className}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${activityInfo.dotClassName}`} />
                    {activityInfo.label}
                  </span>
                </div>

                <div className="flex items-center gap-1.5 shrink-0 flex-wrap">
                  <button
                    onClick={() => setDetailUserId(u.id)}
                    className="flex items-center gap-1 bg-slate-100 hover:bg-slate-200 text-slate-600 text-[11px] font-bold px-2.5 py-1.5 rounded-lg transition-colors"
                  >
                    <Eye className="w-3 h-3" />
                    Chi tiết
                  </button>

                  {u.role !== "admin" && (
                    <>
                      <button
                        onClick={() => grant(u.id, "TRIAL", 7)}
                        disabled={grantingId === u.id}
                        className="flex items-center gap-1 bg-sky-50 hover:bg-sky-100 text-sky-700 text-[11px] font-bold px-2.5 py-1.5 rounded-lg transition-colors disabled:opacity-50"
                      >
                        <Gift className="w-3 h-3" />
                        Tặng 7 ngày
                      </button>
                      <button
                        onClick={() => grant(u.id, "ACTIVE", 30)}
                        disabled={grantingId === u.id}
                        className="flex items-center gap-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-[11px] font-bold px-2.5 py-1.5 rounded-lg transition-colors disabled:opacity-50"
                      >
                        <Zap className="w-3 h-3" />
                        Kích hoạt 30 ngày
                      </button>
                      <button
                        onClick={() => toggleLock(u.id, !u.isLocked)}
                        disabled={lockingId === u.id}
                        className={`flex items-center gap-1 text-[11px] font-bold px-2.5 py-1.5 rounded-lg transition-colors disabled:opacity-50 ${
                          u.isLocked
                            ? "bg-emerald-50 hover:bg-emerald-100 text-emerald-700"
                            : "bg-rose-50 hover:bg-rose-100 text-rose-700"
                        }`}
                      >
                        {u.isLocked ? <Unlock className="w-3 h-3" /> : <Lock className="w-3 h-3" />}
                        {u.isLocked ? "Mở khoá" : "Khoá"}
                      </button>
                    </>
                  )}
                </div>
              </div>
            );
          })}

          {!loading && users.length === 0 && (
            <p className="text-center text-xs text-slate-400 py-6">Chưa có tài khoản nào.</p>
          )}
          {!loading && users.length > 0 && filteredUsers.length === 0 && (
            <p className="text-center text-xs text-slate-400 py-6">Không có tài khoản nào khớp bộ lọc.</p>
          )}
        </div>
      </div>

      <UserDetailModal
        userId={detailUserId}
        onClose={() => setDetailUserId(null)}
        onToggleLock={async (userId, locked) => {
          await toggleLock(userId, locked);
        }}
      />
    </div>
  );
}
