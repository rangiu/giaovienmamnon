"use client";

import React, { useState, useEffect } from "react";
import { TrendingUp, Calendar, Filter, Users, Loader2 } from "lucide-react";
import Link from "next/link";

export default function DevelopmentTimelinePage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/assessment/class")
      .then((res) => res.json())
      .then((resData) => {
        if (resData.success) setData(resData);
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
              Dòng thời gian trực quan ghi nhận sự chuyển biến tích cực của trẻ qua từng cột mốc quan sát
            </p>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="bg-white p-12 rounded-3xl text-center border border-emerald-100">
          <Loader2 className="w-8 h-8 text-emerald-600 animate-spin mx-auto" />
          <p className="text-xs text-slate-500 mt-2">Đang tải tiến trình phát triển...</p>
        </div>
      ) : (
        <div className="bg-white rounded-3xl p-6 md:p-8 border border-emerald-100 shadow-sm space-y-6">
          <div className="relative border-l-2 border-emerald-300 ml-4 space-y-8 pl-6">
            {/* Event Milestone 1 */}
            <div className="relative">
              <div className="absolute -left-[31px] top-0.5 w-4 h-4 rounded-full bg-emerald-600 ring-4 ring-emerald-100" />
              <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-emerald-800 bg-emerald-100 px-2.5 py-0.5 rounded-full">
                    10/08/2026 • Nguyễn Minh (4–5 tuổi)
                  </span>
                  <span className="text-slate-400">Lĩnh vực: Kỹ năng tự phục vụ</span>
                </div>
                <h3 className="font-extrabold text-sm text-slate-900">
                  ⚪ Chưa đủ minh chứng ➔ 🟢 Đạt chuẩn tự phục vụ
                </h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Bé Minh tự xúc ăn ngoan gần hết phần ăn và biết cất bát đĩa đúng nơi quy định sau giờ ăn trưa.
                </p>
              </div>
            </div>

            {/* Event Milestone 2 */}
            <div className="relative">
              <div className="absolute -left-[31px] top-0.5 w-4 h-4 rounded-full bg-amber-500 ring-4 ring-amber-100" />
              <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-amber-800 bg-amber-100 px-2.5 py-0.5 rounded-full">
                    08/08/2026 • Nguyễn Minh (4–5 tuổi)
                  </span>
                  <span className="text-slate-400">Lĩnh vực: Tình cảm – Kỹ năng xã hội</span>
                </div>
                <h3 className="font-extrabold text-sm text-slate-900">
                  🟡 Đang phát triển kỹ năng nhường nhịn đồ chơi
                </h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Minh chủ động rủ các bạn cùng chơi góc xây dựng nhưng chưa sẵn sàng cho bạn mượn xe đồ chơi.
                </p>
              </div>
            </div>

            {/* Event Milestone 3 */}
            <div className="relative">
              <div className="absolute -left-[31px] top-0.5 w-4 h-4 rounded-full bg-purple-500 ring-4 ring-purple-100" />
              <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-purple-800 bg-purple-100 px-2.5 py-0.5 rounded-full">
                    05/08/2026 • Nguyễn Minh (4–5 tuổi)
                  </span>
                  <span className="text-slate-400">Lĩnh vực: Nhận thức & Khám phá</span>
                </div>
                <h3 className="font-extrabold text-sm text-slate-900">
                  ⭐ Đạt mức Tốt khả năng tư duy phân loại
                </h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Trong giờ khám phá con vật, Minh phân loại nhanh động vật sống dưới nước và trên cạn, giải thích lý do chính xác.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
