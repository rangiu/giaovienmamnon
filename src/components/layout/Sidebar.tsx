"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Home,
  Bot,
  BookOpen,
  Users,
  Wand2,
  Settings,
  Sparkles,
  MessageSquareHeart,
  BarChart3,
  ChevronDown,
  ChevronRight,
  ClipboardCheck,
} from "lucide-react";
import { clsx } from "clsx";

export function Sidebar() {
  const pathname = usePathname();
  const [assessmentOpen, setAssessmentOpen] = useState(
    pathname.startsWith("/assessment") || pathname.startsWith("/topics")
  );

  return (
    <aside className="w-64 bg-white border-r border-emerald-100 flex flex-col justify-between hidden md:flex min-h-screen sticky top-0 h-screen z-20">
      <div className="overflow-y-auto">
        {/* Brand Header */}
        <div className="p-5 border-b border-emerald-50 flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center text-white shadow-lg shadow-emerald-200">
            <Sparkles className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <h1 className="font-extrabold text-xl text-emerald-950 tracking-tight">
              Cô AI
            </h1>
            <p className="text-[11px] text-emerald-600 font-medium">
              Trợ lý Mầm non Thông minh
            </p>
          </div>
        </div>

        {/* Navigation Menu */}
        <nav className="p-3 space-y-1 mt-2 text-sm font-semibold">
          <Link
            href="/"
            className={clsx(
              "flex items-center gap-3 px-4 py-3 rounded-2xl transition-all",
              pathname === "/"
                ? "bg-emerald-500 text-white shadow-md shadow-emerald-200"
                : "text-slate-600 hover:bg-emerald-50 hover:text-emerald-800"
            )}
          >
            <Home className="w-5 h-5" />
            <span>Trang chủ</span>
          </Link>

          <Link
            href="/chat"
            className={clsx(
              "flex items-center justify-between px-4 py-3 rounded-2xl transition-all",
              pathname.startsWith("/chat")
                ? "bg-emerald-500 text-white shadow-md shadow-emerald-200"
                : "text-slate-600 hover:bg-emerald-50 hover:text-emerald-800"
            )}
          >
            <div className="flex items-center gap-3">
              <Bot className="w-5 h-5" />
              <span>Cô AI Assistant</span>
            </div>
            <span className="text-[10px] bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full font-bold">
              Mới
            </span>
          </Link>

          {/* Core Feature: Sổ đánh giá trẻ sau chủ đề */}
          <Link
            href="/topics"
            className={clsx(
              "flex items-center justify-between px-4 py-3 rounded-2xl transition-all",
              pathname.startsWith("/topics")
                ? "bg-emerald-500 text-white shadow-md shadow-emerald-200"
                : "text-slate-700 hover:bg-emerald-50 hover:text-emerald-800"
            )}
          >
            <div className="flex items-center gap-3">
              <ClipboardCheck className="w-5 h-5 text-emerald-600 group-hover:text-emerald-800" />
              <span>Sổ đánh giá sau chủ đề</span>
            </div>
            <span className="text-[10px] bg-emerald-100 text-emerald-900 px-2 py-0.5 rounded-full font-extrabold uppercase">
              Core
            </span>
          </Link>

          <Link
            href="/lessons"
            className={clsx(
              "flex items-center gap-3 px-4 py-3 rounded-2xl transition-all",
              pathname.startsWith("/lessons")
                ? "bg-emerald-500 text-white shadow-md shadow-emerald-200"
                : "text-slate-600 hover:bg-emerald-50 hover:text-emerald-800"
            )}
          >
            <BookOpen className="w-5 h-5" />
            <span>Kho Giáo án</span>
          </Link>

          <Link
            href="/classes"
            className={clsx(
              "flex items-center gap-3 px-4 py-3 rounded-2xl transition-all",
              pathname.startsWith("/classes")
                ? "bg-emerald-500 text-white shadow-md shadow-emerald-200"
                : "text-slate-600 hover:bg-emerald-50 hover:text-emerald-800"
            )}
          >
            <Users className="w-5 h-5" />
            <span>Quản lý Lớp học</span>
          </Link>

          {/* Assessment Submenu */}
          <div className="pt-1">
            <button
              onClick={() => setAssessmentOpen(!assessmentOpen)}
              className={clsx(
                "w-full flex items-center justify-between px-4 py-3 rounded-2xl transition-all text-left",
                pathname.startsWith("/assessment")
                  ? "bg-emerald-50 text-emerald-900 font-extrabold border border-emerald-200"
                  : "text-slate-700 hover:bg-emerald-50 hover:text-emerald-800"
              )}
            >
              <div className="flex items-center gap-3">
                <BarChart3 className="w-5 h-5 text-emerald-600" />
                <span>Đánh giá sự phát triển</span>
              </div>
              {assessmentOpen ? (
                <ChevronDown className="w-4 h-4 text-emerald-600" />
              ) : (
                <ChevronRight className="w-4 h-4 text-slate-400" />
              )}
            </button>

            {assessmentOpen && (
              <div className="pl-9 pr-2 py-1 space-y-1 text-xs">
                <Link
                  href="/assessment/class"
                  className={clsx(
                    "block px-3 py-2 rounded-xl font-bold transition-all",
                    pathname === "/assessment/class"
                      ? "bg-emerald-500 text-white shadow-xs"
                      : "text-slate-600 hover:bg-emerald-50 hover:text-emerald-800"
                  )}
                >
                  🏫 Tổng quan cả lớp
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
              pathname.startsWith("/tools")
                ? "bg-emerald-500 text-white shadow-md shadow-emerald-200"
                : "text-slate-600 hover:bg-emerald-50 hover:text-emerald-800"
            )}
          >
            <Wand2 className="w-5 h-5" />
            <span>Công cụ AI Nhanh</span>
          </Link>

          <Link
            href="/settings"
            className={clsx(
              "flex items-center gap-3 px-4 py-3 rounded-2xl transition-all",
              pathname.startsWith("/settings")
                ? "bg-emerald-500 text-white shadow-md shadow-emerald-200"
                : "text-slate-600 hover:bg-emerald-50 hover:text-emerald-800"
            )}
          >
            <Settings className="w-5 h-5" />
            <span>Cài đặt & Profile</span>
          </Link>
        </nav>
      </div>

      {/* Helpful banner */}
      <div className="p-4 m-3 bg-gradient-to-br from-amber-50 to-emerald-50 rounded-3xl border border-emerald-100 shrink-0">
        <div className="flex items-center gap-2 text-emerald-800 font-bold text-xs mb-1">
          <MessageSquareHeart className="w-4 h-4 text-emerald-600" />
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
    </aside>
  );
}
