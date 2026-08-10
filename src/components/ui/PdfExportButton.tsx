"use client";

import React, { useState } from "react";
import { Download, Loader2, Printer } from "lucide-react";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";

interface PdfExportButtonProps {
  lesson: any;
  filename?: string;
}

export function PdfExportButton({ lesson, filename }: PdfExportButtonProps) {
  const [loading, setLoading] = useState(false);

  const handleExportPdf = async () => {
    if (!lesson) return;
    setLoading(true);

    try {
      // 1. Create a hidden element for printing with high-quality A4 layout
      const printContainer = document.createElement("div");
      printContainer.id = "pdf-export-container";
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

      // Parse JSON fields safely
      const parseField = (field: any) => {
        if (!field) return null;
        if (typeof field === "object") return field;
        try {
          return JSON.parse(field);
        } catch {
          return field;
        }
      };

      const objs = parseField(lesson.objectives) || {};
      const preps = parseField(lesson.preparation) || {};
      const teacherActs = parseField(lesson.teacherActivities) || [];
      const childActs = parseField(lesson.childActivities) || [];
      const openQs = parseField(lesson.openQuestions) || [];
      const game = parseField(lesson.reinforcementGame) || {};

      printContainer.innerHTML = `
        <div style="border-bottom: 2px solid #059669; padding-bottom: 12px; margin-bottom: 20px; display: flex; justify-content: space-between; align-items: flex-end;">
          <div>
            <h4 style="margin: 0; color: #047857; font-size: 14px; text-transform: uppercase; font-weight: bold;">TRƯỜNG MẦM NON HỌA MI</h4>
            <p style="margin: 2px 0 0 0; color: #64748b; font-size: 12px;">GIÁO ÁN PHÁT TRIỂN TOÀN DIỆN MẦM NON</p>
          </div>
          <div style="text-align: right; font-size: 12px; color: #475569;">
            <p style="margin: 0;"><b>Giáo viên:</b> Cô Nguyễn Thị Lan</p>
            <p style="margin: 2px 0 0 0;"><b>Lớp:</b> Mầm 1 (${lesson.ageGroup || "4-5 tuổi"})</p>
          </div>
        </div>

        <div style="text-align: center; margin-bottom: 24px;">
          <h1 style="margin: 0; color: #065f46; font-size: 22px; font-weight: bold;">${lesson.title || "GIÁO ÁN MẦM NON"}</h1>
          <div style="display: flex; justify-content: center; gap: 20px; font-size: 13px; color: #475569; margin-top: 8px;">
            <span>⏱ <b>Thời lượng:</b> ${lesson.duration || "30 phút"}</span>
            <span>📂 <b>Chủ đề:</b> ${lesson.topic || "Khám phá khoa học"}</span>
            <span>👶 <b>Độ tuổi:</b> ${lesson.ageGroup || "4-5 tuổi"}</span>
          </div>
        </div>

        <!-- Section 1: Objectives -->
        <div style="margin-bottom: 16px; background: #f0fdf4; padding: 12px 16px; border-radius: 8px; border-left: 4px solid #10b981;">
          <h3 style="margin: 0 0 6px 0; color: #047857; font-size: 14px;">I. MỤC TIÊU BÀI HỌC</h3>
          <p style="margin: 4px 0;"><b>1. Kiến thức:</b> ${typeof objs === "object" ? (objs.knowledge || "Nhận biết nội dung") : objs}</p>
          <p style="margin: 4px 0;"><b>2. Kỹ năng:</b> ${typeof objs === "object" ? (objs.skills || "Rèn kỹ năng quan sát") : ""}</p>
          <p style="margin: 4px 0;"><b>3. Thái độ:</b> ${typeof objs === "object" ? (objs.attitude || "Trẻ tích cực tham gia") : ""}</p>
        </div>

        <!-- Section 2: Preparation -->
        <div style="margin-bottom: 16px; background: #fffbeb; padding: 12px 16px; border-radius: 8px; border-left: 4px solid #f59e0b;">
          <h3 style="margin: 0 0 6px 0; color: #b45309; font-size: 14px;">II. CHUẨN BỊ</h3>
          <p style="margin: 4px 0;"><b>• Của Giáo viên:</b> ${typeof preps === "object" ? (preps.teacher || "Đạo cụ giảng dạy") : preps}</p>
          <p style="margin: 4px 0;"><b>• Của Trẻ em:</b> ${typeof preps === "object" ? (preps.child || "Trang phục gọn gàng") : ""}</p>
        </div>

        <!-- Section 3: Detailed Activities -->
        <div style="margin-bottom: 16px;">
          <h3 style="margin: 0 0 8px 0; color: #0f172a; font-size: 14px; border-bottom: 1px solid #e2e8f0; padding-bottom: 4px;">III. TIẾN TRÌNH HOẠT ĐỘNG SƯ PHẠM</h3>
          
          <div style="margin-bottom: 10px;">
            <h4 style="margin: 4px 0; color: #047857;">1. Hoạt động của Cô giáo:</h4>
            <ul style="margin: 4px 0 8px 20px; padding: 0;">
              ${Array.isArray(teacherActs) ? teacherActs.map((act: string) => `<li style="margin-bottom: 4px;">${act}</li>`).join("") : `<li>${teacherActs}</li>`}
            </ul>
          </div>

          <div style="margin-bottom: 10px;">
            <h4 style="margin: 4px 0; color: #0284c7;">2. Hoạt động của Trẻ em:</h4>
            <ul style="margin: 4px 0 8px 20px; padding: 0;">
              ${Array.isArray(childActs) ? childActs.map((act: string) => `<li style="margin-bottom: 4px;">${act}</li>`).join("") : `<li>${childActs}</li>`}
            </ul>
          </div>
        </div>

        <!-- Section 4: Questions & Game -->
        <div style="margin-bottom: 16px; display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
          <div style="background: #f8fafc; padding: 12px; border-radius: 8px; border: 1px solid #e2e8f0;">
            <h4 style="margin: 0 0 6px 0; color: #334155;">❓ Câu hỏi gợi mở:</h4>
            <ul style="margin: 0 0 0 16px; padding: 0;">
              ${Array.isArray(openQs) ? openQs.map((q: string) => `<li style="margin-bottom: 3px;">${q}</li>`).join("") : `<li>${openQs}</li>`}
            </ul>
          </div>

          <div style="background: #fdf2f8; padding: 12px; border-radius: 8px; border: 1px solid #fbcfe8;">
            <h4 style="margin: 0 0 6px 0; color: #be185d;">🎮 Trò chơi củng cố: ${game.name || "Trò chơi củng cố"}</h4>
            <p style="margin: 2px 0;"><b>Luật chơi:</b> ${game.rules || "Hào hứng tham gia"}</p>
            <p style="margin: 2px 0;"><b>Cách chơi:</b> ${game.how_to_play || "Thực hiện theo cô"}</p>
          </div>
        </div>

        <!-- Section 5: Assessment & Extension -->
        <div style="margin-bottom: 24px; font-size: 12px; color: #475569;">
          <p style="margin: 4px 0;"><b>📌 Kết thúc & Đánh giá:</b> ${lesson.conclusion || ""} ${lesson.assessment || ""}</p>
          <p style="margin: 4px 0;"><b>🎨 Mở rộng:</b> ${lesson.extension || ""}</p>
        </div>

        <!-- Signatures -->
        <div style="margin-top: 40px; display: flex; justify-content: space-between; text-align: center; page-break-inside: avoid;">
          <div>
            <p style="margin: 0; font-weight: bold;">BAN GIÁM HIỆU DUYỆT</p>
            <p style="margin: 40px 0 0 0; color: #94a3b8; font-style: italic;">(Ký & ghi rõ họ tên)</p>
          </div>
          <div>
            <p style="margin: 0; font-weight: bold;">GIÁO VIÊN SOẠN THẢO</p>
            <p style="margin: 5px 0 0 0; color: #047857; font-bold: bold;">Cô Nguyễn Thị Lan</p>
          </div>
        </div>
      `;

      document.body.appendChild(printContainer);

      // Render canvas
      const canvas = await html2canvas(printContainer, {
        scale: 2,
        useCORS: true,
      });

      document.body.removeChild(printContainer);

      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF("p", "mm", "a4");
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

      pdf.addImage(imgData, "PNG", 0, 0, pdfWidth, pdfHeight);
      pdf.save(filename || `Giao_An_${lesson.title?.replace(/\s+/g, "_") || "Co_AI"}.pdf`);
    } catch (err) {
      console.error("PDF export failed:", err);
      alert("Xuất PDF không thành công. Cô vui lòng thử lại nhé!");
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handleExportPdf}
      disabled={loading}
      className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold py-2 px-3.5 rounded-xl shadow-sm transition-all disabled:opacity-50"
    >
      {loading ? (
        <Loader2 className="w-4 h-4 animate-spin" />
      ) : (
        <Printer className="w-4 h-4" />
      )}
      <span>{loading ? "Đang tạo PDF..." : "Xuất PDF"}</span>
    </button>
  );
}
