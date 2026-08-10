"use client";

import React, { useState, useEffect } from "react";
import {
  Sparkles,
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
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { clsx } from "clsx";

export function Navbar() {
  const [teacher, setTeacher] = useState<any>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
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
  }, []);

  // Close mobile menu on route change
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  const navLinks = [
    { href: "/", label: "Trang chủ", icon: Home },
    { href: "/chat", label: "Cô AI Assistant", icon: Bot, badge: "Mới" },
    { href: "/topics", label: "Sổ đánh giá sau chủ đề", icon: ClipboardCheck, badge: "Core" },
    { href: "/lessons", label: "Kho Giáo án", icon: BookOpen },
    { href: "/classes", label: "Quản lý Lớp học", icon: Users },
    { href: "/assessment/class", label: "Đánh giá sự phát triển", icon: BarChart3 },
    { href: "/tools", label: "Công cụ AI Nhanh", icon: Wand2 },
    { href: "/settings", label: "Cài đặt & Profile", icon: Settings },
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
            <div className="w-7 h-7 rounded-lg bg-emerald-600 flex items-center justify-center text-white shadow-xs">
              <Sparkles className="w-4 h-4" />
            </div>
            <span className="font-black text-base text-emerald-950">Cô AI</span>
          </Link>
        </div>

        {/* Desktop Header Middle */}
        <div className="hidden md:flex items-center gap-2 text-sm text-slate-600 bg-emerald-50/60 px-3 py-1.5 rounded-full border border-emerald-100">
          <Heart className="w-4 h-4 text-rose-500 fill-rose-500" />
          <span>Đồng hành cùng Giáo viên Mầm non Việt Nam</span>
        </div>

        {/* Header Right Profile */}
        <div className="flex items-center gap-3">
          <div className="hidden sm:flex items-center gap-2 text-xs bg-amber-50 text-amber-800 px-3 py-1.5 rounded-full border border-amber-200">
            <ShieldCheck className="w-4 h-4 text-amber-600" />
            <span>{teacher?.className || "Lớp Mầm 1"} • {teacher?.ageGroup || "4–5 tuổi"}</span>
          </div>

          <Link
            href="/settings"
            className="flex items-center gap-2 bg-emerald-50 hover:bg-emerald-100 transition-colors p-1.5 pr-3 rounded-full border border-emerald-200"
          >
            <div className="w-7 h-7 rounded-full bg-emerald-600 text-white font-bold text-xs flex items-center justify-center shadow-inner">
              Lan
            </div>
            <div className="text-left hidden sm:block">
              <p className="text-xs font-bold text-emerald-950 leading-tight">
                {teacher?.user?.name || "Cô Lan"}
              </p>
              <p className="text-[10px] text-emerald-700">
                {teacher?.schoolName || "Mầm Non Họa Mi"}
              </p>
            </div>
          </Link>
        </div>
      </header>

      {/* MOBILE FULL DRAWER NAVIGATION MENU */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 md:hidden bg-slate-900/60 backdrop-blur-sm flex">
          <div className="w-4/5 max-w-xs bg-white h-full shadow-2xl flex flex-col justify-between p-4 overflow-y-auto">
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-emerald-100 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shadow-md">
                    <Sparkles className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="font-black text-slate-900 text-base">Cô AI</h2>
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
                            isActive ? "bg-white/20 text-white" : "bg-amber-100 text-amber-900"
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

            <div className="pt-4 border-t border-emerald-100 text-[11px] text-slate-500 space-y-1">
              <p className="font-bold text-emerald-900">Trường Mầm Non Họa Mi</p>
              <p>Lớp Mầm 1 • 4–5 tuổi (28 học sinh)</p>
            </div>
          </div>

          <div className="flex-1" onClick={() => setMobileMenuOpen(false)} />
        </div>
      )}
    </>
  );
}
