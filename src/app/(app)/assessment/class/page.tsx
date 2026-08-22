"use client";

import React, { useState, useEffect } from "react";
import {
  BarChart3,
  Users,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Star,
  ChevronRight,
  Loader2,
  UserCheck,
  Eye,
  Filter,
} from "lucide-react";
import Link from "next/link";

export default function ClassAssessmentPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [selectedDomainFilter, setSelectedDomainFilter] = useState<string | null>(null);
  const [selectedLevelFilter, setSelectedLevelFilter] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/assessment/class")
      .then((res) => res.json())
      .then((resData) => {
        if (resData.success) setData(resData);
      })
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, []);

  const classInfo = data?.classInfo;
  const domainStats = data?.domainStats || [];

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-emerald-100 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shadow-md shadow-emerald-200">
            <BarChart3 className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl md:text-2xl font-black text-slate-900 tracking-tight">
              Tổng quan Đánh giá phát triển {classInfo?.name || "Lớp Mầm 1"}
            </h1>
            <p className="text-xs text-slate-500">
              Kỳ đánh giá: <span className="font-bold text-emerald-800">{classInfo?.periodName || "Chưa có kỳ đánh giá"}</span> • Sĩ số: <span className="font-bold text-slate-800">{classInfo?.studentCount ?? 0} học sinh</span>
            </p>
          </div>
        </div>

        <Link
          href="/classes"
          className="inline-flex items-center justify-center gap-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-bold text-xs py-2.5 px-4 rounded-xl border border-emerald-200 transition-colors shrink-0"
        >
          <Users className="w-4 h-4" />
          <span>Xem danh sách học sinh</span>
        </Link>
      </div>

      {loading ? (
        <div className="bg-white p-12 rounded-3xl text-center border border-emerald-100">
          <Loader2 className="w-8 h-8 text-emerald-600 animate-spin mx-auto" />
          <p className="text-xs text-slate-500 mt-2">Đang tải tổng quan đánh giá cả lớp...</p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Legend Banner */}
          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/80 flex flex-wrap items-center gap-4 text-xs font-semibold">
            <span className="text-slate-500">Ký hiệu mức độ:</span>
            <span className="inline-flex items-center gap-1.5 bg-emerald-100 text-emerald-900 px-3 py-1 rounded-full border border-emerald-200">
              🟢 Đạt
            </span>
            <span className="inline-flex items-center gap-1.5 bg-amber-100 text-amber-900 px-3 py-1 rounded-full border border-amber-200">
              🟡 Đang phát triển
            </span>
            <span className="inline-flex items-center gap-1.5 bg-slate-200 text-slate-700 px-3 py-1 rounded-full">
              ⚪ Chưa đủ minh chứng
            </span>
            <span className="inline-flex items-center gap-1.5 bg-purple-100 text-purple-900 px-3 py-1 rounded-full border border-purple-200">
              ⭐ Tốt
            </span>
          </div>

          {/* 6 Domains Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {domainStats.map((stat: any) => {
              const isFiltered = selectedDomainFilter === stat.domainId;

              return (
                <div
                  key={stat.domainId}
                  className={`bg-white rounded-3xl p-6 border transition-all space-y-4 shadow-sm hover:shadow-md ${
                    isFiltered ? "border-emerald-500 ring-2 ring-emerald-200" : "border-emerald-100"
                  }`}
                >
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                    <div>
                      <h3 className="font-extrabold text-slate-900 text-base">
                        {stat.name}
                      </h3>
                      <p className="text-[11px] text-slate-400">Mã: {stat.code}</p>
                    </div>
                  </div>

                  {/* Level Counters */}
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <button
                      onClick={() => {
                        setSelectedDomainFilter(stat.domainId);
                        setSelectedLevelFilter("DAT");
                      }}
                      className="p-2.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-left transition-colors"
                    >
                      <span className="text-[11px] text-emerald-800 font-medium block">🟢 Đạt</span>
                      <strong className="text-base font-black text-emerald-950">
                        {stat.counts.dat} trẻ
                      </strong>
                    </button>

                    <button
                      onClick={() => {
                        setSelectedDomainFilter(stat.domainId);
                        setSelectedLevelFilter("DANG_PHAT_TRIEN");
                      }}
                      className="p-2.5 rounded-xl bg-amber-50 hover:bg-amber-100 border border-amber-200 text-left transition-colors"
                    >
                      <span className="text-[11px] text-amber-800 font-medium block">🟡 Đang phát triển</span>
                      <strong className="text-base font-black text-amber-950">
                        {stat.counts.dangPhatTrien} trẻ
                      </strong>
                    </button>

                    <button
                      onClick={() => {
                        setSelectedDomainFilter(stat.domainId);
                        setSelectedLevelFilter("CHUA_DU_MINH_CHUNG");
                      }}
                      className="p-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-left transition-colors"
                    >
                      <span className="text-[11px] text-slate-600 font-medium block">⚪ Chưa đủ minh chứng</span>
                      <strong className="text-base font-black text-slate-800">
                        {stat.counts.chuaDuMinhChung} trẻ
                      </strong>
                    </button>

                    <button
                      onClick={() => {
                        setSelectedDomainFilter(stat.domainId);
                        setSelectedLevelFilter("TOT");
                      }}
                      className="p-2.5 rounded-xl bg-purple-50 hover:bg-purple-100 border border-purple-200 text-left transition-colors"
                    >
                      <span className="text-[11px] text-purple-800 font-medium block">⭐ Tốt</span>
                      <strong className="text-base font-black text-purple-950">
                        {stat.counts.tot} trẻ
                      </strong>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Detailed Student List Filter Table */}
          {selectedDomainFilter && (
            <div className="bg-white rounded-3xl p-6 border border-emerald-200 shadow-md space-y-4">
              <div className="flex items-center justify-between border-b border-emerald-100 pb-3">
                <h3 className="font-extrabold text-slate-900 text-sm flex items-center gap-2">
                  <Filter className="w-4 h-4 text-emerald-600" />
                  <span>
                    Danh sách trẻ lĩnh vực{" "}
                    <strong className="text-emerald-800">
                      {domainStats.find((d: any) => d.domainId === selectedDomainFilter)?.name}
                    </strong>{" "}
                    ({selectedLevelFilter || "Tất cả"})
                  </span>
                </h3>

                <button
                  onClick={() => {
                    setSelectedDomainFilter(null);
                    setSelectedLevelFilter(null);
                  }}
                  className="text-xs font-bold text-slate-500 hover:text-slate-800 bg-slate-100 px-3 py-1 rounded-lg"
                >
                  Xóa bộ lọc
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                {domainStats
                  .find((d: any) => d.domainId === selectedDomainFilter)
                  ?.students.filter((st: any) =>
                    selectedLevelFilter ? st.level === selectedLevelFilter : true
                  )
                  .map((student: any) => (
                    <Link
                      key={student.id}
                      href={`/assessment/students/${student.id}`}
                      className="p-3 bg-slate-50 hover:bg-emerald-50 rounded-2xl border border-slate-200 hover:border-emerald-300 transition-all flex items-center justify-between group"
                    >
                      <div>
                        <h4 className="font-bold text-xs text-slate-900 group-hover:text-emerald-800">
                          {student.name}
                        </h4>
                        <span className="text-[10px] text-slate-500">{student.gender}</span>
                      </div>
                      <span className="text-xs">
                        {student.level === "TOT" && "⭐ Tốt"}
                        {student.level === "DAT" && "🟢 Đạt"}
                        {student.level === "DANG_PHAT_TRIEN" && "🟡 Đang phát triển"}
                        {student.level === "CHUA_DU_MINH_CHUNG" && "⚪ Chưa đủ MC"}
                      </span>
                    </Link>
                  ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
