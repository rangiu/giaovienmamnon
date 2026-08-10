"use client";

import React, { useState, useEffect } from "react";
import { FileCheck, Sparkles, FileText, CheckCircle2, Clock, Printer, Loader2, ArrowRight } from "lucide-react";
import Link from "next/link";

export default function AssessmentReportsPage() {
  const [reports, setReports] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Fetch all demo reports by fetching class students reports
    fetch("/api/classes")
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.classes.length > 0) {
          const students = data.classes[0].students || [];
          // Fetch student 1 detail to get report
          if (students.length > 0) {
            fetch(`/api/assessment/students/${students[0].id}`)
              .then((r) => r.json())
              .then((sData) => {
                if (sData.success) setReports(sData.reports || []);
              });
          }
        }
      })
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-emerald-100 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shadow-md shadow-emerald-200">
            <FileCheck className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl md:text-2xl font-black text-slate-900 tracking-tight">
              Báo cáo Đánh giá Sự Phát triển của Trẻ
            </h1>
            <p className="text-xs text-slate-500">
              Quản lý báo cáo tuần, tháng, học kỳ, chỉnh sửa nội dung, xác nhận và xuất PDF
            </p>
          </div>
        </div>

        <Link
          href="/assessment/class"
          className="inline-flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs py-3 px-5 rounded-2xl shadow-md transition-all shrink-0"
        >
          <Sparkles className="w-4 h-4" />
          <span>Tạo Báo cáo AI cho Trẻ</span>
        </Link>
      </div>

      {loading ? (
        <div className="bg-white p-12 rounded-3xl text-center border border-emerald-100">
          <Loader2 className="w-8 h-8 text-emerald-600 animate-spin mx-auto" />
          <p className="text-xs text-slate-500 mt-2">Đang tải danh sách báo cáo...</p>
        </div>
      ) : reports.length > 0 ? (
        <div className="space-y-4">
          {reports.map((report) => (
            <div
              key={report.id}
              className="bg-white p-6 rounded-3xl border border-emerald-100 shadow-sm space-y-4 hover:shadow-md transition-all"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider ${
                        report.status === "TEACHER_CONFIRMED"
                          ? "bg-emerald-100 text-emerald-800 border border-emerald-200"
                          : "bg-amber-100 text-amber-800 border border-amber-200"
                      }`}
                    >
                      {report.status === "TEACHER_CONFIRMED" ? "✓ Giáo viên đã xác nhận" : "📝 Bản dự thảo (DRAFT)"}
                    </span>
                    <span className="text-xs text-slate-400">
                      Tạo ngày {new Date(report.createdAt).toLocaleDateString("vi-VN")}
                    </span>
                  </div>
                  <h3 className="font-extrabold text-slate-900 text-base">
                    Báo cáo Đánh giá Phát triển — Nguyễn Minh ({report.period?.name || "Tháng 8/2026"})
                  </h3>
                </div>

                <Link
                  href={`/assessment/reports/${report.id}`}
                  className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs py-2.5 px-4 rounded-xl shadow-sm shrink-0"
                >
                  <span>Xem / Sửa / Xuất PDF</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>

              <div className="text-xs text-slate-700 space-y-1.5 leading-relaxed">
                <p><strong>• Tổng quan:</strong> {report.overview}</p>
                <p><strong>• Điểm mạnh nổi bật:</strong> {report.strengths}</p>
                <p><strong>• Nội dung cần hỗ trợ:</strong> {report.areasToSupport}</p>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white p-12 rounded-3xl text-center border border-emerald-100 space-y-3">
          <FileText className="w-10 h-10 text-slate-300 mx-auto" />
          <p className="text-xs text-slate-500">
            Chưa có báo cáo đánh giá nào. Cô vui lòng vào mục Hồ sơ Phát triển Trẻ và bấm '✨ AI Tổng hợp Đánh giá' nhé!
          </p>
        </div>
      )}
    </div>
  );
}
