"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Bot, ClipboardCheck, BookOpen, BarChart3, Clapperboard } from "lucide-react";
import { clsx } from "clsx";

export function MobileBottomNav() {
  const pathname = usePathname();

  // Video Studio thêm sau — trước đây KHÔNG có ở đây, khiến tính năng lớn
  // nhất mới xây không bấm tới được từ thanh nav dưới cùng trên điện thoại
  // (chỉ vào được qua menu hamburger đầy đủ ở Navbar, không tiện bằng 1 chạm).
  const navItems = [
    { href: "/", label: "Trang chủ", icon: Home },
    { href: "/chat", label: "SUMFLOW", icon: Bot, highlight: true },
    { href: "/topics", label: "Sổ đánh giá", icon: ClipboardCheck },
    { href: "/lessons", label: "Kho giáo án", icon: BookOpen },
    { href: "/video-studio", label: "Video AI", icon: Clapperboard },
    { href: "/assessment/class", label: "Đánh giá trẻ", icon: BarChart3 },
  ];

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-emerald-100 shadow-2xl flex items-center justify-around py-1.5 px-1">
      {navItems.map((item) => {
        const Icon = item.icon;
        const isActive =
          pathname === item.href ||
          (item.href !== "/" && pathname.startsWith(item.href));

        return (
          <Link
            key={item.href}
            href={item.href}
            className={clsx(
              "flex flex-col items-center justify-center py-1 px-1.5 rounded-2xl transition-all text-[9px] font-bold gap-0.5",
              isActive
                ? "text-emerald-800 bg-emerald-50 font-black scale-105"
                : "text-slate-500 hover:text-emerald-700"
            )}
          >
            <div
              className={clsx(
                "p-1.5 rounded-xl transition-all",
                isActive
                  ? "bg-emerald-500 text-white shadow-md shadow-emerald-200"
                  : item.highlight
                  ? "bg-amber-100 text-amber-900"
                  : "bg-slate-100 text-slate-600"
              )}
            >
              <Icon className="w-4 h-4" />
            </div>
            <span className="truncate max-w-[52px]">{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
