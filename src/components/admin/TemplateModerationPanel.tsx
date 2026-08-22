"use client";

import React, { useState, useEffect } from "react";
import {
  FileCheck,
  CheckCircle2,
  XCircle,
  Loader2,
  Sparkles,
  ToggleLeft,
  ToggleRight,
  RefreshCw,
  Search,
  BookOpen,
  Info,
  ShieldAlert,
} from "lucide-react";

export function TemplateModerationPanel() {
  const [templates, setTemplates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("PENDING_REVIEW");

  // Admin toggles
  const [enableCollection, setEnableCollection] = useState(true);
  const [publicBankEnabled, setPublicBankEnabled] = useState(false);
  const [savingSettings, setSavingSettings] = useState(false);

  // Action processing
  const [actioningId, setActioningId] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [rejectingId, setRejectingId] = useState<string | null>(null);

  const loadData = async () => {
    setLoading(true);
    try {
      // 1. Fetch settings
      const settingsRes = await fetch("/api/admin/settings");
      const settingsData = await settingsRes.json();
      if (settingsData.success && settingsData.settings) {
        setEnableCollection(settingsData.settings.enableTemplateCollection !== false);
        setPublicBankEnabled(settingsData.settings.publicTemplateBankEnabled === true);
      }

      // 2. Fetch pending templates
      const templatesRes = await fetch(`/api/admin/templates?status=${statusFilter}`);
      const templatesData = await templatesRes.json();
      if (templatesData.success) {
        setTemplates(templatesData.templates);
      }
    } catch (err) {
      console.error("Load moderation data error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [statusFilter]);

  const handleToggleSetting = async (key: "enableTemplateCollection" | "publicTemplateBankEnabled", value: boolean) => {
    setSavingSettings(true);
    try {
      await fetch("/api/admin/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [key]: value }),
      });
      if (key === "enableTemplateCollection") setEnableCollection(value);
      if (key === "publicTemplateBankEnabled") setPublicBankEnabled(value);
    } finally {
      setSavingSettings(false);
    }
  };

  const handleModerate = async (templateId: string, action: "APPROVE" | "REJECT", reason?: string) => {
    setActioningId(templateId);
    try {
      const res = await fetch("/api/admin/templates", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          templateId,
          action,
          rejectionReason: reason,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setTemplates((prev) => prev.filter((t) => t.id !== templateId));
        setRejectingId(null);
        setRejectionReason("");
      } else {
        alert(data.error || "Không thể thực hiện thao tác.");
      }
    } catch (err) {
      console.error("Moderate error:", err);
    } finally {
      setActioningId(null);
    }
  };

  return (
    <div className="bg-white rounded-3xl border border-emerald-100 shadow-sm p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center font-bold">
            <FileCheck className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-black text-slate-900">Quản Lý Kho Mẫu Giáo Án & Kiểm Duyệt</h2>
            <p className="text-xs text-slate-500">Cấu hình chế độ thu thập và xét duyệt mẫu giáo án do người dùng đóng góp</p>
          </div>
        </div>

        <button
          onClick={loadData}
          className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-600 hover:text-emerald-700 bg-slate-100 hover:bg-emerald-50 px-3.5 py-2 rounded-xl transition-colors shrink-0"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin text-emerald-600" : ""}`} />
          <span>Làm mới</span>
        </button>
      </div>

      {/* Admin Control Switches (Phase 1 & Phase 2) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Switch 1: Thu thập file mẫu */}
        <div className="p-4 rounded-2xl border border-slate-200 bg-slate-50/50 space-y-2">
          <div className="flex items-center justify-between">
            <span className="font-bold text-xs text-slate-900 flex items-center gap-1.5">
              <span>📥 Thu Thập File Mẫu Người Dùng</span>
              {enableCollection && <span className="text-[10px] bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full font-extrabold">Đang Bật</span>}
            </span>
            <button
              onClick={() => handleToggleSetting("enableTemplateCollection", !enableCollection)}
              disabled={savingSettings}
              className="text-emerald-600 hover:text-emerald-700"
            >
              {enableCollection ? (
                <ToggleRight className="w-8 h-8 text-emerald-600" />
              ) : (
                <ToggleLeft className="w-8 h-8 text-slate-400" />
              )}
            </button>
          </div>
          <p className="text-[11px] text-slate-500 leading-relaxed">
            Cho phép hệ thống tự động nhận và AI review file mẫu giáo án khi cô giáo tích chọn đóng góp vào kho chung.
          </p>
        </div>

        {/* Switch 2: Phase 2 - Công khai Kho Mẫu Public */}
        <div className="p-4 rounded-2xl border border-slate-200 bg-slate-50/50 space-y-2">
          <div className="flex items-center justify-between">
            <span className="font-bold text-xs text-slate-900 flex items-center gap-1.5">
              <span>🌐 Mở Kho Mẫu Public (Phase 2)</span>
              {publicBankEnabled ? (
                <span className="text-[10px] bg-sky-100 text-sky-800 px-2 py-0.5 rounded-full font-extrabold">Đang Công Khai</span>
              ) : (
                <span className="text-[10px] bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full font-extrabold">Giai Đoạn 1 (Ẩn)</span>
              )}
            </span>
            <button
              onClick={() => handleToggleSetting("publicTemplateBankEnabled", !publicBankEnabled)}
              disabled={savingSettings}
              className="text-emerald-600 hover:text-emerald-700"
            >
              {publicBankEnabled ? (
                <ToggleRight className="w-8 h-8 text-emerald-600" />
              ) : (
                <ToggleLeft className="w-8 h-8 text-slate-400" />
              )}
            </button>
          </div>
          <p className="text-[11px] text-slate-500 leading-relaxed">
            Bật tính năng này khi đã duyệt đủ số lượng mẫu giáo án phong phú để tất cả giáo viên có thể tham khảo dùng chung.
          </p>
        </div>
      </div>

      {/* Moderation List Section */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <h3 className="font-extrabold text-slate-800 text-xs uppercase tracking-wider flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-emerald-600" />
            <span>Danh sách Mẫu Giáo Án Đóng Góp</span>
          </h3>

          {/* Filter Tabs */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
            {[
              { code: "PENDING_REVIEW", label: "Chờ duyệt" },
              { code: "APPROVED", label: "Đã duyệt" },
              { code: "REJECTED", label: "Đã từ chối" },
              { code: "ALL", label: "Tất cả" },
            ].map((tab) => (
              <button
                key={tab.code}
                onClick={() => setStatusFilter(tab.code)}
                className={`text-xs font-bold px-3 py-1.5 rounded-lg transition-all ${
                  statusFilter === tab.code
                    ? "bg-white text-emerald-800 shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Template List */}
        {loading ? (
          <div className="p-8 text-center bg-slate-50 rounded-2xl">
            <Loader2 className="w-6 h-6 text-emerald-600 animate-spin mx-auto" />
            <span className="text-xs text-slate-500 mt-2 block">Đang tải danh sách mẫu...</span>
          </div>
        ) : templates.length === 0 ? (
          <div className="p-8 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200">
            <Info className="w-8 h-8 text-slate-400 mx-auto mb-2" />
            <p className="text-xs font-bold text-slate-600">Không có mẫu giáo án nào ở danh mục này.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {templates.map((tpl) => {
              let structure: any = null;
              try {
                structure = JSON.parse(tpl.structureJson);
              } catch (e) {}

              const isRejectingThis = rejectingId === tpl.id;

              return (
                <div
                  key={tpl.id}
                  className="p-4 rounded-2xl border border-slate-200 bg-white hover:border-emerald-300 transition-all space-y-3"
                >
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-100 pb-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-extrabold text-sm text-slate-900">{tpl.title}</span>
                        <span className="text-[10px] bg-amber-100 text-amber-800 font-black px-2 py-0.5 rounded-full uppercase">
                          {tpl.fileFormat || "docx"}
                        </span>
                        {tpl.status === "PENDING_REVIEW" && (
                          <span className="text-[10px] bg-amber-100 text-amber-800 font-bold px-2 py-0.5 rounded-full">
                            ⏳ Chờ duyệt
                          </span>
                        )}
                        {tpl.status === "APPROVED" && (
                          <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-full">
                            ✅ Đã duyệt Public
                          </span>
                        )}
                        {tpl.status === "REJECTED" && (
                          <span className="text-[10px] bg-rose-100 text-rose-800 font-bold px-2 py-0.5 rounded-full">
                            ❌ Đã từ chối
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-500">
                        Người gửi: <strong className="text-slate-700">{tpl.teacher?.user?.name || "Giáo viên"}</strong> ({tpl.teacher?.user?.email}) • File gốc: {tpl.originalFileName || "N/A"}
                      </p>
                    </div>

                    {/* AI Score Badge */}
                    {tpl.aiReviewScore !== null && tpl.aiReviewScore !== undefined && (
                      <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 p-2 rounded-xl shrink-0">
                        <Sparkles className="w-4 h-4 text-amber-500" />
                        <div>
                          <span className="text-[10px] font-bold text-slate-400 block uppercase">Điểm AI Review</span>
                          <span className={`text-xs font-black ${tpl.aiReviewScore >= 60 ? "text-emerald-700" : "text-rose-600"}`}>
                            {tpl.aiReviewScore} / 100 điểm
                          </span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* AI Notes & Structure Details */}
                  {tpl.aiReviewNotes && (
                    <div className="text-xs bg-slate-50 p-3 rounded-xl text-slate-700 border border-slate-100 space-y-1">
                      <span className="font-bold text-slate-900 block">🤖 Nhận xét tự động từ AI:</span>
                      <p className="text-[11px] leading-relaxed">{tpl.aiReviewNotes}</p>
                    </div>
                  )}

                  {structure && structure.sections && (
                    <div className="text-xs space-y-1">
                      <span className="font-bold text-slate-800 block">📋 Cấu trúc tiêu đề ({structure.sections.length} mục):</span>
                      <div className="flex flex-wrap gap-1.5">
                        {structure.sections.map((sec: any, idx: number) => (
                          <span key={idx} className="text-[11px] bg-slate-100 text-slate-700 px-2.5 py-1 rounded-lg border border-slate-200 font-medium">
                            {sec.heading}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Action Buttons */}
                  {tpl.status === "PENDING_REVIEW" && (
                    <div className="pt-2 border-t border-slate-100 flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-2">
                      {isRejectingThis ? (
                        <div className="flex items-center gap-2 w-full">
                          <input
                            type="text"
                            placeholder="Nhập lý do từ chối mẫu này..."
                            value={rejectionReason}
                            onChange={(e) => setRejectionReason(e.target.value)}
                            className="flex-1 px-3 py-1.5 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-rose-300 focus:outline-none"
                          />
                          <button
                            onClick={() => handleModerate(tpl.id, "REJECT", rejectionReason)}
                            disabled={actioningId === tpl.id}
                            className="px-3 py-1.5 rounded-xl bg-rose-600 text-white font-bold text-xs hover:bg-rose-700 shrink-0"
                          >
                            Xác nhận Từ chối
                          </button>
                          <button
                            onClick={() => setRejectingId(null)}
                            className="px-3 py-1.5 rounded-xl bg-slate-200 text-slate-700 font-bold text-xs hover:bg-slate-300 shrink-0"
                          >
                            Hủy
                          </button>
                        </div>
                      ) : (
                        <>
                          <button
                            onClick={() => setRejectingId(tpl.id)}
                            disabled={actioningId === tpl.id}
                            className="inline-flex items-center justify-center gap-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-xs px-4 py-2 rounded-xl border border-rose-200 transition-colors"
                          >
                            <XCircle className="w-4 h-4" />
                            <span>Từ chối</span>
                          </button>

                          <button
                            onClick={() => handleModerate(tpl.id, "APPROVE")}
                            disabled={actioningId === tpl.id}
                            className="inline-flex items-center justify-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs px-5 py-2 rounded-xl shadow-xs transition-colors"
                          >
                            {actioningId === tpl.id ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <CheckCircle2 className="w-4 h-4" />
                            )}
                            <span>Phê Duyệt Vào Kho Public</span>
                          </button>
                        </>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
