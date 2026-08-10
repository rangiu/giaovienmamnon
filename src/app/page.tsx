"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Sparkles,
  BookOpen,
  Gamepad2,
  FileEdit,
  MessageSquare,
  Users,
  ArrowRight,
  Clock,
  ChevronRight,
  Heart,
} from "lucide-react";
import { LessonCard } from "@/components/lesson/LessonCard";

export default function Dashboard() {
  const router = useRouter();
  const [teacher, setTeacher] = useState<any>(null);
  const [recentLessons, setRecentLessons] = useState<any[]>([]);
  const [quickPrompt, setQuickPrompt] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Fetch teacher profile & recent lessons
    Promise.all([
      fetch("/api/teacher/profile").then((r) => r.json()),
      fetch("/api/lessons").then((r) => r.json()),
    ])
      .then(([teacherData, lessonsData]) => {
        if (teacherData.success) setTeacher(teacherData.teacher);
        if (lessonsData.success) setRecentLessons(lessonsData.lessons.slice(0, 3));
      })
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, []);

  const handleAskSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickPrompt.trim()) return;
    router.push(`/chat?q=${encodeURIComponent(quickPrompt)}`);
  };

  return (
    <div className="space-y-8 pb-12">
      {/* Welcome Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 p-6 md:p-8 text-white shadow-xl shadow-emerald-200">
        <div className="relative z-10 space-y-4 max-w-2xl">
          <div className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-md px-3 py-1 rounded-full text-xs font-semibold text-emerald-100">
            <Heart className="w-3.5 h-3.5 fill-rose-300 text-rose-300" />
            <span>Chào mừng cô quay trở lại!</span>
          </div>

          <h1 className="text-2xl md:text-4xl font-extrabold tracking-tight">
            Xin chào {teacher?.user?.name || "Cô Lan"} 👋
          </h1>
          <p className="text-emerald-100 text-sm md:text-base leading-relaxed">
            Hôm nay cô cần em hỗ trợ gì? Nhập bất kỳ yêu cầu nào bằng câu nói tự nhiên, Cô AI sẽ giúp cô hoàn thành nhanh chóng.
          </p>

          {/* Quick Ask Box */}
          <form onSubmit={handleAskSubmit} className="pt-2">
            <div className="flex items-center bg-white rounded-2xl p-2 shadow-lg max-w-xl border border-emerald-300 focus-within:ring-4 focus-within:ring-emerald-300/50 transition-all">
              <Sparkles className="w-6 h-6 text-emerald-600 ml-3 shrink-0" />
              <input
                type="text"
                placeholder="✨ Soạn giáo án khám phá quả cam cho trẻ 4–5 tuổi..."
                value={quickPrompt}
                onChange={(e) => setQuickPrompt(e.target.value)}
                className="w-full px-3 py-2 text-slate-800 text-sm focus:outline-none placeholder-slate-400 font-medium"
              />
              <button
                type="submit"
                className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-5 py-2.5 rounded-xl transition-colors shrink-0 flex items-center gap-1 shadow-sm"
              >
                <span>Hỏi AI</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </form>
        </div>

        {/* Decorative Circles */}
        <div className="absolute -right-10 -bottom-10 w-64 h-64 bg-white/10 rounded-full blur-2xl pointer-events-none" />
        <div className="absolute right-20 top-0 w-40 h-40 bg-emerald-400/20 rounded-full blur-xl pointer-events-none" />
      </div>

      {/* Quick Action Shortcuts Grid */}
      <div className="space-y-4">
        <h2 className="text-lg font-black text-slate-900 tracking-tight flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-emerald-600" />
          <span>Thao tác nhanh cho Giáo viên</span>
        </h2>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Link
            href="/chat?preset=lesson"
            className="group p-5 bg-white rounded-3xl border border-emerald-100 hover:border-emerald-300 shadow-sm hover:shadow-md transition-all space-y-3"
          >
            <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center group-hover:scale-110 transition-transform">
              <BookOpen className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-sm group-hover:text-emerald-700 transition-colors">
                Soạn giáo án
              </h3>
              <p className="text-xs text-slate-500 line-clamp-1 mt-0.5">
                Đúng chuẩn 13 mục sư phạm
              </p>
            </div>
          </Link>

          <Link
            href="/chat?preset=game"
            className="group p-5 bg-white rounded-3xl border border-amber-100 hover:border-amber-300 shadow-sm hover:shadow-md transition-all space-y-3"
          >
            <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-800 flex items-center justify-center group-hover:scale-110 transition-transform">
              <Gamepad2 className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-sm group-hover:text-amber-700 transition-colors">
                Tạo trò chơi
              </h3>
              <p className="text-xs text-slate-500 line-clamp-1 mt-0.5">
                Vận động & phát triển tư duy
              </p>
            </div>
          </Link>

          <Link
            href="/tools?tab=comment"
            className="group p-5 bg-white rounded-3xl border border-sky-100 hover:border-sky-300 shadow-sm hover:shadow-md transition-all space-y-3"
          >
            <div className="w-12 h-12 rounded-2xl bg-sky-100 text-sky-800 flex items-center justify-center group-hover:scale-110 transition-transform">
              <FileEdit className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-sm group-hover:text-sky-700 transition-colors">
                Viết nhận xét
              </h3>
              <p className="text-xs text-slate-500 line-clamp-1 mt-0.5">
                Ấm áp, tích cực từ ghi chú
              </p>
            </div>
          </Link>

          <Link
            href="/tools?tab=parent"
            className="group p-5 bg-white rounded-3xl border border-rose-100 hover:border-rose-300 shadow-sm hover:shadow-md transition-all space-y-3"
          >
            <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-800 flex items-center justify-center group-hover:scale-110 transition-transform">
              <MessageSquare className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-sm group-hover:text-rose-700 transition-colors">
                Tin nhắn phụ huynh
              </h3>
              <p className="text-xs text-slate-500 line-clamp-1 mt-0.5">
                Lịch sự, sẵn sàng gửi Zalo
              </p>
            </div>
          </Link>
        </div>
      </div>

      {/* Class Overview Card */}
      <div className="bg-white rounded-3xl p-6 border border-emerald-100 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-bold text-slate-900 text-base">
                Thông tin Lớp học của Cô
              </h2>
              <p className="text-xs text-slate-500">
                {teacher?.className || "Lớp Mầm 1"} • {teacher?.schoolName || "Trường Mầm Non Họa Mi"}
              </p>
            </div>
          </div>

          <Link
            href="/classes"
            className="text-xs font-bold text-emerald-700 hover:text-emerald-800 flex items-center gap-1 bg-emerald-50 px-3 py-1.5 rounded-full border border-emerald-200"
          >
            <span>Quản lý danh sách học sinh</span>
            <ChevronRight className="w-4 h-4" />
          </Link>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200/60">
            <span className="text-slate-400 block text-[11px]">Độ tuổi</span>
            <strong className="text-slate-800 text-sm font-black">
              {teacher?.ageGroup || "4–5 tuổi"}
            </strong>
          </div>
          <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200/60">
            <span className="text-slate-400 block text-[11px]">Sĩ số</span>
            <strong className="text-slate-800 text-sm font-black">
              {teacher?.studentCount || 28} học sinh
            </strong>
          </div>
          <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200/60 col-span-2 sm:col-span-2">
            <span className="text-slate-400 block text-[11px]">Chủ đề hiện tại</span>
            <strong className="text-emerald-800 text-sm font-black">
              {teacher?.currentTopic || "Thế giới động vật"}
            </strong>
          </div>
        </div>
      </div>

      {/* Recent Lessons */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-black text-slate-900 tracking-tight flex items-center gap-2">
            <Clock className="w-5 h-5 text-amber-600" />
            <span>Giáo án gần đây</span>
          </h2>

          <Link
            href="/lessons"
            className="text-xs font-bold text-emerald-700 hover:text-emerald-800 flex items-center gap-1"
          >
            <span>Xem tất cả kho giáo án</span>
            <ChevronRight className="w-4 h-4" />
          </Link>
        </div>

        {recentLessons.length > 0 ? (
          <div className="space-y-6">
            {recentLessons.map((lesson) => (
              <LessonCard key={lesson.id} lesson={lesson} showSaveButton={false} />
            ))}
          </div>
        ) : (
          <div className="bg-white rounded-3xl p-8 text-center border border-dashed border-slate-300 space-y-3">
            <BookOpen className="w-10 h-10 text-slate-300 mx-auto" />
            <p className="text-xs text-slate-500">
              Cô chưa có giáo án nào gần đây. Hãy mở khung chat Cô AI để khởi tạo giáo án đầu tiên nhé!
            </p>
            <Link
              href="/chat"
              className="inline-flex items-center gap-1.5 bg-emerald-600 text-white text-xs font-bold py-2 px-4 rounded-xl shadow-sm hover:bg-emerald-700"
            >
              <Sparkles className="w-4 h-4" />
              <span>Soạn giáo án ngay</span>
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
