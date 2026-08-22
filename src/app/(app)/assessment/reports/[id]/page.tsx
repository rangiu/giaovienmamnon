"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  FileText,
  Edit3,
  CheckCircle2,
  Printer,
  ArrowLeft,
  Loader2,
  Save,
  ShieldCheck,
  Calendar,
  Sparkles,
  Link2,
} from "lucide-react";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import { AutoGrowTextarea } from "@/components/ui/AutoGrowTextarea";

export default function SingleReportPage() {
  const params = useParams();
  const router = useRouter();
  const reportId = params.id as string;

  const [report, setReport] = useState<any>(null);
  const [observations, setObservations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [exportingPdf, setExportingPdf] = useState(false);

  // Editable Form Fields
  const [overview, setOverview] = useState("");
  const [strengths, setStrengths] = useState("");
  const [progress, setProgress] = useState("");
  const [areasToSupport, setAreasToSupport] = useState("");
  const [suggestedActivities, setSuggestedActivities] = useState("");

  const fetchReport = () => {
    setLoading(true);
    fetch(`/api/assessment/reports/${reportId}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.report) {
          const r = data.report;
          setReport(r);
          setObservations(data.observations || []);
          setOverview(r.overview || "");
          setStrengths(r.strengths || "");
          setProgress(r.progress || "");
          setAreasToSupport(r.areasToSupport || "");
          setSuggestedActivities(r.suggestedActivities || "");
        }
      })
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (reportId) fetchReport();
  }, [reportId]);

  const handleSaveEdit = async () => {
    setSaving(true);
    try {
      const res = await fetch(`/api/assessment/reports/${reportId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          overview,
          strengths,
          progress,
          areasToSupport,
          suggestedActivities,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setReport(data.report);
        setIsEditing(false);
        alert("Đã lưu nội dung chỉnh sửa thành công!");
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const handleTeacherConfirm = async () => {
    if (!confirm("Cô có chắc chắn xác nhận báo cáo đánh giá này là thông tin chính thức không?")) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/assessment/reports/${reportId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: "TEACHER_CONFIRMED",
        }),
      });

      const data = await res.json();
      if (data.success) {
        setReport(data.report);
        alert("Đã xác nhận báo cáo thành công!");
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const handleExportReportPdf = async () => {
    if (!report) return;
    setExportingPdf(true);

    try {
      const printContainer = document.createElement("div");
      printContainer.style.position = "absolute";
      printContainer.style.left = "-9999px";
      printContainer.style.top = "0";
      printContainer.style.width = "800px";
      printContainer.style.padding = "40px";
      printContainer.style.background = "#ffffff";
      printContainer.style.color = "#1e293b";
      printContainer.style.fontFamily = "Arial, sans-serif";
      printContainer.style.fontSize = "13px";
      printContainer.style.lineHeight = "1.6";

      printContainer.innerHTML = `
        <div style="border-bottom: 2px solid #059669; padding-bottom: 12px; margin-bottom: 20px; display: flex; justify-content: space-between; align-items: flex-end;">
          <div>
            <h4 style="margin: 0; color: #047857; font-size: 14px; font-weight: bold; text-transform: uppercase;">TRƯỜNG MẦM NON HỌA MI</h4>
            <p style="margin: 2px 0 0 0; color: #64748b; font-size: 12px;">BÁO CÁO ĐÁNH GIÁ SỰ PHÁT TRIỂN CỦA TRẺ</p>
          </div>
          <div style="text-align: right; font-size: 12px; color: #475569;">
            <p style="margin: 0;"><b>Học sinh:</b> ${report.student?.name}</p>
            <p style="margin: 2px 0 0 0;"><b>Lớp:</b> ${report.student?.class?.name || "Mầm 1"} (${report.period?.name || "Tháng 8/2026"})</p>
          </div>
        </div>

        <div style="text-align: center; margin-bottom: 24px;">
          <h1 style="margin: 0; color: #065f46; font-size: 20px; font-weight: bold;">BÁO CÁO TỔNG HỢP PHÁT TRIỂN TOÀN DIỆN</h1>
          <p style="margin: 4px 0 0 0; font-size: 12px; color: #64748b;">Trạng thái: ${report.status === "TEACHER_CONFIRMED" ? "✓ Đã được Giáo viên xác nhận chính thức" : "Dự thảo"}</p>
        </div>

        <div style="margin-bottom: 16px; background: #f0fdf4; padding: 12px 16px; border-radius: 8px; border-left: 4px solid #10b981;">
          <h3 style="margin: 0 0 6px 0; color: #047857; font-size: 14px;">I. TỔNG QUAN PHÁT TRIỂN</h3>
          <p style="margin: 0;">${report.overview}</p>
        </div>

        <div style="margin-bottom: 16px; background: #fffbeb; padding: 12px 16px; border-radius: 8px; border-left: 4px solid #f59e0b;">
          <h3 style="margin: 0 0 6px 0; color: #b45309; font-size: 14px;">II. ĐIỂM MẠNH NỔI BẬT & TIẾN BỘ</h3>
          <p style="margin: 4px 0;"><b>• Điểm mạnh:</b> ${report.strengths}</p>
          <p style="margin: 4px 0;"><b>• Tiến bộ theo thời gian:</b> ${report.progress}</p>
        </div>

        <div style="margin-bottom: 16px; background: #fdf2f8; padding: 12px 16px; border-radius: 8px; border-left: 4px solid #f43f5e;">
          <h3 style="margin: 0 0 6px 0; color: #be185d; font-size: 14px;">III. NỘI DUNG CẦN HỖ TRỢ & GỢI Ý HOẠT ĐỘNG</h3>
          <p style="margin: 4px 0;"><b>• Cần tiếp tục hỗ trợ:</b> ${report.areasToSupport}</p>
          <p style="margin: 4px 0;"><b>• Gợi ý hoạt động phối hợp:</b> ${report.suggestedActivities}</p>
        </div>

        <div style="margin-top: 40px; display: flex; justify-content: space-between; text-align: center; page-break-inside: avoid;">
          <div>
            <p style="margin: 0; font-weight: bold;">BAN GIÁM HIỆU DUYỆT</p>
            <p style="margin: 40px 0 0 0; color: #94a3b8; font-style: italic;">(Ký & ghi rõ họ tên)</p>
          </div>
          <div>
            <p style="margin: 0; font-weight: bold;">GIÁO VIÊN CHỦ NHIỆM</p>
            <p style="margin: 5px 0 0 0; color: #047857; font-weight: bold;">Cô Nguyễn Thị Lan</p>
          </div>
        </div>
      `;

      document.body.appendChild(printContainer);

      const canvas = await html2canvas(printContainer, { scale: 2 });
      document.body.removeChild(printContainer);

      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF("p", "mm", "a4");
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

      pdf.addImage(imgData, "PNG", 0, 0, pdfWidth, pdfHeight);
      pdf.save(`Bao_Cao_Phat_Trien_${report.student?.name?.replace(/\s+/g, "_") || "Be"}.pdf`);
    } catch (err) {
      console.error(err);
      alert("Lỗi khi xuất PDF báo cáo");
    } finally {
      setExportingPdf(false);
    }
  };

  return (
    <div className="space-y-6 pb-12 max-w-4xl mx-auto">
      {/* Header & Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-emerald-100 shadow-sm">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.back()}
            className="w-10 h-10 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center transition-colors shrink-0"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <span
                className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider ${
                  report?.status === "TEACHER_CONFIRMED"
                    ? "bg-emerald-100 text-emerald-800 border border-emerald-200"
                    : "bg-amber-100 text-amber-800 border border-amber-200"
                }`}
              >
                {report?.status === "TEACHER_CONFIRMED" ? "✓ Giáo viên đã xác nhận" : "📝 Bản dự thảo (DRAFT)"}
              </span>
            </div>
            <h1 className="text-xl font-black text-slate-900 tracking-tight mt-1">
              Báo cáo Phát triển — {report?.student?.name}
            </h1>
          </div>
        </div>

        {/* Action Buttons Toolbar */}
        <div className="flex flex-wrap items-center gap-2">
          {!isEditing ? (
            <button
              onClick={() => setIsEditing(true)}
              className="inline-flex items-center gap-1.5 bg-slate-100 hover:bg-emerald-50 text-slate-700 hover:text-emerald-800 font-bold text-xs py-2.5 px-3.5 rounded-xl border border-slate-200"
            >
              <Edit3 className="w-4 h-4" />
              <span>✏️ Chỉnh sửa</span>
            </button>
          ) : (
            <button
              onClick={handleSaveEdit}
              disabled={saving}
              className="inline-flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs py-2.5 px-3.5 rounded-xl shadow-sm"
            >
              <Save className="w-4 h-4" />
              <span>{saving ? "Đang lưu..." : "Lưu thay đổi"}</span>
            </button>
          )}

          {report?.status !== "TEACHER_CONFIRMED" && (
            <button
              onClick={handleTeacherConfirm}
              disabled={saving}
              className="inline-flex items-center gap-1.5 bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs py-2.5 px-3.5 rounded-xl shadow-sm"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>✓ Giáo viên xác nhận</span>
            </button>
          )}

          <button
            onClick={handleExportReportPdf}
            disabled={exportingPdf}
            className="inline-flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs py-2.5 px-3.5 rounded-xl shadow-sm disabled:opacity-50"
          >
            {exportingPdf ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Printer className="w-4 h-4" />
            )}
            <span>{exportingPdf ? "Đang tạo PDF..." : "📄 Xuất PDF"}</span>
          </button>
        </div>
      </div>

      {loading ? (
        <div className="bg-white p-12 rounded-3xl text-center border border-emerald-100">
          <Loader2 className="w-8 h-8 text-emerald-600 animate-spin mx-auto" />
          <p className="text-xs text-slate-500 mt-2">Đang tải báo cáo...</p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Main Report Body Card */}
          <div className="bg-white rounded-3xl p-6 md:p-8 border border-emerald-100 shadow-sm space-y-6">
            {/* Overview Section */}
            <div className="space-y-2">
              <h3 className="font-extrabold text-slate-900 text-sm flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-emerald-600" />
                <span>1. Tổng quan Đánh giá Phát triển</span>
              </h3>
              {isEditing ? (
                <AutoGrowTextarea
                  minRows={4}
                  value={overview}
                  onChange={(e) => setOverview(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-2xl border border-slate-200 text-xs focus:ring-2 focus:ring-emerald-500"
                />
              ) : (
                <div className="bg-emerald-50/60 p-4 rounded-2xl border border-emerald-100 text-xs text-slate-800 leading-relaxed">
                  {overview}
                </div>
              )}
            </div>

            {/* Strengths & Progress */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <h4 className="font-bold text-xs text-amber-900">2. Điểm mạnh nổi bật của trẻ</h4>
                {isEditing ? (
                  <AutoGrowTextarea
                    minRows={4}
                    value={strengths}
                    onChange={(e) => setStrengths(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-2xl border border-slate-200 text-xs focus:ring-2 focus:ring-emerald-500"
                  />
                ) : (
                  <div className="bg-amber-50/60 p-4 rounded-2xl border border-amber-100 text-xs text-slate-800 leading-relaxed">
                    {strengths}
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <h4 className="font-bold text-xs text-sky-900">3. Tiến bộ theo thời gian</h4>
                {isEditing ? (
                  <AutoGrowTextarea
                    minRows={4}
                    value={progress}
                    onChange={(e) => setProgress(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-2xl border border-slate-200 text-xs focus:ring-2 focus:ring-emerald-500"
                  />
                ) : (
                  <div className="bg-sky-50/60 p-4 rounded-2xl border border-sky-100 text-xs text-slate-800 leading-relaxed">
                    {progress}
                  </div>
                )}
              </div>
            </div>

            {/* Areas to Support & Activities */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <h4 className="font-bold text-xs text-rose-900">4. Nội dung cần tiếp tục hỗ trợ</h4>
                {isEditing ? (
                  <AutoGrowTextarea
                    minRows={4}
                    value={areasToSupport}
                    onChange={(e) => setAreasToSupport(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-2xl border border-slate-200 text-xs focus:ring-2 focus:ring-emerald-500"
                  />
                ) : (
                  <div className="bg-rose-50/60 p-4 rounded-2xl border border-rose-100 text-xs text-slate-800 leading-relaxed">
                    {areasToSupport}
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <h4 className="font-bold text-xs text-purple-900">5. Gợi ý hoạt động tiếp theo</h4>
                {isEditing ? (
                  <AutoGrowTextarea
                    minRows={4}
                    value={suggestedActivities}
                    onChange={(e) => setSuggestedActivities(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-2xl border border-slate-200 text-xs focus:ring-2 focus:ring-emerald-500"
                  />
                ) : (
                  <div className="bg-purple-50/60 p-4 rounded-2xl border border-purple-100 text-xs text-slate-800 leading-relaxed">
                    {suggestedActivities}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Evidence Traceability Section */}
          <div className="bg-white rounded-3xl p-6 border border-emerald-100 shadow-sm space-y-4">
            <h3 className="font-extrabold text-slate-900 text-sm flex items-center gap-2">
              <Link2 className="w-4 h-4 text-emerald-600" />
              <span>Minh chứng Quan sát Thực tế Liên quan ({observations.length} quan sát)</span>
            </h3>

            <p className="text-xs text-slate-500">
              Mọi nội dung nhận xét do AI tổng hợp ở trên đều được truy ngược chính xác từ các quan sát thực tế do cô giáo ghi nhận dưới đây:
            </p>

            <div className="space-y-2">
              {observations.map((obs: any) => (
                <div key={obs.id} className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200/80 text-xs space-y-1">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="font-bold text-emerald-800">
                      [ID: {obs.id.slice(0, 8)}] • {obs.domain?.name || obs.category || "Quan sát"}
                    </span>
                    <span className="text-slate-400">
                      {new Date(obs.date).toLocaleDateString("vi-VN")}
                    </span>
                  </div>
                  <p className="text-slate-800">"{obs.content}"</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
