"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Home,
  Bot,
  BookOpen,
  Users,
  Wand2,
  Settings,
  MessageSquareHeart,
  ChevronDown,
  ChevronRight,
  ShieldCheck,
  CreditCard,
  LogOut,
  Lock,
  MessageCircle,
  MessagesSquare,
  Clapperboard,
} from "lucide-react";
import { clsx } from "clsx";
import { getAccessBadge } from "@/lib/accessBadge";
import { useAuthGate } from "@/components/auth/AuthGateProvider";

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  // "Quản lý lớp học" là GỐC — "Sổ đánh giá sau chủ đề" và "Đánh giá sự phát
  // triển" giờ là CON của nó (trước đây 3 mục này nằm rời rạc ngang hàng ở
  // sidebar — gộp lại vì cùng xoay quanh 1 lớp/1 nhóm trẻ, đúng luồng làm
  // việc thật của giáo viên: quản lý lớp -> đánh giá theo chủ đề -> theo dõi
  // phát triển). Cả 3 đều MIỄN PHÍ (không khoá theo gói) nên không cần
  // LockBadge/"Core" ở đây nữa.
  const [classManagementOpen, setClassManagementOpen] = useState(
    pathname.startsWith("/classes") || pathname.startsWith("/topics") || pathname.startsWith("/assessment")
  );
  const [me, setMe] = useState<{ role: string; name: string } | null>(null);
  const [access, setAccess] = useState<{ tier: string; reason: string } | null>(null);
  const [subscription, setSubscription] = useState<any>(null);
  const [forumUnreadCount, setForumUnreadCount] = useState(0);
  // Sidebar "thông minh" — mặc định THU NHỎ (chỉ hiện icon), di chuột vào là
  // mở to, ra ngoài lại thu nhỏ. Tiết kiệm diện tích màn hình cho nội dung
  // chính, vẫn giữ nguyên mọi mục điều hướng (không ẩn bớt tính năng nào).
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((data) => {
        if (data.success && data.user) setMe(data.user);
        if (data.access) setAccess(data.access);
        if (data.subscription) setSubscription(data.subscription);
      })
      .catch(() => {});
  }, []);

  // Số đỏ "chưa xem" cạnh mục Diễn đàn phản hồi — tải lại MỖI KHI đổi trang
  // (bắt đúng lúc vừa rời /dien-dan, trang đó tự đánh dấu đã xem xong nên số
  // phải về 0 ngay khi quay lại Sidebar, không cần đợi hết chu kỳ interval)
  // VÀ định kỳ mỗi 60s để cập nhật khi có người khác đăng bài mới trong lúc
  // cô đang ở trang khác không đổi route.
  useEffect(() => {
    const loadUnread = () => {
      fetch("/api/feedback/unread-count")
        .then((r) => r.json())
        .then((data) => {
          if (data.success) setForumUnreadCount(data.count);
        })
        .catch(() => {});
    };
    loadUnread();
    const interval = setInterval(loadUnread, 60000);
    return () => clearInterval(interval);
  }, [pathname]);

  const badge = getAccessBadge({ access, subscription });
  const { openLogin, openSignup } = useAuthGate();

  // Tài khoản chưa nâng cấp gói (FREE) hoặc gói đã hết hạn (EXPIRED) — chỉ
  // dùng được Chat cơ bản có giới hạn, các mục còn lại bị khoá tính năng.
  const isLimited = access !== null && access.tier !== "FULL";
  const LockBadge = () =>
    isLimited && expanded ? <Lock className="w-3 h-3 text-amber-500 ml-auto shrink-0" /> : null;

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  };

  // Chấm đỏ nhỏ (không số) đè lên icon lúc THU NHỎ — vẫn báo "có cái mới"
  // dù chưa mở rộng ra để đọc số cụ thể.
  const CollapsedDot = ({ show }: { show: boolean }) =>
    show ? <span className="absolute top-1.5 right-2.5 w-2 h-2 rounded-full bg-rose-600 border border-white" /> : null;

  return (
    <aside
      onMouseEnter={() => setExpanded(true)}
      onMouseLeave={() => setExpanded(false)}
      className={clsx(
        "bg-white border-r border-emerald-100 flex flex-col justify-between hidden md:flex min-h-screen sticky top-0 h-screen z-20 transition-all duration-200 overflow-hidden",
        expanded ? "w-64" : "w-[72px]"
      )}
    >
      <div className="overflow-y-auto overflow-x-hidden">
        {/* Brand Header */}
        <div className="p-5 border-b border-emerald-50 flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-white flex items-center justify-center shadow-lg shadow-emerald-100 shrink-0">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo.png" alt="SUMFLOW" className="w-8 h-8 object-contain" />
          </div>
          {expanded && (
            <div className="whitespace-nowrap">
              <h1 className="font-extrabold text-xl text-emerald-950 tracking-tight">
                SUMFLOW
              </h1>
              <p className="text-[11px] text-emerald-600 font-medium">
                Trợ lý Mầm non Thông minh
              </p>
            </div>
          )}
        </div>

        {/* Navigation Menu */}
        <nav className="p-3 space-y-1 mt-2 text-sm font-semibold">
          <Link
            href="/"
            className={clsx(
              "flex items-center gap-3 px-4 py-3 rounded-2xl transition-all",
              !expanded && "justify-center px-0",
              pathname === "/"
                ? "bg-emerald-500 text-white shadow-md shadow-emerald-200"
                : "text-slate-600 hover:bg-emerald-50 hover:text-emerald-800"
            )}
          >
            <Home className="w-5 h-5 shrink-0" />
            {expanded && <span className="whitespace-nowrap">Trang chủ</span>}
          </Link>

          <Link
            href="/chat"
            className={clsx(
              "relative flex items-center transition-all",
              expanded ? "justify-between px-4 py-3 rounded-2xl" : "justify-center px-0 py-3 rounded-2xl",
              pathname.startsWith("/chat")
                ? "bg-emerald-500 text-white shadow-md shadow-emerald-200"
                : "text-slate-600 hover:bg-emerald-50 hover:text-emerald-800"
            )}
          >
            <div className={clsx("flex items-center", expanded && "gap-3")}>
              <Bot className="w-5 h-5 shrink-0" />
              {expanded && <span className="whitespace-nowrap">SUMFLOW Assistant</span>}
            </div>
            {expanded && (
              <span className="text-[10px] bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full font-bold shrink-0">
                Mới
              </span>
            )}
          </Link>

          <Link
            href="/lessons"
            className={clsx(
              "flex items-center gap-3 px-4 py-3 rounded-2xl transition-all",
              !expanded && "justify-center px-0",
              pathname.startsWith("/lessons")
                ? "bg-emerald-500 text-white shadow-md shadow-emerald-200"
                : "text-slate-600 hover:bg-emerald-50 hover:text-emerald-800"
            )}
          >
            <BookOpen className="w-5 h-5 shrink-0" />
            {expanded && <span className="whitespace-nowrap">Kho Giáo án</span>}
          </Link>

          {/* Quản lý Lớp học — GỐC, chứa Sổ đánh giá sau chủ đề + 3 mục Đánh
              giá sự phát triển làm con, PHẲNG cùng 1 cấp (xem giải thích ở
              classManagementOpen). Lúc sidebar thu nhỏ, submenu LUÔN đóng
              (dù classManagementOpen=true) — không có chỗ hiện chữ, mở ra
              chỉ thấy 1 cụm icon rời rạc không rõ nghĩa. */}
          <div className="pt-1">
            <button
              onClick={() => setClassManagementOpen(!classManagementOpen)}
              className={clsx(
                "w-full flex items-center transition-all text-left",
                expanded ? "justify-between px-4 py-3 rounded-2xl" : "justify-center px-0 py-3 rounded-2xl",
                pathname.startsWith("/classes") || pathname.startsWith("/topics") || pathname.startsWith("/assessment")
                  ? "bg-emerald-50 text-emerald-900 font-extrabold border border-emerald-200"
                  : "text-slate-700 hover:bg-emerald-50 hover:text-emerald-800"
              )}
            >
              <div className={clsx("flex items-center", expanded && "gap-3")}>
                <Users className="w-5 h-5 text-emerald-600 shrink-0" />
                {expanded && <span className="whitespace-nowrap">Quản lý Lớp học</span>}
              </div>
              {expanded &&
                (classManagementOpen ? (
                  <ChevronDown className="w-4 h-4 text-emerald-600 shrink-0" />
                ) : (
                  <ChevronRight className="w-4 h-4 text-slate-400 shrink-0" />
                ))}
            </button>

            {expanded && classManagementOpen && (
              <div className="pl-9 pr-2 py-1 space-y-1 text-xs">
                <Link
                  href="/classes"
                  className={clsx(
                    "block px-3 py-2 rounded-xl font-bold transition-all",
                    pathname === "/classes"
                      ? "bg-emerald-500 text-white shadow-xs"
                      : "text-slate-600 hover:bg-emerald-50 hover:text-emerald-800"
                  )}
                >
                  🏫 Danh sách lớp & học sinh
                </Link>
                <Link
                  href="/topics"
                  className={clsx(
                    "block px-3 py-2 rounded-xl font-bold transition-all",
                    pathname.startsWith("/topics")
                      ? "bg-emerald-500 text-white shadow-xs"
                      : "text-slate-600 hover:bg-emerald-50 hover:text-emerald-800"
                  )}
                >
                  📋 Sổ đánh giá sau chủ đề
                </Link>
                <Link
                  href="/assessment/class"
                  className={clsx(
                    "block px-3 py-2 rounded-xl font-bold transition-all",
                    pathname === "/assessment/class"
                      ? "bg-emerald-500 text-white shadow-xs"
                      : "text-slate-600 hover:bg-emerald-50 hover:text-emerald-800"
                  )}
                >
                  📊 Tổng quan cả lớp
                </Link>
                <Link
                  href="/assessment/timeline"
                  className={clsx(
                    "block px-3 py-2 rounded-xl font-bold transition-all",
                    pathname === "/assessment/timeline"
                      ? "bg-emerald-500 text-white shadow-xs"
                      : "text-slate-600 hover:bg-emerald-50 hover:text-emerald-800"
                  )}
                >
                  📈 Tiến trình phát triển
                </Link>
                <Link
                  href="/assessment/reports"
                  className={clsx(
                    "block px-3 py-2 rounded-xl font-bold transition-all",
                    pathname === "/assessment/reports"
                      ? "bg-emerald-500 text-white shadow-xs"
                      : "text-slate-600 hover:bg-emerald-50 hover:text-emerald-800"
                  )}
                >
                  📄 Báo cáo đánh giá
                </Link>
              </div>
            )}
          </div>

          <Link
            href="/tools"
            className={clsx(
              "flex items-center gap-3 px-4 py-3 rounded-2xl transition-all",
              !expanded && "justify-center px-0",
              pathname.startsWith("/tools")
                ? "bg-emerald-500 text-white shadow-md shadow-emerald-200"
                : "text-slate-600 hover:bg-emerald-50 hover:text-emerald-800"
            )}
          >
            <Wand2 className="w-5 h-5 shrink-0" />
            {expanded && <span className="whitespace-nowrap">Công cụ AI Nhanh</span>}
            <LockBadge />
          </Link>

          <Link
            href="/video-studio"
            className={clsx(
              "relative flex items-center transition-all",
              expanded ? "justify-between px-4 py-3 rounded-2xl" : "justify-center px-0 py-3 rounded-2xl",
              pathname.startsWith("/video-studio")
                ? "bg-emerald-500 text-white shadow-md shadow-emerald-200"
                : "text-slate-600 hover:bg-emerald-50 hover:text-emerald-800"
            )}
          >
            <div className={clsx("flex items-center", expanded && "gap-3")}>
              <Clapperboard className="w-5 h-5 shrink-0" />
              {expanded && <span className="whitespace-nowrap">Video Studio</span>}
            </div>
            {expanded && (
              <span className="text-[10px] bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full font-bold shrink-0">
                Mới
              </span>
            )}
          </Link>

          <Link
            href="/dien-dan"
            className={clsx(
              "relative flex items-center transition-all",
              expanded ? "gap-3 px-4 py-3 rounded-2xl" : "justify-center px-0 py-3 rounded-2xl",
              pathname.startsWith("/dien-dan")
                ? "bg-emerald-500 text-white shadow-md shadow-emerald-200"
                : "text-slate-600 hover:bg-emerald-50 hover:text-emerald-800"
            )}
          >
            <MessagesSquare className="w-5 h-5 shrink-0" />
            {expanded && <span className="whitespace-nowrap">Diễn đàn phản hồi</span>}
            {expanded && forumUnreadCount > 0 && (
              <span className="ml-auto min-w-[18px] h-[18px] px-1 rounded-full bg-rose-600 text-white text-[10px] font-bold flex items-center justify-center shrink-0">
                {forumUnreadCount > 99 ? "99+" : forumUnreadCount}
              </span>
            )}
            <CollapsedDot show={!expanded && forumUnreadCount > 0} />
          </Link>

          <Link
            href="/settings"
            className={clsx(
              "flex items-center gap-3 px-4 py-3 rounded-2xl transition-all",
              !expanded && "justify-center px-0",
              pathname.startsWith("/settings")
                ? "bg-emerald-500 text-white shadow-md shadow-emerald-200"
                : "text-slate-600 hover:bg-emerald-50 hover:text-emerald-800"
            )}
          >
            <Settings className="w-5 h-5 shrink-0" />
            {expanded && <span className="whitespace-nowrap">Cài đặt & Profile</span>}
          </Link>

          <Link
            href="/billing"
            className={clsx(
              "flex items-center gap-3 px-4 py-3 rounded-2xl transition-all",
              !expanded && "justify-center px-0",
              pathname.startsWith("/billing")
                ? "bg-emerald-500 text-white shadow-md shadow-emerald-200"
                : "text-slate-600 hover:bg-emerald-50 hover:text-emerald-800"
            )}
          >
            <CreditCard className="w-5 h-5 shrink-0" />
            {expanded && <span className="whitespace-nowrap">Gói sử dụng & Thanh toán</span>}
          </Link>

          {me?.role === "admin" && (
            <Link
              href="/admin"
              className={clsx(
                "flex items-center gap-3 px-4 py-3 rounded-2xl transition-all",
                !expanded && "justify-center px-0",
                pathname.startsWith("/admin")
                  ? "bg-amber-500 text-white shadow-md shadow-amber-200"
                  : "text-amber-700 hover:bg-amber-50"
              )}
            >
              <ShieldCheck className="w-5 h-5 shrink-0" />
              {expanded && <span className="whitespace-nowrap">Quản trị hệ thống</span>}
            </Link>
          )}
        </nav>
      </div>

      {me ? (
        <div className="p-3 border-t border-emerald-50 shrink-0 flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-emerald-600 text-white font-bold text-xs flex items-center justify-center shrink-0">
            {me.name?.[0] || "C"}
          </div>
          {expanded && (
            <>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold text-slate-800 truncate">{me.name}</p>
                {badge.label && (
                  <Link
                    href="/billing"
                    className={`inline-flex items-center text-[10px] font-bold px-1.5 py-0.5 rounded-full mt-0.5 ${badge.className}`}
                  >
                    {badge.label}
                  </Link>
                )}
              </div>
              <button
                onClick={handleLogout}
                aria-label="Đăng xuất"
                className="p-2 rounded-xl text-slate-400 hover:bg-rose-50 hover:text-rose-600 transition-colors shrink-0"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </>
          )}
        </div>
      ) : (
        expanded && (
          <div className="p-3 border-t border-emerald-50 shrink-0 flex gap-2">
            <button
              onClick={openLogin}
              className="flex-1 text-center text-xs font-bold text-emerald-700 border border-emerald-200 py-2 rounded-xl hover:bg-emerald-50"
            >
              Đăng nhập
            </button>
            <button
              onClick={openSignup}
              className="flex-1 text-center text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 py-2 rounded-xl"
            >
              Đăng ký
            </button>
          </div>
        )
      )}

      {expanded && (
        <>
          <a
            href="https://zalo.me/0899442256"
            target="_blank"
            rel="noopener noreferrer"
            className="mx-3 flex items-center justify-center gap-1.5 text-[11px] font-bold text-sky-700 hover:text-sky-800 py-1.5 whitespace-nowrap"
          >
            <MessageCircle className="w-3.5 h-3.5 shrink-0" />
            Hỗ trợ Zalo: 0899442256
          </a>

          {/* Banner cuối sidebar: mời nâng cấp nếu đang dùng bản giới hạn (FREE/
              EXPIRED), ngược lại quảng bá tính năng Core như cũ. Chỉ hiện lúc
              mở rộng — nội dung quảng bá, không phải điều hướng cốt lõi. */}
          {isLimited ? (
            <div className="p-4 m-3 bg-gradient-to-br from-amber-50 to-orange-50 rounded-3xl border border-amber-200 shrink-0">
              <div className="flex items-center gap-2 text-amber-800 font-bold text-xs mb-1">
                <Lock className="w-4 h-4 text-amber-600 shrink-0" />
                <span>{access?.reason === "EXPIRED" ? "Gói đã hết hạn" : "Đang dùng bản miễn phí"}</span>
              </div>
              <p className="text-[11px] text-slate-600 leading-relaxed mb-3">
                Quản lý lớp học, Sổ đánh giá và Chat cơ bản (giới hạn lượt/ngày) luôn miễn phí. Nâng cấp gói
                tháng để mở khoá Soạn giáo án, viết nhận xét/tin nhắn phụ huynh và Chat không giới hạn.
              </p>
              <Link
                href="/billing"
                className="block text-center text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2 px-3 rounded-xl shadow-sm transition-colors"
              >
                Nâng cấp gói tháng ➔
              </Link>
            </div>
          ) : (
            <div className="p-4 m-3 bg-gradient-to-br from-amber-50 to-emerald-50 rounded-3xl border border-emerald-100 shrink-0">
              <div className="flex items-center gap-2 text-emerald-800 font-bold text-xs mb-1">
                <MessageSquareHeart className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Sổ đánh giá sau chủ đề</span>
              </div>
              <p className="text-[11px] text-slate-600 leading-relaxed mb-3">
                Thay thế Excel/Word thủ công, đánh giá 1 chạm và xuất PDF A4 Ngang sang trọng.
              </p>
              <Link
                href="/topics"
                className="block text-center text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2 px-3 rounded-xl shadow-sm transition-colors"
              >
                Mở Sổ Đánh Giá ➔
              </Link>
            </div>
          )}
        </>
      )}
    </aside>
  );
}
