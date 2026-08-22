"use client";

import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  Bell,
  X,
  CheckCheck,
  Sparkles,
  CreditCard,
  Clock,
  Lock,
  Unlock,
  PartyPopper,
  ArrowRight,
} from "lucide-react";

interface NotificationItem {
  id: string;
  title: string;
  message: string;
  type: string;
  link: string | null;
  createdAt: string;
  isRead: boolean;
}

const TYPE_ICON: Record<string, React.ElementType> = {
  ADMIN: Sparkles,
  PAYMENT_SUCCESS: CreditCard,
  EXPIRING_SOON: Clock,
  ACCOUNT_LOCKED: Lock,
  ACCOUNT_UNLOCKED: Unlock,
  WELCOME: PartyPopper,
};

const TYPE_COLOR: Record<string, string> = {
  ADMIN: "bg-emerald-100 text-emerald-700",
  PAYMENT_SUCCESS: "bg-emerald-100 text-emerald-700",
  EXPIRING_SOON: "bg-amber-100 text-amber-700",
  ACCOUNT_LOCKED: "bg-rose-100 text-rose-700",
  ACCOUNT_UNLOCKED: "bg-sky-100 text-sky-700",
  WELCOME: "bg-purple-100 text-purple-700",
};

/**
 * Chuông thông báo dùng chung ở Navbar (desktop) — chỉ hiện khi đã đăng
 * nhập (khách vãng lai chưa có gì để nhận thông báo). Poll nhẹ mỗi 60s để
 * cập nhật số chưa đọc mà không cần WebSocket.
 *
 * Danh sách trong khung thả xuống chỉ hiện tiêu đề + 1 dòng tóm tắt ngắn —
 * bấm vào 1 thông báo sẽ mở popup riêng hiện ĐẦY ĐỦ nội dung để đọc cho rõ
 * (trước đây nội dung dài bị dồn hết vào khung nhỏ, khó đọc).
 */
export function NotificationBell({ isLoggedIn }: { isLoggedIn: boolean }) {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [detail, setDetail] = useState<NotificationItem | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const load = () => {
    if (!isLoggedIn) return;
    fetch("/api/notifications")
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          setItems(data.notifications);
          setUnreadCount(data.unreadCount);
        }
      })
      .catch(() => {});
  };

  useEffect(() => {
    if (!isLoggedIn) return;
    load();
    const interval = setInterval(load, 60000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoggedIn]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleToggle = () => {
    const next = !open;
    setOpen(next);
    if (next) load();
  };

  const markRead = (id: string) => {
    setItems((prev) => prev.map((n) => (n.id === id ? { ...n, isRead: true } : n)));
    setUnreadCount((c) => Math.max(0, c - 1));
    fetch(`/api/notifications/${id}/read`, { method: "POST" }).catch(() => {});
  };

  const handleOpenDetail = (n: NotificationItem) => {
    setDetail(n);
    setOpen(false);
    if (!n.isRead) markRead(n.id);
  };

  const handleMarkAllRead = async () => {
    setLoading(true);
    setItems((prev) => prev.map((n) => ({ ...n, isRead: true })));
    setUnreadCount(0);
    try {
      await fetch("/api/notifications/read-all", { method: "POST" });
    } finally {
      setLoading(false);
    }
  };

  if (!isLoggedIn) return null;

  return (
    <div className="relative" ref={containerRef}>
      <button
        onClick={handleToggle}
        aria-label="Thông báo"
        className="relative p-2 rounded-xl text-slate-500 hover:bg-emerald-50 hover:text-emerald-700 transition-colors"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 rounded-full bg-rose-500 text-white text-[9px] font-black flex items-center justify-center">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-80 max-w-[90vw] bg-white rounded-2xl shadow-2xl border border-emerald-100 z-50 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
            <span className="text-xs font-black text-slate-700 uppercase tracking-wide">Thông báo</span>
            <div className="flex items-center gap-2">
              {unreadCount > 0 && (
                <button
                  onClick={handleMarkAllRead}
                  disabled={loading}
                  className="flex items-center gap-1 text-[10px] font-bold text-emerald-700 hover:text-emerald-800"
                >
                  <CheckCheck className="w-3 h-3" />
                  Đọc hết
                </button>
              )}
              <button onClick={() => setOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          <div className="max-h-96 overflow-y-auto">
            {items.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-10">Chưa có thông báo nào.</p>
            ) : (
              items.map((n) => {
                const Icon = TYPE_ICON[n.type] || Sparkles;
                const colorClass = TYPE_COLOR[n.type] || "bg-slate-100 text-slate-600";
                return (
                  <button
                    key={n.id}
                    onClick={() => handleOpenDetail(n)}
                    className={`w-full flex items-start gap-2.5 px-4 py-3 border-b border-slate-50 hover:bg-slate-50 transition-colors text-left ${
                      n.isRead ? "opacity-60" : "bg-emerald-50/40"
                    }`}
                  >
                    <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${colorClass}`}>
                      <Icon className="w-3.5 h-3.5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-bold text-slate-800 truncate">{n.title}</p>
                      {/* Chỉ hiện tóm tắt ngắn 1 dòng — bấm vào để đọc đầy đủ ở popup. */}
                      <p className="text-[11px] text-slate-500 truncate mt-0.5">{n.message}</p>
                      <p className="text-[10px] text-slate-400 mt-1">{new Date(n.createdAt).toLocaleString("vi-VN")}</p>
                    </div>
                    {!n.isRead && <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0 mt-1" />}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* Popup đọc đầy đủ nội dung 1 thông báo */}
      {detail && (
        <div
          className="fixed inset-0 z-[100] bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setDetail(null)}
        >
          <div
            className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2.5">
                {(() => {
                  const Icon = TYPE_ICON[detail.type] || Sparkles;
                  const colorClass = TYPE_COLOR[detail.type] || "bg-slate-100 text-slate-600";
                  return (
                    <div className={`w-9 h-9 rounded-2xl flex items-center justify-center shrink-0 ${colorClass}`}>
                      <Icon className="w-4.5 h-4.5" />
                    </div>
                  );
                })()}
                <h3 className="font-black text-slate-900 text-sm leading-snug">{detail.title}</h3>
              </div>
              <button
                onClick={() => setDetail(null)}
                className="w-7 h-7 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">{detail.message}</p>
            <p className="text-[11px] text-slate-400">{new Date(detail.createdAt).toLocaleString("vi-VN")}</p>

            {detail.link && (
              <Link
                href={detail.link}
                onClick={() => setDetail(null)}
                className="inline-flex items-center justify-center gap-2 w-full bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold py-2.5 rounded-xl transition-colors"
              >
                Xem chi tiết
                <ArrowRight className="w-4 h-4" />
              </Link>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
