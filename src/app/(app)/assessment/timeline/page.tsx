"use client";

import React, { useState, useEffect } from "react";
import { TrendingUp, Loader2, ClipboardList, Users, ArrowRight, Info } from "lucide-react";
import Link from "next/link";

type TimelineItem =
  | {
      type: "ASSESSMENT";
      id: string;
      date: string;
      studentName: string;
      studentId: string;
      domainName: string;
      level: string;
      notes: string;
    }
  | {
      type: "OBSERVATION";
      id: string;
      date: string;
      studentName: string;
      studentId: string;
      domainName: string;
      content: string;
    };

const LEVEL_LABEL: Record<string, { emoji: string; text: string; dot: string; ring: string; badgeBg: string; badgeText: string }> = {
  TOT: { emoji: "⭐", text: "Tốt", dot: "bg-purple-500", ring: "ring-purple-100", badgeBg: "bg-purple-100", badgeText: "text-purple-800" },
  DAT: { emoji: "🟢", text: "Đạt", dot: "bg-emerald-600", ring: "ring-emerald-100", badgeBg: "bg-emerald-100", badgeText: "text-emerald-800" },
  DANG_PHAT_TRIEN: { emoji: "🟡", text: "Đang phát triển", dot: "bg-amber-500", ring: "ring-amber-100", badgeBg: "bg-amber-100", badgeText: "text-amber-800" },
  CHUA_DU_MINH_CHUNG: { emoji: "⚪", text: "Chưa đủ minh chứng", dot: "bg-slate-400", ring: "ring-slate-100", badgeBg: "bg-slate-100", badgeText: "text-slate-700" },
};

function formatDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" });
}

export default function DevelopmentTimelinePage() {
  const [timeline, setTimeline] = useState<TimelineItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/assessment/timeline")
      .then((res) => res.json())
      .then((resData) => {
        if (resData.success) setTimeline(resData.timeline || []);
      })
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-6 pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-emerald-100 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shadow-md shadow-emerald-200">
            <TrendingUp className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl md:text-2xl font-black text-slate-900 tracking-tight">
              Tiến trình Phát triển theo Thời gian
            </h1>
            <p className="text-xs text-slate-500">
              Dòng thời gian ghi nhận đánh giá và quan sát thật của trẻ trong lớp, mới nhất lên trên
            </p>
          </div>
        </div>
      </div>

      {/* Giải thích nguồn dữ liệu — nhiều cô không biết trang này lấy dữ
          liệu từ đâu vì không có liên kết trực tiếp tới nơi nhập liệu. */}
      <div className="flex items-start gap-3 bg-sky-50 border border-sky-200 rounded-2xl p-4 text-xs text-sky-900">
        <Info className="w-4 h-4 shrink-0 mt-0.5" />
        <p className="leading-relaxed">
          Dòng thời gian này tự động ghép từ 2 nơi: <strong>ghi chú quan sát</strong> (thêm ở trang{" "}
          <Link href="/classes" className="underline font-bold hover:text-sky-700">Quản lý Lớp học</Link>{" "}
          → chọn bé → "Ghi nhận quan sát") và <strong>mức độ đánh giá lĩnh vực</strong> (đổi ở trang Hồ
          sơ Phát triển từng bé). Càng ghi nhận nhiều, dòng thời gian càng đầy đủ.
        </p>
      </div>

      {loading ? (
        <div className="bg-white p-12 rounded-3xl text-center border border-emerald-100">
          <Loader2 className="w-8 h-8 text-emerald-600 animate-spin mx-auto" />
          <p className="text-xs text-slate-500 mt-2">Đang tải tiến trình phát triển...</p>
        </div>
      ) : timeline.length === 0 ? (
        <div className="bg-white rounded-3xl p-10 text-center border border-dashed border-slate-300 space-y-3">
          <ClipboardList className="w-10 h-10 text-slate-300 mx-auto" />
          <p className="text-sm font-bold text-slate-700">Chưa có dữ liệu tiến trình</p>
          <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed">
            Lớp chưa có học sinh, ghi chú quan sát hoặc kết quả đánh giá nào. Hãy thêm học sinh vào lớp và
            ghi nhận quan sát/đánh giá — dòng thời gian sẽ tự động hiển thị đúng dữ liệu thật của lớp cô.
          </p>
          <Link
            href="/classes"
            className="inline-flex items-center gap-1.5 bg-emerald-600 text-white text-xs font-bold py-2 px-4 rounded-xl shadow-sm hover:bg-emerald-700"
          >
            <Users className="w-4 h-4" />
            <span>Đi tới Quản lý Lớp học</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      ) : (
        <div className="bg-white rounded-3xl p-6 md:p-8 border border-emerald-100 shadow-sm space-y-6">
          <div className="relative border-l-2 border-emerald-300 ml-4 space-y-8 pl-6">
            {timeline.map((item) => {
              if (item.type === "ASSESSMENT") {
                const meta = LEVEL_LABEL[item.level] || LEVEL_LABEL.CHUA_DU_MINH_CHUNG;
                return (
                  <div key={`a-${item.id}`} className="relative">
                    <div className={`absolute -left-[31px] top-0.5 w-4 h-4 rounded-full ${meta.dot} ring-4 ${meta.ring}`} />
                    <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200 space-y-2">
                      <div className="flex items-center justify-between text-xs flex-wrap gap-2">
                        <span className={`font-bold px-2.5 py-0.5 rounded-full ${meta.badgeBg} ${meta.badgeText}`}>
                          {formatDate(item.date)} • {item.studentName}
                        </span>
                        <span className="text-slate-400">Lĩnh vực: {item.domainName}</span>
                      </div>
                      <h3 className="font-extrabold text-sm text-slate-900">
                        {meta.emoji} {meta.text}
                      </h3>
                      {item.notes && (
                        <p className="text-xs text-slate-600 leading-relaxed">{item.notes}</p>
                      )}
                    </div>
                  </div>
                );
              }

              return (
                <div key={`o-${item.id}`} className="relative">
                  <div className="absolute -left-[31px] top-0.5 w-4 h-4 rounded-full bg-sky-500 ring-4 ring-sky-100" />
                  <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200 space-y-2">
                    <div className="flex items-center justify-between text-xs flex-wrap gap-2">
                      <span className="font-bold text-sky-800 bg-sky-100 px-2.5 py-0.5 rounded-full">
                        {formatDate(item.date)} • {item.studentName}
                      </span>
                      <span className="text-slate-400">Lĩnh vực: {item.domainName}</span>
                    </div>
                    <h3 className="font-extrabold text-sm text-slate-900">📝 Ghi chú quan sát</h3>
                    <p className="text-xs text-slate-600 leading-relaxed">{item.content}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
