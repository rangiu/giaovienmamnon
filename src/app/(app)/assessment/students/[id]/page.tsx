"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  User,
  Sparkles,
  FileText,
  TrendingUp,
  BarChart3,
  Calendar,
  CheckCircle2,
  AlertCircle,
  Lightbulb,
  Loader2,
  Plus,
  ArrowLeft,
  Printer,
  FileCheck,
} from "lucide-react";
import Link from "next/link";
import { formatDob } from "@/lib/formatDate";

export default function StudentDevelopmentProfilePage() {
  const params = useParams();
  const router = useRouter();
  const studentId = params.id as string;

  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"overview" | "observations" | "timeline" | "reports">("overview");

  const [synthesizing, setSynthesizing] = useState(false);
  const [updatingLevel, setUpdatingLevel] = useState<string | null>(null);

  const fetchProfile = () => {
    setLoading(true);
    fetch(`/api/assessment/students/${studentId}`)
      .then((res) => res.json())
      .then((resData) => {
        if (resData.success) setData(resData);
      })
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (studentId) fetchProfile();
  }, [studentId]);

  const handleUpdateDomainLevel = async (domainId: string, newLevel: string) => {
    setUpdatingLevel(domainId);
    try {
      const res = await fetch("/api/assessment/assessments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentId,
          domainId,
          level: newLevel,
        }),
      });

      const resData = await res.json();
      if (resData.success) {
        fetchProfile();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setUpdatingLevel(null);
    }
  };

  const handleSynthesizeReport = async () => {
    setSynthesizing(true);
    try {
      const res = await fetch("/api/assessment/synthesize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ studentId }),
      });

      const resData = await res.json();
      if (resData.success && resData.report) {
        alert("Đã tổng hợp báo cáo đánh giá thành công!");
        fetchProfile();
        setActiveTab("reports");
      } else {
        alert(resData.error || "Không thể tổng hợp báo cáo");
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSynthesizing(false);
    }
  };

  const student = data?.student;
  const domainProfile = data?.domainProfile || [];
  const observations = data?.observations || [];
  const reports = data?.reports || [];
  const missingDomainSuggestions = data?.missingDomainSuggestions || [];

  return (
    <div className="space-y-6 pb-12">
      {/* Back button & Student Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-emerald-100 shadow-sm">
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.back()}
            className="w-10 h-10 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>

          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-500 text-white font-black text-xl flex items-center justify-center shadow-lg shadow-emerald-200">
            {student?.name?.charAt(0) || "B"}
          </div>

          <div>
            <h1 className="text-xl md:text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
              <span>{student?.name || "Học sinh"}</span>
              <span className="text-xs bg-emerald-100 text-emerald-800 px-3 py-1 rounded-full font-bold">
                {student?.className || "Lớp Mầm 1"} ({student?.ageGroup || "4–5 tuổi"})
              </span>
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Ngày sinh: {formatDob(student?.dateOfBirth) || "Chưa cập nhật"} • Kỳ đánh giá: <strong className="text-emerald-800">{data?.currentPeriodName || "Chưa có kỳ đánh giá"}</strong>
            </p>
          </div>
        </div>

        {/* AI Synthesis Trigger */}
        <button
          onClick={handleSynthesizeReport}
          disabled={synthesizing}
          className="inline-flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs py-3 px-5 rounded-2xl shadow-md transition-all shrink-0 disabled:opacity-50"
        >
          {synthesizing ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Sparkles className="w-4 h-4" />
          )}
          <span>{synthesizing ? "AI đang tổng hợp..." : "✨ AI Tổng hợp Đánh giá"}</span>
        </button>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-2 bg-white p-2 rounded-2xl border border-emerald-100 shadow-2xs overflow-x-auto">
        {[
          { id: "overview", label: "📊 Tổng quan phát triển", icon: BarChart3 },
          { id: "observations", label: "📋 Nhật ký quan sát", icon: FileText, count: observations.length },
          { id: "timeline", label: "📈 Tiến trình phát triển", icon: TrendingUp },
          { id: "reports", label: "📄 Báo cáo đánh giá", icon: FileCheck, count: reports.length },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex-1 min-w-max py-3 px-4 rounded-xl text-xs md:text-sm font-extrabold flex items-center justify-center gap-2 transition-all ${
                isActive
                  ? "bg-emerald-500 text-white shadow-sm"
                  : "text-slate-600 hover:bg-emerald-50 hover:text-emerald-800"
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
              {tab.count !== undefined && (
                <span className={`text-[10px] px-2 py-0.5 rounded-full ${isActive ? "bg-white/20 text-white" : "bg-slate-200 text-slate-700"}`}>
                  {tab.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {loading ? (
        <div className="bg-white p-12 rounded-3xl text-center border border-emerald-100">
          <Loader2 className="w-8 h-8 text-emerald-600 animate-spin mx-auto" />
          <p className="text-xs text-slate-500 mt-2">Đang tải hồ sơ phát triển trẻ...</p>
        </div>
      ) : (
        <>
          {/* TAB 1: OVERVIEW */}
          {activeTab === "overview" && (
            <div className="space-y-6">
              {/* Missing Evidence Detector Widget */}
              {missingDomainSuggestions.length > 0 && (
                <div className="bg-amber-50 p-5 rounded-3xl border border-amber-200 space-y-3">
                  <div className="flex items-center gap-2 text-amber-900 font-extrabold text-sm">
                    <Lightbulb className="w-5 h-5 text-amber-600" />
                    <h3>Phát hiện Lĩnh vực Thiếu Minh chứng Quan sát</h3>
                  </div>
                  <p className="text-xs text-amber-800 leading-relaxed">
                    Trong kỳ đánh giá này, cô giáo chưa có đủ minh chứng quan sát thực tế cho các lĩnh vực sau. Cô có thể quan sát thêm một số hành vi thực tế gợi ý bên dưới:
                  </p>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                    {missingDomainSuggestions.map((item: any, idx: number) => (
                      <div key={idx} className="bg-white p-3.5 rounded-2xl border border-amber-200 text-xs space-y-2">
                        <strong className="text-amber-950 font-bold block">
                          📌 Lĩnh vực {item.domainName} ({item.count} quan sát)
                        </strong>
                        <ul className="list-disc list-inside text-slate-700 space-y-1">
                          {item.suggestions.map((sug: string, i: number) => (
                            <li key={i}>{sug}</li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 6 Domains Profile Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {domainProfile.map((domain: any) => (
                  <div
                    key={domain.domainId}
                    className="bg-white rounded-3xl p-6 border border-emerald-100 shadow-sm space-y-4 flex flex-col justify-between"
                  >
                    <div className="space-y-2">
                      <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                        <h3 className="font-black text-slate-900 text-base">
                          {domain.name}
                        </h3>
                        <span className="text-[10px] font-bold bg-slate-100 text-slate-600 px-2 py-0.5 rounded-md">
                          {domain.observationCount} quan sát
                        </span>
                      </div>

                      <div className="pt-2">
                        <label className="block text-[11px] font-bold text-slate-500 mb-1">
                          Mức độ phát triển hiện tại:
                        </label>
                        <select
                          value={domain.level}
                          onChange={(e) =>
                            handleUpdateDomainLevel(domain.domainId, e.target.value)
                          }
                          disabled={updatingLevel === domain.domainId}
                          className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-bold bg-slate-50 focus:ring-2 focus:ring-emerald-500"
                        >
                          <option value="CHUA_DU_MINH_CHUNG">⚪ Chưa đủ minh chứng</option>
                          <option value="DANG_PHAT_TRIEN">🟡 Đang phát triển</option>
                          <option value="DAT">🟢 Đạt</option>
                          <option value="TOT">⭐ Tốt</option>
                        </select>
                      </div>
                    </div>

                    <p className="text-[11px] text-slate-400 italic pt-2">
                      Cô giáo có thể trực tiếp thay đổi mức đánh giá bất kỳ lúc nào.
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 2: OBSERVATIONS */}
          {activeTab === "observations" && (
            <div className="bg-white rounded-3xl p-6 border border-emerald-100 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h3 className="font-extrabold text-slate-900 text-base">
                  Nhật ký Quan sát của {student?.name}
                </h3>
                <Link
                  href="/classes"
                  className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-200"
                >
                  <Plus className="w-4 h-4" />
                  <span>Thêm quan sát mới</span>
                </Link>
              </div>

              {observations.length > 0 ? (
                <div className="space-y-3">
                  {observations.map((obs: any) => (
                    <div key={obs.id} className="bg-slate-50 p-4 rounded-2xl border border-slate-200/80 space-y-1.5">
                      <div className="flex items-center justify-between text-[11px] text-slate-500">
                        <span className="font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-md">
                          {obs.domain?.name || obs.category || "Quan sát"}
                        </span>
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {new Date(obs.date).toLocaleDateString("vi-VN")}
                        </span>
                      </div>
                      <p className="text-xs text-slate-800 font-medium leading-relaxed">
                        "{obs.content}"
                      </p>
                      {obs.activityContext && (
                        <p className="text-[11px] text-slate-500">
                          Bối cảnh: {obs.activityContext}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-8 text-center text-xs text-slate-400">
                  Chưa có minh chứng quan sát nào cho {student?.name}.
                </div>
              )}
            </div>
          )}

          {/* TAB 3: TIMELINE */}
          {activeTab === "timeline" && (
            <div className="bg-white rounded-3xl p-6 border border-emerald-100 shadow-sm space-y-6">
              <h3 className="font-extrabold text-slate-900 text-base">
                Tiến trình Phát triển theo Thời gian
              </h3>

              <div className="relative border-l-2 border-emerald-200 ml-4 space-y-6 pl-6">
                <div className="relative">
                  <div className="absolute -left-[31px] top-0.5 w-4 h-4 rounded-full bg-emerald-500 ring-4 ring-emerald-100" />
                  <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-1">
                    <span className="text-[11px] font-bold text-emerald-800">10/08/2026</span>
                    <h4 className="font-bold text-xs text-slate-900">Kỹ năng tự phục vụ — Đạt</h4>
                    <p className="text-xs text-slate-600">Bé Minh tự xúc ăn ngoan và biết cất bát đĩa đúng nơi quy định.</p>
                  </div>
                </div>

                <div className="relative">
                  <div className="absolute -left-[31px] top-0.5 w-4 h-4 rounded-full bg-amber-500 ring-4 ring-amber-100" />
                  <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-1">
                    <span className="text-[11px] font-bold text-amber-800">08/08/2026</span>
                    <h4 className="font-bold text-xs text-slate-900">Tình cảm - Xã hội — Đang phát triển</h4>
                    <p className="text-xs text-slate-600">Minh chủ động rủ các bạn cùng chơi nhưng chưa muốn chia sẻ xe đồ chơi.</p>
                  </div>
                </div>

                <div className="relative">
                  <div className="absolute -left-[31px] top-0.5 w-4 h-4 rounded-full bg-purple-500 ring-4 ring-purple-100" />
                  <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-1">
                    <span className="text-[11px] font-bold text-purple-800">05/08/2026</span>
                    <h4 className="font-bold text-xs text-slate-900">Nhận thức — Tốt</h4>
                    <p className="text-xs text-slate-600">Phân loại nhanh động vật sống dưới nước và trên cạn trong giờ khám phá.</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: REPORTS */}
          {activeTab === "reports" && (
            <div className="space-y-4">
              {reports.length > 0 ? (
                reports.map((report: any) => (
                  <div key={report.id} className="bg-white p-6 rounded-3xl border border-emerald-100 shadow-sm space-y-4">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                      <div>
                        <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider ${
                          report.status === "TEACHER_CONFIRMED"
                            ? "bg-emerald-100 text-emerald-800 border border-emerald-200"
                            : "bg-amber-100 text-amber-800 border border-amber-200"
                        }`}>
                          {report.status === "TEACHER_CONFIRMED" ? "✓ Giáo viên đã xác nhận" : "📝 Bản dự thảo (DRAFT)"}
                        </span>
                        <h3 className="font-black text-slate-900 text-base mt-2">
                          Báo cáo Phát triển {report.period?.name || "Tháng 8/2026"}
                        </h3>
                      </div>

                      <Link
                        href={`/assessment/reports/${report.id}`}
                        className="inline-flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs py-2 px-3.5 rounded-xl shadow-sm"
                      >
                        <FileText className="w-4 h-4" />
                        <span>Xem / Sửa / Xuất PDF</span>
                      </Link>
                    </div>

                    <div className="text-xs text-slate-700 space-y-2">
                      <p><strong>• Tổng quan:</strong> {report.overview}</p>
                      <p><strong>• Điểm mạnh:</strong> {report.strengths}</p>
                      <p><strong>• Tiến bộ:</strong> {report.progress}</p>
                      <p><strong>• Cần hỗ trợ:</strong> {report.areasToSupport}</p>
                    </div>
                  </div>
                ))
              ) : (
                <div className="bg-white p-12 rounded-3xl text-center border border-emerald-100 space-y-3">
                  <FileText className="w-10 h-10 text-slate-300 mx-auto" />
                  <p className="text-xs text-slate-500">Chưa có báo cáo đánh giá nào được tạo. Bấm '✨ AI Tổng hợp Đánh giá' để khởi tạo báo cáo đầu tiên nhé!</p>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
