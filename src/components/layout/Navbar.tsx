"use client";

import React, { useState, useEffect } from "react";
import {
  Heart,
  ShieldCheck,
  Menu,
  X,
  Home,
  Bot,
  ClipboardCheck,
  BookOpen,
  Users,
  BarChart3,
  Wand2,
  Settings,
  TrendingUp,
  FileCheck,
  CreditCard,
  MessagesSquare,
  Clapperboard,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { clsx } from "clsx";
import { getAccessBadge } from "@/lib/accessBadge";
import { useAuthGate } from "@/components/auth/AuthGateProvider";
import { NotificationBell } from "@/components/layout/NotificationBell";

export function Navbar() {
  const [teacher, setTeacher] = useState<any>(null);
  const [accessInfo, setAccessInfo] = useState<{ access: any; subscription: any } | null>(null);
  const [role, setRole] = useState<string | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [forumUnreadCount, setForumUnreadCount] = useState(0);
  const pathname = usePathname();

  useEffect(() => {
    fetch("/api/teacher/profile")
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.teacher) {
          setTeacher(data.teacher);
        }
      })
      .catch(() => {});

    fetch("/api/auth/me")
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          setAccessInfo({ access: data.access, subscription: data.subscription });
          if (data.user) setRole(data.user.role);
        }
      })
      .catch(() => {});
  }, []);

  // Số đỏ chưa xem Diễn đàn phản hồi — khớp cơ chế đã có ở Sidebar.tsx (desktop),
  // tải lại mỗi khi đổi trang để cập nhật ngay sau khi rời /dien-dan.
  useEffect(() => {
    fetch("/api/feedback/unread-count")
      .then((r) => r.json())
      .then((data) => {
        if (data.success) setForumUnreadCount(data.count);
      })
      .catch(() => {});
  }, [pathname]);

  const badge = getAccessBadge(accessInfo || { access: null, subscription: null });
  const isLoggedIn = role !== null;
  const { openLogin, openSignup } = useAuthGate();

  // Close mobile menu on route change
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  // Menu đầy đủ cho drawer mobile — trước đây thiếu mất "Tiến trình phát
  // triển", "Báo cáo đánh giá", "Gói sử dụng & Thanh toán" và "Quản trị hệ
  // thống" so với Sidebar trên web, khiến vào bằng điện thoại không bấm
  // tới được các trang đó.
  const navLinks = [
    { href: "/", label: "Trang chủ", icon: Home },
    { href: "/chat", label: "SUMFLOW Assistant", icon: Bot, badge: "Mới" },
    { href: "/topics", label: "Sổ đánh giá sau chủ đề", icon: ClipboardCheck, badge: "Core" },
    { href: "/lessons", label: "Kho Giáo án", icon: BookOpen },
    { href: "/classes", label: "Quản lý Lớp học", icon: Users },
    { href: "/assessment/class", label: "Tổng quan cả lớp", icon: BarChart3 },
    { href: "/assessment/timeline", label: "Tiến trình phát triển", icon: TrendingUp },
    { href: "/assessment/reports", label: "Báo cáo đánh giá", icon: FileCheck },
    { href: "/tools", label: "Công cụ AI Nhanh", icon: Wand2 },
    { href: "/video-studio", label: "Video Studio", icon: Clapperboard, badge: "Mới" },
    {
      href: "/dien-dan",
      label: "Diễn đàn phản hồi",
      icon: MessagesSquare,
      badge: forumUnreadCount > 0 ? String(forumUnreadCount > 99 ? "99+" : forumUnreadCount) : undefined,
      badgeRed: true,
    },
    { href: "/settings", label: "Cài đặt & Profile", icon: Settings },
    { href: "/billing", label: "Gói sử dụng & Thanh toán", icon: CreditCard },
    ...(role === "admin" ? [{ href: "/admin", label: "Quản trị hệ thống", icon: ShieldCheck }] : []),
  ];

  return (
    <>
      <header className="h-16 bg-white border-b border-emerald-100 px-4 md:px-6 flex items-center justify-between sticky top-0 z-30 shadow-sm">
        {/* Mobile Header Left with Hamburger Menu */}
        <div className="flex items-center gap-2.5 md:hidden">
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-emerald-500 text-white font-extrabold text-xs shadow-md shadow-emerald-200 active:scale-95 transition-transform"
            aria-label="Mở Menu"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            <span className="text-[11px]">Menu</span>
          </button>

          <Link href="/" className="flex items-center gap-1.5">
            <div className="w-7 h-7 rounded-lg bg-white flex items-center justify-center shadow-xs">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/logo.png" alt="SUMFLOW" className="w-6 h-6 object-contain" />
            </div>
            <span className="font-black text-base text-emerald-950">SUMFLOW</span>
          </Link>
        </div>

        {/* Desktop Header Middle */}
        <div className="hidden md:flex items-center gap-2 text-sm text-slate-600 bg-emerald-50/60 px-3 py-1.5 rounded-full border border-emerald-100">
          <Heart className="w-4 h-4 text-rose-500 fill-rose-500" />
          <span>Đồng hành cùng Giáo viên Mầm non Việt Nam</span>
        </div>

        {/* Header Right Profile */}
        <div className="flex items-center gap-3">
          {!isLoggedIn ? (
            <div className="flex items-center gap-2">
              <button
                onClick={openLogin}
                className="text-xs font-bold text-emerald-700 hover:text-emerald-800 px-3 py-2 rounded-xl transition-colors"
              >
                Đăng nhập
              </button>
              <button
                onClick={openSignup}
                className="text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 px-4 py-2 rounded-xl shadow-sm transition-colors"
              >
                Đăng ký
              </button>
            </div>
          ) : (
          <>
          <NotificationBell isLoggedIn={isLoggedIn} />

          <div className="hidden sm:flex items-center gap-2 text-xs bg-amber-50 text-amber-800 px-3 py-1.5 rounded-full border border-amber-200">
            <ShieldCheck className="w-4 h-4 text-amber-600" />
            <span>{teacher?.className || "Lớp Mầm 1"} • {teacher?.ageGroup || "4–5 tuổi"}</span>
          </div>

          {badge.label && (
            <Link
              href="/billing"
              className={`hidden sm:inline-flex items-center text-[11px] font-bold px-2.5 py-1 rounded-full whitespace-nowrap ${badge.className}`}
              title="Xem chi tiết gói sử dụng"
            >
              {badge.label}
            </Link>
          )}

          <Link
            href="/settings"
            className="flex items-center gap-2 bg-emerald-50 hover:bg-emerald-100 transition-colors p-1.5 pr-3 rounded-full border border-emerald-200"
          >
            <div className="w-7 h-7 rounded-full bg-emerald-600 text-white font-bold text-xs flex items-center justify-center shadow-inner">
              {teacher?.user?.name?.trim()?.[0]?.toUpperCase() || "?"}
            </div>
            <div className="text-left hidden sm:block">
              <p className="text-xs font-bold text-emerald-950 leading-tight">
                {teacher?.user?.name || "Giáo viên"}
              </p>
              <p className="text-[10px] text-emerald-700">
                {teacher?.schoolName || "Chưa cập nhật trường"}
              </p>
            </div>
          </Link>
          </>
          )}
        </div>
      </header>

      {/* MOBILE FULL DRAWER NAVIGATION MENU */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 md:hidden bg-slate-900/60 backdrop-blur-sm flex">
          <div className="w-4/5 max-w-xs bg-white h-full shadow-2xl flex flex-col justify-between p-4 overflow-y-auto">
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-emerald-100 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-2xl bg-white flex items-center justify-center shadow-md shrink-0">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src="/logo.png" alt="SUMFLOW" className="w-7 h-7 object-contain" />
                  </div>
                  <div>
                    <h2 className="font-black text-slate-900 text-base">SUMFLOW</h2>
                    <p className="text-[10px] text-emerald-700 font-medium">Trợ lý Mầm non Thông minh</p>
                  </div>
                </div>
                <button
                  onClick={() => setMobileMenuOpen(false)}
                  className="p-1.5 rounded-xl bg-slate-100 text-slate-500"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <nav className="space-y-1 text-xs">
                {navLinks.map((link) => {
                  const Icon = link.icon;
                  const isActive = pathname === link.href || (link.href !== "/" && pathname.startsWith(link.href));
                  return (
                    <Link
                      key={link.href}
                      href={link.href}
                      className={clsx(
                        "flex items-center justify-between px-3.5 py-3 rounded-2xl font-bold transition-all",
                        isActive
                          ? "bg-emerald-500 text-white shadow-md shadow-emerald-200"
                          : "text-slate-700 hover:bg-emerald-50 hover:text-emerald-800"
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <Icon className="w-4.5 h-4.5" />
                        <span>{link.label}</span>
                      </div>
                      {link.badge && (
                        <span
                          className={clsx(
                            "text-[10px] px-2 py-0.5 rounded-full font-black",
                            (link as any).badgeRed
                              ? "bg-rose-600 text-white"
                              : isActive
                              ? "bg-white/20 text-white"
                              : "bg-amber-100 text-amber-900"
                          )}
                        >
                          {link.badge}
                        </span>
                      )}
                    </Link>
                  );
                })}
              </nav>
            </div>

            <div className="pt-4 border-t border-emerald-100 text-[11px] text-slate-500 space-y-2">
              {!isLoggedIn ? (
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      setMobileMenuOpen(false);
                      openLogin();
                    }}
                    className="flex-1 text-center text-xs font-bold text-emerald-700 border border-emerald-200 py-2 rounded-xl"
                  >
                    Đăng nhập
                  </button>
                  <button
                    onClick={() => {
                      setMobileMenuOpen(false);
                      openSignup();
                    }}
                    className="flex-1 text-center text-xs font-bold text-white bg-emerald-600 py-2 rounded-xl"
                  >
                    Đăng ký
                  </button>
                </div>
              ) : (
                <>
                  {badge.label && (
                    <Link
                      href="/billing"
                      className={`inline-flex items-center text-[11px] font-bold px-2.5 py-1 rounded-full ${badge.className}`}
                    >
                      {badge.label}
                    </Link>
                  )}
                  <p className="font-bold text-emerald-900">{teacher?.schoolName || "Chưa cập nhật trường"}</p>
                  <p>
                    {teacher?.className || "Lớp của tôi"} • {teacher?.ageGroup || "4–5 tuổi"} (
                    {teacher?.studentCount ?? 0} học sinh)
                  </p>
                </>
              )}
            </div>
          </div>

          <div className="flex-1" onClick={() => setMobileMenuOpen(false)} />
        </div>
      )}
    </>
  );
}
