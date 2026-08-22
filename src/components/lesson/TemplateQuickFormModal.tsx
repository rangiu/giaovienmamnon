"use client";

import React, { useState, useEffect } from "react";
import {
  X,
  Sparkles,
  Upload,
  FileText,
  CheckCircle2,
  AlertCircle,
  Loader2,
  BookOpen,
  FileUp,
  Layers,
  Info,
} from "lucide-react";

interface TemplateQuickFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLessonGenerated: (lesson: any) => void;
}

export function TemplateQuickFormModal({
  isOpen,
  onClose,
  onLessonGenerated,
}: TemplateQuickFormModalProps) {
  const [activeTab, setActiveTab] = useState<"generate" | "upload">("generate");
  const [templates, setTemplates] = useState<any[]>([]);
  const [isPublicEnabled, setIsPublicEnabled] = useState(false);
  const [loadingTemplates, setLoadingTemplates] = useState(false);

  // Form Soạn bài nhanh
  const [prompt, setPrompt] = useState("");
  const [ageGroup, setAgeGroup] = useState("4–5 tuổi");
  const [duration, setDuration] = useState("30 phút");
  const [selectedTemplateId, setSelectedTemplateId] = useState("");
  const [generating, setGenerating] = useState(false);
  const [generateError, setGenerateError] = useState("");

  // Form Upload mẫu
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadTitle, setUploadTitle] = useState("");
  const [uploadDesc, setUploadDesc] = useState("");
  const [sharePublic, setSharePublic] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadMessage, setUploadMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Fetch templates khi mở modal
  useEffect(() => {
    if (isOpen) {
      fetchTemplates();
    }
  }, [isOpen]);

  const fetchTemplates = async () => {
    setLoadingTemplates(true);
    try {
      const res = await fetch("/api/lessons/templates");
      const data = await res.json();
      if (data.success) {
        setTemplates(data.templates);
        setIsPublicEnabled(data.isPublicBankEnabled);
        if (data.templates.length > 0 && !selectedTemplateId) {
          setSelectedTemplateId(data.templates[0].id);
        }
      }
    } catch (err) {
      console.error("Fetch templates error:", err);
    } finally {
      setLoadingTemplates(false);
    }
  };

  if (!isOpen) return null;

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim()) {
      setGenerateError("Cô vui lòng nhập tên chủ đề hoặc hoạt động cần soạn nhé!");
      return;
    }

    setGenerating(true);
    setGenerateError("");

    try {
      // 1. Gọi AI sinh giáo án
      const res = await fetch("/api/lessons/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: prompt.trim(),
          ageGroup,
          duration,
          templateId: selectedTemplateId || undefined,
        }),
      });

      const data = await res.json();

      if (!data.success) {
        setGenerateError(data.message || data.error || "Không thể sinh giáo án.");
        return;
      }

      const generatedLesson = data.lesson;
      if (!generatedLesson) {
        setGenerateError("AI trả về kết quả rỗng. Vui lòng bấm thử lại.");
        return;
      }

      // 2. Tự động lưu giáo án mới tạo vào Database
      const saveRes = await fetch("/api/lessons", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: generatedLesson.title,
          ageGroup: generatedLesson.ageGroup || ageGroup,
          duration: generatedLesson.duration || duration,
          topic: generatedLesson.topic || prompt,
          objectives: JSON.stringify(generatedLesson.objectives),
          preparation: JSON.stringify(generatedLesson.preparation),
          teacherActivities: JSON.stringify(generatedLesson.teacherActivities),
          childActivities: JSON.stringify(generatedLesson.childActivities),
          openQuestions: JSON.stringify(generatedLesson.openQuestions),
          reinforcementGame: JSON.stringify(generatedLesson.reinforcementGame),
          conclusion: generatedLesson.conclusion || "",
          assessment: generatedLesson.assessment || "",
          extension: generatedLesson.extension || "",
          rawJson: JSON.stringify(generatedLesson),
        }),
      });

      const saveData = await saveRes.json();
      if (saveData.success) {
        onLessonGenerated(saveData.lesson);
        onClose();
      } else {
        onLessonGenerated(generatedLesson);
        onClose();
      }
    } catch (err: any) {
      console.error("Generate error:", err);
      setGenerateError("Có lỗi kết nối. Vui lòng thử lại!");
    } finally {
      setGenerating(false);
    }
  };

  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadFile) {
      setUploadMessage({ type: "error", text: "Vui lòng chọn 1 file tài liệu (.docx, .pdf, .md, .txt)!" });
      return;
    }

    setUploading(true);
    setUploadMessage(null);

    try {
      const formData = new FormData();
      formData.append("file", uploadFile);
      formData.append("title", uploadTitle);
      formData.append("description", uploadDesc);
      formData.append("sharePublic", sharePublic ? "true" : "false");

      const res = await fetch("/api/lessons/templates/upload", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (data.success) {
        setUploadMessage({ type: "success", text: data.message });
        setUploadFile(null);
        setUploadTitle("");
        setUploadDesc("");
        // Reload danh sách mẫu và chọn mẫu vừa tải lên
        await fetchTemplates();
        if (data.template) {
          setSelectedTemplateId(data.template.id);
        }
        setTimeout(() => {
          setActiveTab("generate");
        }, 1200);
      } else {
        setUploadMessage({ type: "error", text: data.error || "Không thể tải mẫu lên." });
      }
    } catch (err) {
      console.error("Upload error:", err);
      setUploadMessage({ type: "error", text: "Lỗi kết nối khi tải file." });
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in">
      <div className="bg-white rounded-3xl max-w-2xl w-full border border-emerald-100 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="bg-gradient-to-r from-emerald-700 to-teal-700 p-5 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center backdrop-blur-xs">
              <Sparkles className="w-5 h-5 text-amber-300" />
            </div>
            <div>
              <h2 className="text-lg font-black tracking-tight">Soạn Giáo Án Theo Mẫu Tùy Chỉnh</h2>
              <p className="text-xs text-emerald-100">AI tự phân tích file mẫu & soạn bài học bám sát định dạng</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Tabs */}
        <div className="flex border-b border-slate-200 bg-slate-50 shrink-0">
          <button
            onClick={() => setActiveTab("generate")}
            className={`flex-1 py-3 px-4 text-xs font-bold flex items-center justify-center gap-2 border-b-2 transition-all ${
              activeTab === "generate"
                ? "border-emerald-600 text-emerald-700 bg-white"
                : "border-transparent text-slate-500 hover:text-slate-700"
            }`}
          >
            <BookOpen className="w-4 h-4" />
            <span>Form Soạn Bài Nhanh</span>
          </button>

          <button
            onClick={() => setActiveTab("upload")}
            className={`flex-1 py-3 px-4 text-xs font-bold flex items-center justify-center gap-2 border-b-2 transition-all ${
              activeTab === "upload"
                ? "border-emerald-600 text-emerald-700 bg-white"
                : "border-transparent text-slate-500 hover:text-slate-700"
            }`}
          >
            <FileUp className="w-4 h-4 text-amber-600" />
            <span>Tải File Mẫu Word/PDF Mới</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6">
          {activeTab === "generate" ? (
            <form onSubmit={handleGenerate} className="space-y-5">
              {/* Chủ đề bài học */}
              <div className="space-y-1.5">
                <label className="block text-xs font-black text-slate-800">
                  Tên Chủ đề / Hoạt động dạy học <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ví dụ: Khám phá Quả Cam, Bé học đếm 1-5, Thỏ và Rùa..."
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none font-medium"
                />
              </div>

              {/* Lứa tuổi & Thời lượng */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="block text-xs font-black text-slate-800">Lứa tuổi</label>
                  <select
                    value={ageGroup}
                    onChange={(e) => setAgeGroup(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none font-medium bg-white"
                  >
                    <option value="2–3 tuổi">2–3 tuổi (Nhà trẻ)</option>
                    <option value="3–4 tuổi">3–4 tuổi (Mẫu giáo bé)</option>
                    <option value="4–5 tuổi">4–5 tuổi (Mẫu giáo nhỡ)</option>
                    <option value="5–6 tuổi">5–6 tuổi (Mẫu giáo lớn)</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-black text-slate-800">Thời lượng</label>
                  <select
                    value={duration}
                    onChange={(e) => setDuration(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none font-medium bg-white"
                  >
                    <option value="20–25 phút">20–25 phút</option>
                    <option value="25–30 phút">25–30 phút</option>
                    <option value="30 phút">30 phút (Chuẩn)</option>
                    <option value="35–40 phút">35–40 phút</option>
                  </select>
                </div>
              </div>

              {/* Chọn Mẫu Giáo Án */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-black text-slate-800">
                    Chọn Mẫu Giáo Án Bám Sát
                  </label>
                  <button
                    type="button"
                    onClick={() => setActiveTab("upload")}
                    className="text-[11px] font-extrabold text-emerald-700 hover:underline flex items-center gap-1"
                  >
                    <Upload className="w-3 h-3" />
                    <span>+ Tải mẫu riêng của cô</span>
                  </button>
                </div>

                {loadingTemplates ? (
                  <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-center">
                    <Loader2 className="w-5 h-5 text-emerald-600 animate-spin mx-auto" />
                    <span className="text-[11px] text-slate-500 mt-1 block">Đang tải danh sách mẫu...</span>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-2.5 max-h-48 overflow-y-auto p-1">
                    {templates.map((tpl) => {
                      const isSelected = selectedTemplateId === tpl.id;
                      return (
                        <div
                          key={tpl.id}
                          onClick={() => setSelectedTemplateId(tpl.id)}
                          className={`p-3 rounded-2xl border cursor-pointer transition-all flex items-start justify-between gap-3 ${
                            isSelected
                              ? "bg-emerald-50/80 border-emerald-500 ring-2 ring-emerald-500/20 shadow-xs"
                              : "bg-white border-slate-200 hover:border-emerald-300 hover:bg-slate-50"
                          }`}
                        >
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-xs text-slate-900">{tpl.title}</span>
                              {tpl.isSystem && (
                                <span className="text-[10px] bg-emerald-100 text-emerald-800 font-extrabold px-2 py-0.5 rounded-full">
                                  System Verified
                                </span>
                              )}
                              {!tpl.isSystem && (
                                <span className="text-[10px] bg-amber-100 text-amber-800 font-extrabold px-2 py-0.5 rounded-full uppercase">
                                  {tpl.fileFormat || "docx"}
                                </span>
                              )}
                            </div>
                            <p className="text-[11px] text-slate-500 line-clamp-1">{tpl.description}</p>
                          </div>
                          {isSelected && <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {generateError && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{generateError}</span>
                </div>
              )}

              {/* Submit Button */}
              <button
                type="submit"
                disabled={generating}
                className="w-full py-3.5 px-6 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {generating ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>SUMFLOW đang bóc tách & soạn bài học theo mẫu...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 text-amber-300" />
                    <span>Bắt đầu Soạn Giáo Án Theo Mẫu</span>
                  </>
                )}
              </button>
            </form>
          ) : (
            <form onSubmit={handleUploadSubmit} className="space-y-5">
              <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 text-xs text-amber-900 space-y-1">
                <div className="flex items-center gap-2 font-bold text-amber-950">
                  <Info className="w-4 h-4 text-amber-600" />
                  <span>Hướng dẫn tải file mẫu giáo án:</span>
                </div>
                <p className="text-[11px] leading-relaxed text-amber-800">
                  Hệ thống hỗ trợ đọc các định dạng file: <strong>.docx, .pdf, .txt, .md, .doc</strong>. AI sẽ tự động phân tích tiêu đề và các phần bài học trong file để soạn theo đúng định dạng mẫu của trường cô.
                </p>
              </div>

              {/* File input */}
              <div className="space-y-1.5">
                <label className="block text-xs font-black text-slate-800">
                  Chọn File Tài Liệu Mẫu <span className="text-rose-500">*</span>
                </label>
                <input
                  type="file"
                  required
                  accept=".docx,.pdf,.txt,.md,.doc"
                  onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
                  className="w-full text-xs text-slate-600 file:mr-4 file:py-2.5 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-extrabold file:bg-emerald-100 file:text-emerald-900 hover:file:bg-emerald-200 cursor-pointer border border-slate-200 rounded-xl p-1"
                />
              </div>

              {/* Tên mẫu tùy chỉnh */}
              <div className="space-y-1.5">
                <label className="block text-xs font-black text-slate-800">Tên Mẫu Giáo Án (Tùy chọn)</label>
                <input
                  type="text"
                  placeholder="Để trống hệ thống sẽ tự lấy tên file gốc"
                  value={uploadTitle}
                  onChange={(e) => setUploadTitle(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none font-medium"
                />
              </div>

              {/* Ghi chú mô tả */}
              <div className="space-y-1.5">
                <label className="block text-xs font-black text-slate-800">Mô tả mẫu (Tùy chọn)</label>
                <textarea
                  rows={2}
                  placeholder="Ví dụ: Mẫu giáo án áp dụng cho Trường Mầm Nông Họa Mi..."
                  value={uploadDesc}
                  onChange={(e) => setUploadDesc(e.target.value)}
                  className="w-full px-4 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none font-medium"
                />
              </div>

              {/* Checkbox chia sẻ công khai */}
              <div className="flex items-start gap-3 bg-slate-50 p-3.5 rounded-2xl border border-slate-200">
                <input
                  type="checkbox"
                  id="sharePublicCheck"
                  checked={sharePublic}
                  onChange={(e) => setSharePublic(e.target.checked)}
                  className="mt-0.5 w-4 h-4 text-emerald-600 rounded-md border-slate-300 focus:ring-emerald-500"
                />
                <label htmlFor="sharePublicCheck" className="text-xs text-slate-700 cursor-pointer select-none space-y-0.5">
                  <span className="font-bold block text-slate-900">Đóng góp mẫu này vào Kho Mẫu Tham Khảo Chung</span>
                  <span className="text-[11px] text-slate-500 block leading-tight">
                    Mẫu sẽ được AI và Ban Quản Trị xét duyệt chất lượng trước khi chia sẻ tới các đồng nghiệp khác.
                  </span>
                </label>
              </div>

              {uploadMessage && (
                <div
                  className={`p-3.5 rounded-xl text-xs flex items-center gap-2 border ${
                    uploadMessage.type === "success"
                      ? "bg-emerald-50 border-emerald-200 text-emerald-800"
                      : "bg-rose-50 border-rose-200 text-rose-700"
                  }`}
                >
                  {uploadMessage.type === "success" ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                  )}
                  <span>{uploadMessage.text}</span>
                </div>
              )}

              {/* Upload submit button */}
              <button
                type="submit"
                disabled={uploading}
                className="w-full py-3.5 px-6 rounded-2xl bg-amber-600 hover:bg-amber-700 text-white font-extrabold text-xs shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {uploading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Đang đọc file & phân tích cấu trúc...</span>
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4" />
                    <span>Tải Lên & Phân Tích Mẫu Mới</span>
                  </>
                )}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
