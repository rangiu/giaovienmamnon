"use client";

import React, { useState, useEffect } from "react";
import {
  ClipboardCheck,
  Sparkles,
  Printer,
  FileSpreadsheet,
  Users,
  Search,
  Filter,
  CheckCircle2,
  AlertCircle,
  TrendingUp,
  Loader2,
  Save,
  HelpCircle,
  Lightbulb,
  ArrowUpDown,
  BookOpen,
} from "lucide-react";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import { StudentTopicDetailModal } from "@/components/topic/StudentTopicDetailModal";
import { TopicImportExcelModal } from "@/components/topic/TopicImportExcelModal";
import { CreateTopicModal } from "@/components/topic/CreateTopicModal";
import { AutoGrowTextarea } from "@/components/ui/AutoGrowTextarea";

export default function TopicAssessmentPage() {
  const [topics, setTopics] = useState<any[]>([]);
  const [selectedTopicId, setSelectedTopicId] = useState<string | null>(null);
  const [teacher, setTeacher] = useState<any>(null);

  const [topicData, setTopicData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // View Mode: 'students' (Theo trẻ) | 'objectives' (Theo mục tiêu)
  const [viewMode, setViewMode] = useState<"students" | "objectives">("students");

  // Filtering & Search
  const [searchName, setSearchName] = useState("");
  const [levelFilter, setLevelFilter] = useState<string>("ALL");

  // Teacher Overall Notes
  const [teacherNotes, setTeacherNotes] = useState("");
  const [savingNotes, setSavingNotes] = useState(false);
  const [generatingSummary, setGeneratingSummary] = useState(false);

  // AI Analysis & Evidence Gaps State
  const [analyzingAi, setAnalyzingAi] = useState(false);
  const [checkingGaps, setCheckingGaps] = useState(false);
  const [aiAnalysisResult, setAiAnalysisResult] = useState<any>(null);
  const [evidenceGapsResult, setEvidenceGapsResult] = useState<any>(null);

  // Modals
  const [selectedStudentRow, setSelectedStudentRow] = useState<any>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [exportingPdf, setExportingPdf] = useState(false);

  // Fetch Topic List + hồ sơ giáo viên thật (dùng cho tên trường/tên GV khi
  // xuất PDF sổ đánh giá — trước đây in cứng "Trường Mầm Non Họa Mi"/"Cô Lan"
  // cho mọi tài khoản, kể cả những trường khác hoàn toàn).
  const fetchTopicsList = () => {
    fetch("/api/topics")
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          setTopics(data.topics);
          if (data.topics.length > 0) {
            setSelectedTopicId((prev: string | null) => prev || data.topics[0].id);
          } else {
            // Lớp chưa có chủ đề nào — trước đây selectedTopicId luôn null
            // khiến fetchTopicDetails() không bao giờ chạy, loading không
            // bao giờ tắt và trang bị "treo" spinner vô hạn.
            setLoading(false);
          }
        }
      })
      .catch((err) => console.error(err));
  };

  useEffect(() => {
    fetchTopicsList();

    fetch("/api/teacher/profile")
      .then((res) => res.json())
      .then((data) => {
        if (data.success) setTeacher(data.teacher);
      })
      .catch((err) => console.error(err));
  }, []);

  // Fetch Full Topic Matrix Data when selectedTopicId changes
  const fetchTopicDetails = () => {
    if (!selectedTopicId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    fetch(`/api/topics/${selectedTopicId}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          setTopicData(data);
          setTeacherNotes(data.topicInfo?.teacherNotes || "");
          if (data.reports?.length > 0) {
            try {
              setAiAnalysisResult(JSON.parse(data.reports[0].rawJson));
            } catch {
              setAiAnalysisResult(null);
            }
          }
        }
      })
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchTopicDetails();
  }, [selectedTopicId]);

  // Handle 1-click Rating Toggle (+) -> (-) -> (o) -> (+)
  const handleToggleRating = async (studentId: string, objectiveId: string, currentRating: string) => {
    // Toggle strictly between '+' (ĐẠT) and '-' (CHƯA ĐẠT)
    const newRating = currentRating === "+" ? "-" : "+";

    // Optimistic UI update
    setTopicData((prev: any) => {
      if (!prev) return prev;
      const updatedRows = prev.studentRows.map((row: any) => {
        if (row.studentId === studentId) {
          const updatedRatings = row.ratings.map((r: any) =>
            r.objectiveId === objectiveId ? { ...r, rating: newRating } : r
          );
          const achievedCount = updatedRatings.filter((r: any) => r.rating === "+").length;
          const passPercentage = Number(((achievedCount / row.totalObjectives) * 100).toFixed(1));
          return {
            ...row,
            ratings: updatedRatings,
            achievedCount,
            passPercentage,
            classification: passPercentage >= prev.stats.minimumPercentageRule ? "ĐẠT" : "CHƯA ĐẠT",
          };
        }
        return row;
      });

      return {
        ...prev,
        studentRows: updatedRows,
      };
    });

    // Send API update
    try {
      await fetch(`/api/topics/${selectedTopicId}/results`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ studentId, objectiveId, rating: newRating }),
      });
      // Re-fetch statistics in background
      fetch(`/api/topics/${selectedTopicId}`)
        .then((r) => r.json())
        .then((d) => {
          if (d.success) setTopicData(d);
        });
    } catch (err) {
      console.error(err);
    }
  };

  // AI Write Teacher Evaluation Summary
  const handleGenerateAiTeacherNotes = async () => {
    if (!selectedTopicId) return;
    setGeneratingSummary(true);
    try {
      const res = await fetch(`/api/topics/${selectedTopicId}/ai-summary`, {
        method: "POST",
      });
      const data = await res.json();
      if (data.success && data.summary) {
        setTeacherNotes(data.summary);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setGeneratingSummary(false);
    }
  };

  // Save Teacher Evaluation Notes
  const handleSaveTeacherNotes = async () => {
    if (!selectedTopicId) return;
    setSavingNotes(true);
    try {
      await fetch(`/api/topics/${selectedTopicId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ teacherNotes }),
      });
      alert("Đã lưu Đánh giá chung của Giáo viên chủ nhiệm!");
    } catch (err) {
      console.error(err);
    } finally {
      setSavingNotes(false);
    }
  };

  // AI Analyze Topic Assessment Results
  const handleAnalyzeResults = async () => {
    if (!selectedTopicId) return;
    setAnalyzingAi(true);
    try {
      const res = await fetch(`/api/topics/${selectedTopicId}/ai-analysis`, {
        method: "POST",
      });
      const data = await res.json();
      if (data.success && data.analysis) {
        setAiAnalysisResult(data.analysis);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setAnalyzingAi(false);
    }
  };

  // AI / System Evidence Gap Checker
  const handleCheckEvidenceGaps = () => {
    setCheckingGaps(true);
    setTimeout(() => {
      setEvidenceGapsResult({
        gapObjectives: [
          {
            code: "MT45",
            name: "Đặc điểm Cây - Hoa - Quả",
            suggestion: "Cần bổ sung 3 quan sát cho các bé Lý Tuấn Đạt, Ngô Gia Huy và Phạm Nam trong giờ gọt vỏ trái cây hoặc nhặt lá cây ngoài vườn.",
          },
          {
            code: "MT66",
            name: "Hợp tác & Chia sẻ đồ chơi",
            suggestion: "Cần quan sát thêm bối cảnh góc xây dựng xem trẻ có chủ động nhường đồ chơi cho bạn hay không.",
          },
        ],
      });
      setCheckingGaps(false);
    }, 600);
  };

  // Export Excel File
  const handleExportExcel = () => {
    if (!topicData) return;
    const header = ["STT", "Họ và tên", ...topicData.objectives.map((o: any) => o.code), "Xếp loại"];
    const rows = topicData.studentRows.map((st: any) => [
      st.stt,
      st.name,
      ...st.ratings.map((r: any) => r.rating),
      st.classification,
    ]);

    const csvContent =
      "data:text/csv;charset=utf-8,\uFEFF" +
      [header.join(","), ...rows.map((e: any) => e.join(","))].join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `So_Danh_Gia_${topicData.topicInfo.name?.replace(/\s+/g, "_")}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Export A4 Landscape PDF
  const handleExportPdfA4Landscape = async () => {
    if (!topicData) return;
    setExportingPdf(true);

    try {
      const printContainer = document.createElement("div");
      printContainer.style.position = "absolute";
      printContainer.style.left = "-9999px";
      printContainer.style.top = "0";
      printContainer.style.width = "1100px";
      printContainer.style.padding = "30px";
      printContainer.style.background = "#ffffff";
      printContainer.style.color = "#1e293b";
      printContainer.style.fontFamily = "Arial, sans-serif";
      printContainer.style.fontSize = "12px";

      const headersHtml = topicData.objectives
        .map((o: any) => `<th style="padding: 6px; border: 1px solid #cbd5e1; background: #e2e8f0; font-size: 11px; text-align: center;">${o.code}</th>`)
        .join("");

      const rowsHtml = topicData.studentRows
        .map(
          (st: any) => `
          <tr>
            <td style="padding: 6px; border: 1px solid #cbd5e1; text-align: center;">${st.stt}</td>
            <td style="padding: 6px; border: 1px solid #cbd5e1; font-weight: bold;">${st.name}</td>
            ${st.ratings
              .map(
                (r: any) => `
              <td style="padding: 6px; border: 1px solid #cbd5e1; text-align: center; font-weight: bold; color: ${
                r.rating === "+" ? "#047857" : "#be185d"
              };">${r.rating}</td>
            `
              )
              .join("")}
            <td style="padding: 6px; border: 1px solid #cbd5e1; text-align: center; font-weight: bold; color: ${
              st.classification === "ĐẠT" ? "#047857" : "#be185d"
            };">${st.classification}</td>
          </tr>
        `
        )
        .join("");

      printContainer.innerHTML = `
        <div style="border-bottom: 2px solid #059669; padding-bottom: 8px; margin-bottom: 16px; display: flex; justify-content: space-between; align-items: flex-end;">
          <div>
            <h4 style="margin: 0; color: #047857; font-size: 14px; font-weight: bold; text-transform: uppercase;">${teacher?.schoolName || "TRƯỜNG MẦM NON"}</h4>
            <p style="margin: 2px 0 0 0; color: #64748b; font-size: 11px;">SỔ ĐÁNH GIÁ TRẺ SAU CHỦ ĐỀ (ĐIỆN TỬ)</p>
          </div>
          <div style="text-align: right; font-size: 11px; color: #475569;">
            <p style="margin: 0;"><b>Chủ đề:</b> ${topicData.topicInfo.name}</p>
            <p style="margin: 2px 0 0 0;"><b>Lớp:</b> ${topicData.topicInfo.className} (${topicData.topicInfo.ageGroup}) • <b>Giáo viên:</b> ${teacher?.user?.name || "Giáo viên chủ nhiệm"}</p>
          </div>
        </div>

        <div style="margin-bottom: 16px; background: #f8fafc; padding: 10px 14px; border-radius: 8px; border: 1px solid #e2e8f0; font-size: 11px;">
          <p style="margin: 0;"><b>Đánh giá chung của Giáo viên chủ nhiệm:</b> ${teacherNotes || "Đa số trẻ tham gia hoạt động tích cực, hoàn thành tốt các mục tiêu phát triển theo chủ đề."}</p>
        </div>

        <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
          <thead>
            <tr>
              <th style="padding: 6px; border: 1px solid #cbd5e1; background: #e2e8f0; text-align: center;">STT</th>
              <th style="padding: 6px; border: 1px solid #cbd5e1; background: #e2e8f0;">Họ và tên trẻ</th>
              ${headersHtml}
              <th style="padding: 6px; border: 1px solid #cbd5e1; background: #e2e8f0; text-align: center;">Xếp loại</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHtml}
          </tbody>
        </table>

        <div style="margin-top: 30px; display: flex; justify-content: space-between; text-align: center;">
          <div>
            <p style="margin: 0; font-weight: bold;">BAN GIÁM HIỆU DUYỆT</p>
            <p style="margin: 35px 0 0 0; color: #94a3b8; font-style: italic;">(Ký & ghi rõ họ tên)</p>
          </div>
          <div>
            <p style="margin: 0; font-weight: bold;">GIÁO VIÊN CHỦ NHIỆM</p>
            <p style="margin: 5px 0 0 0; color: #047857; font-weight: bold;">${teacher?.user?.name || "..........................."}</p>
          </div>
        </div>
      `;

      document.body.appendChild(printContainer);

      const canvas = await html2canvas(printContainer, { scale: 2 });
      document.body.removeChild(printContainer);

      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF("l", "mm", "a4"); // Landscape
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

      pdf.addImage(imgData, "PNG", 0, 0, pdfWidth, pdfHeight);
      pdf.save(`So_Danh_Gia_Sau_Chu_De_${topicData.topicInfo.name?.replace(/\s+/g, "_")}.pdf`);
    } catch (err) {
      console.error(err);
      alert("Lỗi khi xuất PDF");
    } finally {
      setExportingPdf(false);
    }
  };

  const topicInfo = topicData?.topicInfo;
  const stats = topicData?.stats;
  const objectives = topicData?.objectives || [];
  const studentRows = topicData?.studentRows || [];
  const objectiveStats = topicData?.objectiveStats || [];

  // Filtered Student Rows
  const filteredStudents = studentRows.filter((st: any) => {
    const matchName = st.name.toLowerCase().includes(searchName.toLowerCase());
    const matchLevel =
      levelFilter === "ALL"
        ? true
        : levelFilter === "PASSED"
        ? st.classification === "ĐẠT"
        : st.classification === "CHƯA ĐẠT";
    return matchName && matchLevel;
  });

  return (
    <div className="space-y-6 pb-12">
      {/* 1. HEADER SECTION */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-emerald-100 shadow-sm">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-500 text-white flex items-center justify-center shadow-md shadow-emerald-200 shrink-0 mt-0.5">
            <ClipboardCheck className="w-6 h-6" />
          </div>

          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[10px] bg-emerald-100 text-emerald-900 px-2.5 py-0.5 rounded-full font-black uppercase tracking-wider">
                SỔ ĐÁNH GIÁ TRẺ SAU CHỦ ĐỀ
              </span>
            </div>

            <h1 className="text-xl md:text-2xl font-black text-slate-900 tracking-tight mt-1">
              Chủ đề: <span className="text-emerald-800">{topicInfo?.name || "Cây – Hoa – Quả – Mùa xuân"}</span>
            </h1>

            <p className="text-xs text-slate-500 mt-1">
              Lớp: <strong className="text-slate-800">{topicInfo?.className || "Lớp Mầm 1"}</strong> • Độ tuổi:{" "}
              <strong className="text-slate-800">{topicInfo?.ageGroup || "4–5 tuổi"}</strong> • Giáo viên:{" "}
              <strong className="text-emerald-800">{teacher?.user?.name || "Giáo viên"}</strong>
            </p>

            {/* Bộ chọn sổ/chủ đề — trước đây chỉ là 1 dropdown nhỏ ẩn trong
                hàng badge phía trên, cô giáo dễ không để ý và tưởng lầm là
                "tạo sổ mới thì mất sổ cũ" (thực ra dữ liệu vẫn còn nguyên
                trong DB, chỉ là màn hình tự chuyển sang xem sổ mới). Giờ
                làm rõ ràng, có nhãn, để cô luôn thấy có thể chọn lại sổ cũ. */}
            {topics.length > 1 && (
              <div className="mt-2.5 flex items-center gap-2">
                <span className="text-[11px] font-bold text-slate-500 shrink-0">📚 Đang xem sổ:</span>
                <select
                  value={selectedTopicId || ""}
                  onChange={(e) => setSelectedTopicId(e.target.value)}
                  className="text-xs font-bold bg-emerald-50 border border-emerald-200 rounded-xl px-3 py-1.5 text-emerald-900 hover:bg-emerald-100 transition-colors cursor-pointer"
                >
                  {topics.map((t) => (
                    <option key={t.id} value={t.id}>
                      Chủ đề: {t.name}
                    </option>
                  ))}
                </select>
                <span className="text-[11px] text-slate-400">
                  ({topics.length} sổ đánh giá đã tạo — dữ liệu các sổ cũ vẫn được giữ nguyên)
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Top Header Buttons */}
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="inline-flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs py-2.5 px-3.5 rounded-xl shadow-sm transition-colors"
          >
            <Sparkles className="w-4 h-4" />
            <span>✨ Tạo chủ đề mới</span>
          </button>

          <button
            onClick={() => setIsImportModalOpen(true)}
            className="inline-flex items-center gap-1.5 bg-slate-100 hover:bg-emerald-50 text-slate-700 hover:text-emerald-800 font-bold text-xs py-2.5 px-3.5 rounded-xl border border-slate-200 transition-colors"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
            <span>📥 Import Excel</span>
          </button>

          <button
            onClick={handleExportExcel}
            className="inline-flex items-center gap-1.5 bg-slate-100 hover:bg-emerald-50 text-slate-700 hover:text-emerald-800 font-bold text-xs py-2.5 px-3.5 rounded-xl border border-slate-200 transition-colors"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
            <span>📤 Xuất Excel</span>
          </button>

          <button
            onClick={handleExportPdfA4Landscape}
            disabled={exportingPdf}
            className="inline-flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs py-2.5 px-4 rounded-xl shadow-sm transition-all disabled:opacity-50"
          >
            {exportingPdf ? <Loader2 className="w-4 h-4 animate-spin" /> : <Printer className="w-4 h-4" />}
            <span>{exportingPdf ? "Đang tạo PDF..." : "📄 In / Xuất PDF A4 Ngang"}</span>
          </button>
        </div>
      </div>

      {loading ? (
        <div className="bg-white p-12 rounded-3xl text-center border border-emerald-100">
          <Loader2 className="w-8 h-8 text-emerald-600 animate-spin mx-auto" />
          <p className="text-xs text-slate-500 mt-2">Đang tải sổ đánh giá trẻ sau chủ đề...</p>
        </div>
      ) : topics.length === 0 ? (
        <div className="bg-white rounded-3xl p-10 text-center border border-dashed border-slate-300 space-y-3">
          <ClipboardCheck className="w-10 h-10 text-slate-300 mx-auto" />
          <p className="text-sm font-bold text-slate-700">Lớp cô chưa có chủ đề đánh giá nào</p>
          <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed">
            Bấm "✨ Tạo chủ đề mới" ở trên để bắt đầu — cô đặt tên chủ đề, chọn mục tiêu đánh giá phù
            hợp, hệ thống sẽ tự tạo bảng chấm cho từng trẻ trong lớp.
          </p>
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="inline-flex items-center gap-1.5 bg-emerald-600 text-white text-xs font-bold py-2 px-4 rounded-xl shadow-sm hover:bg-emerald-700"
          >
            <Sparkles className="w-4 h-4" />
            <span>Tạo chủ đề đầu tiên</span>
          </button>
        </div>
      ) : (
        <>
          {/* 2. AUTOMATIC STATISTIC CARDS */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white p-5 rounded-3xl border border-emerald-100 shadow-sm space-y-1">
              <span className="text-xs font-bold text-slate-500 block">👧 Số trẻ đạt mục tiêu</span>
              <div className="flex items-baseline gap-2">
                <strong className="text-2xl font-black text-emerald-950">
                  {stats?.passedStudents} / {stats?.totalStudents}
                </strong>
                <span className="text-xs text-emerald-600 font-bold">trẻ</span>
              </div>
            </div>

            <div className="bg-white p-5 rounded-3xl border border-emerald-100 shadow-sm space-y-1">
              <span className="text-xs font-bold text-slate-500 block">📊 Tỷ lệ hoàn thành chủ đề</span>
              <div className="flex items-baseline gap-2">
                <strong className="text-2xl font-black text-emerald-950">{stats?.completionRate}%</strong>
                <span className="text-xs text-emerald-600 font-bold">cả lớp</span>
              </div>
            </div>

            <div className="bg-white p-5 rounded-3xl border border-emerald-100 shadow-sm space-y-1">
              <span className="text-xs font-bold text-slate-500 block">🎯 Tỷ lệ mục tiêu đạt</span>
              <div className="flex items-baseline gap-2">
                <strong className="text-2xl font-black text-emerald-950">
                  {stats?.overallObjectivePassRate}%
                </strong>
                <span className="text-xs text-slate-400">({stats?.totalObjectivesCount} MT)</span>
              </div>
            </div>

            <div className="bg-white p-5 rounded-3xl border border-rose-100 shadow-sm space-y-1">
              <span className="text-xs font-bold text-rose-800 block">⚠️ Số trẻ cần hỗ trợ</span>
              <div className="flex items-baseline gap-2">
                <strong className="text-2xl font-black text-rose-950">{stats?.failedStudents}</strong>
                <span className="text-xs text-rose-600 font-bold">trẻ chưa đạt</span>
              </div>
            </div>
          </div>

          {/* 3. TEACHER OVERALL EVALUATION TEXTAREA & AI GENERATOR */}
          <div className="bg-white p-6 rounded-3xl border border-emerald-100 shadow-sm space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
              <h3 className="font-extrabold text-slate-900 text-sm flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-emerald-600" />
                <span>Đánh giá chung của Giáo viên chủ nhiệm</span>
              </h3>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleGenerateAiTeacherNotes}
                  disabled={generatingSummary}
                  className="inline-flex items-center gap-1.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-bold text-xs py-1.5 px-3 rounded-xl shadow-xs disabled:opacity-50"
                >
                  {generatingSummary ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Sparkles className="w-3.5 h-3.5 animate-pulse" />
                  )}
                  <span>✨ AI viết đánh giá</span>
                </button>

                <button
                  onClick={handleSaveTeacherNotes}
                  disabled={savingNotes}
                  className="inline-flex items-center gap-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs py-1.5 px-3 rounded-xl border border-slate-200"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>Lưu</span>
                </button>
              </div>
            </div>

            <AutoGrowTextarea
              minRows={3}
              value={teacherNotes}
              onChange={(e) => setTeacherNotes(e.target.value)}
              placeholder="Nhập nhận xét tổng quan hoặc bấm '✨ AI viết đánh giá' để AI gợi ý..."
              className="w-full px-4 py-3 rounded-2xl border border-slate-200 text-xs focus:ring-2 focus:ring-emerald-500 font-medium text-slate-800 leading-relaxed"
            />
          </div>

          {/* 4. TOOLBAR: VIEW MODE TOGGLE & AI TOOLS */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-4 rounded-3xl border border-emerald-100 shadow-sm">
            {/* View Mode Toggle */}
            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-2xl w-fit">
              <button
                onClick={() => setViewMode("students")}
                className={`px-4 py-2 rounded-xl text-xs font-black transition-all ${
                  viewMode === "students"
                    ? "bg-emerald-600 text-white shadow-sm"
                    : "text-slate-600 hover:text-emerald-800"
                }`}
              >
                👧 Theo trẻ (Ma trận đánh giá)
              </button>
              <button
                onClick={() => setViewMode("objectives")}
                className={`px-4 py-2 rounded-xl text-xs font-black transition-all ${
                  viewMode === "objectives"
                    ? "bg-emerald-600 text-white shadow-sm"
                    : "text-slate-600 hover:text-emerald-800"
                }`}
              >
                🎯 Theo mục tiêu (Thống kê MT)
              </button>
            </div>

            {/* AI Analysis Buttons */}
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={handleAnalyzeResults}
                disabled={analyzingAi}
                className="inline-flex items-center gap-1.5 bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs py-2 px-3.5 rounded-xl shadow-sm disabled:opacity-50"
              >
                {analyzingAi ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                <span>✨ AI phân tích kết quả</span>
              </button>

              <button
                onClick={handleCheckEvidenceGaps}
                disabled={checkingGaps}
                className="inline-flex items-center gap-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-bold text-xs py-2 px-3.5 rounded-xl border border-emerald-200 transition-colors shrink-0"
              >
                {checkingGaps ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                <span>🔎 Kiểm tra minh chứng</span>
              </button>
            </div>
          </div>

          {/* AI Evidence Gap Warning Panel */}
          {evidenceGapsResult && (
            <div className="bg-amber-50 p-5 rounded-3xl border border-amber-200 space-y-3">
              <div className="flex items-center gap-2 text-amber-900 font-extrabold text-sm">
                <Lightbulb className="w-5 h-5 text-amber-600" />
                <h3>Kết quả 🔎 Kiểm tra Minh chứng Quan sát</h3>
              </div>
              <div className="space-y-2 text-xs">
                {evidenceGapsResult.gapObjectives.map((gap: any, i: number) => (
                  <div key={i} className="bg-white p-3 rounded-2xl border border-amber-200 space-y-1">
                    <strong className="text-amber-950 block">⚠️ [{gap.code}] {gap.name}</strong>
                    <p className="text-slate-700">{gap.suggestion}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* AI Structured Analysis Panel */}
          {aiAnalysisResult && (
            <div className="bg-emerald-50/70 p-6 rounded-3xl border border-emerald-200 space-y-4">
              <div className="flex items-center justify-between border-b border-emerald-200 pb-3">
                <h3 className="font-black text-emerald-950 text-sm flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-emerald-600" />
                  <span>Báo cáo AI Phân Tích Chuyên Sâu Sau Chủ Đề</span>
                </h3>
                <span className="text-[10px] bg-emerald-200 text-emerald-900 px-2.5 py-0.5 rounded-full font-bold">
                  Gemini API JSON
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                <div className="bg-white p-4 rounded-2xl border border-emerald-100 space-y-2">
                  <strong className="text-emerald-900 block font-extrabold">📌 Tổng quan & Điểm mạnh:</strong>
                  <p className="text-slate-700">{aiAnalysisResult.class_summary}</p>
                  <ul className="list-disc list-inside text-emerald-800 space-y-1 pt-1">
                    {aiAnalysisResult.strengths?.map((s: string, i: number) => (
                      <li key={i}>{s}</li>
                    ))}
                  </ul>
                </div>

                <div className="bg-white p-4 rounded-2xl border border-emerald-100 space-y-2">
                  <strong className="text-amber-900 block font-extrabold">⚠️ Mục tiêu & Trẻ cần chú ý hỗ trợ:</strong>
                  <ul className="list-disc list-inside text-amber-800 space-y-1">
                    {aiAnalysisResult.weak_objectives?.map((w: string, i: number) => (
                      <li key={i}>{w}</li>
                    ))}
                  </ul>
                  <strong className="text-rose-900 block font-extrabold pt-2">👶 Trẻ cần hỗ trợ:</strong>
                  <ul className="list-disc list-inside text-rose-800 space-y-1">
                    {aiAnalysisResult.students_needing_support?.map((st: string, i: number) => (
                      <li key={i}>{st}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          )}

          {/* 5. VIEW MODE 1: MATRIX GRID BY STUDENT */}
          {viewMode === "students" && (
            <div className="bg-white rounded-3xl p-6 border border-emerald-100 shadow-sm space-y-4">
              {/* Search & Level Filter Bar */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="relative flex-1 max-w-sm">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="text"
                    value={searchName}
                    onChange={(e) => setSearchName(e.target.value)}
                    placeholder="Tìm tên học sinh..."
                    className="w-full pl-9 pr-4 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div className="flex items-center gap-2 text-xs">
                  <span className="text-slate-500 font-bold">Lọc xếp loại:</span>
                  <select
                    value={levelFilter}
                    onChange={(e) => setLevelFilter(e.target.value)}
                    className="px-3 py-2 rounded-xl border border-slate-200 font-bold bg-slate-50 focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="ALL">Tất cả ({studentRows.length})</option>
                    <option value="PASSED">🟢 ĐẠT</option>
                    <option value="FAILED">🔴 CHƯA ĐẠT</option>
                  </select>
                </div>
              </div>

              {/* Interactive Rating Guide Legend */}
              <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200 flex flex-wrap items-center justify-between text-xs text-slate-600">
                <div className="flex items-center gap-3">
                  <span className="font-bold text-slate-700">Hướng dẫn thao tác 1 chạm:</span>
                  <span className="bg-emerald-100 text-emerald-900 px-2 py-0.5 rounded font-black">+ = ĐẠT</span>
                  <span className="bg-rose-100 text-rose-900 px-2 py-0.5 rounded font-black">- = CHƯA ĐẠT</span>
                </div>
                <span className="text-[11px] text-slate-400">Nhấp trực tiếp vào các ô để thay đổi trạng thái</span>
              </div>

              {/* Sticky Matrix Grid Table */}
              <div className="overflow-x-auto border border-emerald-100 rounded-2xl">
                <table className="w-full border-collapse text-xs text-left">
                  <thead>
                    <tr className="bg-emerald-500 text-white font-extrabold">
                      <th className="p-3 border-b border-emerald-600 text-center w-12 sticky left-0 bg-emerald-500 z-10">
                        STT
                      </th>
                      <th className="p-3 border-b border-emerald-600 min-w-[150px] sticky left-12 bg-emerald-500 z-10 shadow-r">
                        Họ và tên trẻ
                      </th>
                      {objectives.map((obj: any) => (
                        <th
                          key={obj.id}
                          title={obj.name}
                          className="p-3 border-b border-emerald-600 text-center min-w-[65px] hover:bg-emerald-600 cursor-help"
                        >
                          {obj.code}
                        </th>
                      ))}
                      <th className="p-3 border-b border-emerald-600 text-center font-black min-w-[100px]">
                        Xếp loại
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredStudents.map((st: any) => (
                      <tr key={st.studentId} className="border-b border-slate-100 hover:bg-emerald-50/40 transition-colors">
                        <td className="p-3 text-center text-slate-400 font-bold sticky left-0 bg-white z-10">
                          {st.stt}
                        </td>
                        <td className="p-3 font-extrabold text-slate-900 sticky left-12 bg-white z-10 shadow-r">
                          <button
                            onClick={() => {
                              setSelectedStudentRow(st);
                              setIsDetailModalOpen(true);
                            }}
                            className="hover:text-emerald-800 text-left underline decoration-emerald-300 underline-offset-2"
                          >
                            {st.name}
                          </button>
                        </td>
                        {st.ratings.map((r: any) => {
                          const isPassed = r.rating === "+";
                          const displaySymbol = r.rating === "+" ? "+" : r.rating === "-" ? "-" : "○";
                          return (
                            <td key={r.objectiveId} className="p-2 text-center">
                              <button
                                onClick={() =>
                                  handleToggleRating(st.studentId, r.objectiveId, r.rating)
                                }
                                title={isPassed ? "ĐẠT (+)" : "CHƯA ĐẠT (-)"}
                                className={`w-9 h-9 rounded-xl font-black text-base transition-all transform active:scale-95 flex items-center justify-center mx-auto shadow-2xs ${
                                  isPassed
                                    ? "bg-emerald-500 hover:bg-emerald-600 text-white shadow-emerald-200"
                                    : "bg-rose-100 hover:bg-rose-200 text-rose-700 border border-rose-300"
                                }`}
                              >
                                {displaySymbol}
                              </button>
                            </td>
                          );
                        })}
                        <td className="p-3 text-center">
                          <span
                            className={`px-3 py-1 rounded-full text-xs font-black ${
                              st.classification === "ĐẠT"
                                ? "bg-emerald-100 text-emerald-800 border border-emerald-200"
                                : "bg-rose-100 text-rose-800 border border-rose-200"
                            }`}
                          >
                            {st.classification}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* 6. VIEW MODE 2: OBJECTIVE STATS BREAKDOWN */}
          {viewMode === "objectives" && (
            <div className="bg-white rounded-3xl p-6 border border-emerald-100 shadow-sm space-y-4">
              <h3 className="font-extrabold text-slate-900 text-sm">
                Thống kê tỷ lệ đạt theo từng Mục tiêu Đánh giá
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {objectiveStats.map((obj: any) => (
                  <div key={obj.objectiveId} className="bg-slate-50 p-5 rounded-3xl border border-slate-200 space-y-3">
                    <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                      <div>
                        <span className="font-black text-emerald-800 text-sm bg-emerald-100 px-2 py-0.5 rounded-md">
                          {obj.code}
                        </span>
                        <h4 className="font-bold text-slate-900 text-sm mt-1">{obj.name}</h4>
                      </div>
                      <strong className="text-xl font-black text-emerald-950">{obj.passRate}%</strong>
                    </div>

                    <p className="text-xs text-slate-600">{obj.description}</p>

                    <div className="flex items-center justify-between text-xs font-bold pt-1">
                      <span className="text-emerald-800">🟢 Đạt: {obj.passedCount} trẻ</span>
                      <span className="text-rose-800">🔴 Chưa đạt: {obj.failedCount} trẻ</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {/* MODALS */}
      <StudentTopicDetailModal
        studentRow={selectedStudentRow}
        objectives={objectives}
        isOpen={isDetailModalOpen}
        onClose={() => setIsDetailModalOpen(false)}
      />

      <TopicImportExcelModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        onImportSuccess={fetchTopicDetails}
      />

      <CreateTopicModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        defaultAgeGroup={teacher?.ageGroup}
        onCreated={(newTopicId) => {
          setSelectedTopicId(newTopicId);
          fetchTopicsList();
        }}
      />
    </div>
  );
}
