"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import {
  Wand2,
  FileEdit,
  MessageSquare,
  Image,
  Video,
  Copy,
  Check,
  Sparkles,
  Loader2,
  Send,
  HeartHandshake,
  Film,
  Lightbulb,
} from "lucide-react";
import { ExportMenu } from "@/components/ui/ExportMenu";
import { AutoGrowTextarea } from "@/components/ui/AutoGrowTextarea";

function ToolsContent() {
  const searchParams = useSearchParams();
  const initialTab = searchParams.get("tab") || "comment";
  const initialName = searchParams.get("name") || "";
  const studentId = searchParams.get("studentId") || "";

  const [activeTab, setActiveTab] = useState<"comment" | "parent" | "media">(
    initialTab === "media" ? "media" : initialTab === "parent" ? "parent" : "comment"
  );

  // Student Comment State — để trống mặc định, KHÔNG tự điền sẵn tên/nội
  // dung mẫu nữa: nếu cô bấm tạo mà quên chỉnh sửa, AI sẽ viết nhận xét về
  // một bé "Nguyễn Minh" không có thật rồi gửi nhầm cho phụ huynh thật.
  const [commentStudentName, setCommentStudentName] = useState(initialName || "");
  const [commentRawInput, setCommentRawInput] = useState("");
  const [generatedComment, setGeneratedComment] = useState("");
  const [loadingComment, setLoadingComment] = useState(false);
  const [copiedComment, setCopiedComment] = useState(false);

  // Parent Message State
  const [parentStudentName, setParentStudentName] = useState(initialName || "");
  const [parentRawInput, setParentRawInput] = useState("");
  const [parentTone, setParentTone] = useState<"friendly" | "polite" | "brief" | "formal">(
    "friendly"
  );
  const [generatedMessage, setGeneratedMessage] = useState("");
  const [loadingMessage, setLoadingMessage] = useState(false);
  const [copiedMessage, setCopiedMessage] = useState(false);

  // Media Prompt State
  const [mediaRequirement, setMediaRequirement] = useState("");
  const [mediaType, setMediaType] = useState<"image" | "video">("image");
  const [artStyle, setArtStyle] = useState("3d_clay");
  const [englishPrompt, setEnglishPrompt] = useState("");
  const [vietnameseDesc, setVietnameseDesc] = useState("");
  const [usageTip, setUsageTip] = useState("");
  const [loadingMedia, setLoadingMedia] = useState(false);
  const [copiedMediaPrompt, setCopiedMediaPrompt] = useState(false);

  useEffect(() => {
    if (initialName) {
      setCommentStudentName(`bé ${initialName}`);
      setParentStudentName(`bé ${initialName}`);
    }
  }, [initialName]);

  const handleGenerateComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentRawInput.trim()) return;
    setLoadingComment(true);

    try {
      const res = await fetch("/api/ai/comment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          input: commentRawInput,
          studentName: commentStudentName,
          studentId,
        }),
      });

      const data = await res.json();
      if (data.success && data.comment) {
        setGeneratedComment(data.comment);
      } else {
        alert(data.error || "Không thể tạo nhận xét");
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingComment(false);
    }
  };

  const handleGenerateParentMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!parentRawInput.trim()) return;
    setLoadingMessage(true);

    try {
      const res = await fetch("/api/ai/parent-message", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          input: parentRawInput,
          studentName: parentStudentName,
          tone: parentTone,
          studentId,
        }),
      });

      const data = await res.json();
      if (data.success && data.message) {
        setGeneratedMessage(data.message);
      } else {
        alert(data.error || "Không thể tạo tin nhắn");
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingMessage(false);
    }
  };

  const handleGenerateMediaPrompt = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!mediaRequirement.trim()) return;
    setLoadingMedia(true);

    try {
      const res = await fetch("/api/ai/media-prompt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          input: mediaRequirement,
          mediaType,
          artStyle,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setEnglishPrompt(data.englishPrompt);
        setVietnameseDesc(data.vietnameseDesc);
        setUsageTip(data.usageTip);
      } else {
        alert(data.error || "Không thể tạo prompt hình ảnh/video");
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingMedia(false);
    }
  };

  const copyToClipboard = (text: string, type: "comment" | "message" | "media") => {
    navigator.clipboard.writeText(text);
    if (type === "comment") {
      setCopiedComment(true);
      setTimeout(() => setCopiedComment(false), 2000);
    } else if (type === "message") {
      setCopiedMessage(true);
      setTimeout(() => setCopiedMessage(false), 2000);
    } else {
      setCopiedMediaPrompt(true);
      setTimeout(() => setCopiedMediaPrompt(false), 2000);
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="bg-white p-6 rounded-3xl border border-emerald-100 shadow-sm flex items-center gap-3">
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-500 text-white flex items-center justify-center shadow-md shadow-emerald-200">
          <Wand2 className="w-6 h-6" />
        </div>
        <div>
          <h1 className="text-xl md:text-2xl font-black text-slate-900 tracking-tight">
            Công cụ AI Nhanh cho Giáo viên Mầm non
          </h1>
          <p className="text-xs text-slate-500">
            Tạo nhận xét học sinh, tin nhắn phụ huynh & Prompt tạo ẢNH, VIDEO học liệu sinh động
          </p>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex flex-wrap items-center gap-2 bg-white p-2 rounded-2xl border border-emerald-100 shadow-2xs">
        <button
          onClick={() => setActiveTab("comment")}
          className={`flex-1 py-3 px-3 rounded-xl text-xs md:text-sm font-extrabold flex items-center justify-center gap-2 transition-all ${
            activeTab === "comment"
              ? "bg-emerald-500 text-white shadow-sm"
              : "text-slate-600 hover:bg-emerald-50 hover:text-emerald-800"
          }`}
        >
          <FileEdit className="w-4 h-4" />
          <span>✨ AI Viết nhận xét trẻ</span>
        </button>

        <button
          onClick={() => setActiveTab("parent")}
          className={`flex-1 py-3 px-3 rounded-xl text-xs md:text-sm font-extrabold flex items-center justify-center gap-2 transition-all ${
            activeTab === "parent"
              ? "bg-rose-500 text-white shadow-sm"
              : "text-slate-600 hover:bg-rose-50 hover:text-rose-800"
          }`}
        >
          <MessageSquare className="w-4 h-4" />
          <span>💬 AI Viết tin nhắn phụ huynh</span>
        </button>

        <button
          onClick={() => setActiveTab("media")}
          className={`flex-1 py-3 px-3 rounded-xl text-xs md:text-sm font-extrabold flex items-center justify-center gap-2 transition-all ${
            activeTab === "media"
              ? "bg-indigo-600 text-white shadow-sm"
              : "text-slate-600 hover:bg-indigo-50 hover:text-indigo-800"
          }`}
        >
          <Image className="w-4 h-4" />
          <span>🖼️ AI Tạo Prompt ẢNH & VIDEO</span>
        </button>
      </div>

      {/* Tab 1: AI Student Comment Generator */}
      {activeTab === "comment" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Input Form */}
          <div className="bg-white p-6 rounded-3xl border border-emerald-100 shadow-sm space-y-4">
            <h2 className="font-extrabold text-slate-900 text-sm flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-emerald-600" />
              <span>Ghi chú biểu hiện của trẻ</span>
            </h2>

            <form onSubmit={handleGenerateComment} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Tên học sinh</label>
                <input
                  type="text"
                  required
                  value={commentStudentName}
                  onChange={(e) => setCommentStudentName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 font-medium focus:ring-2 focus:ring-emerald-500"
                  placeholder="Ví dụ: bé Nguyễn Minh"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Nhập biểu hiện / quan sát thô trong ngày
                </label>
                <AutoGrowTextarea
                  minRows={5}
                  required
                  value={commentRawInput}
                  onChange={(e) => setCommentRawInput(e.target.value)}
                  placeholder="Ví dụ: Hôm nay bé ăn tốt, ngủ bình thường nhưng hơi nhút nhát khi chơi nhóm..."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 font-medium focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <button
                type="submit"
                disabled={loadingComment}
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 px-4 rounded-xl shadow-sm transition-colors flex items-center justify-center gap-2"
              >
                {loadingComment ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Wand2 className="w-4 h-4" />
                )}
                <span>{loadingComment ? "AI đang chuyển đổi..." : "Tạo nhận xét ấm áp"}</span>
              </button>
            </form>
          </div>

          {/* AI Result Card */}
          <div className="bg-white p-6 rounded-3xl border border-emerald-100 shadow-sm flex flex-col justify-between space-y-4">
            <div>
              <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-3">
                <h3 className="font-extrabold text-slate-900 text-sm flex items-center gap-2">
                  <HeartHandshake className="w-4 h-4 text-emerald-600" />
                  <span>Nhận xét hoàn chỉnh cho Giáo viên</span>
                </h3>
                {generatedComment && (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => copyToClipboard(generatedComment, "comment")}
                      className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 px-3 py-1.5 rounded-lg transition-colors border border-emerald-200"
                    >
                      {copiedComment ? (
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                      <span>{copiedComment ? "Đã sao chép" : "Sao chép"}</span>
                    </button>
                    <ExportMenu title={`Nhan xet - ${commentStudentName || "be"}`} content={generatedComment} />
                  </div>
                )}
              </div>

              {generatedComment ? (
                <div className="bg-emerald-50/60 p-4 rounded-2xl border border-emerald-100 text-xs text-slate-800 leading-relaxed font-sans whitespace-pre-wrap">
                  {generatedComment}
                </div>
              ) : (
                <div className="bg-slate-50 p-12 rounded-2xl text-center border border-dashed border-slate-200 text-xs text-slate-400 space-y-2">
                  <Sparkles className="w-8 h-8 text-slate-300 mx-auto" />
                  <p>Nhập quan sát ở bên trái và bấm 'Tạo nhận xét ấm áp'.</p>
                </div>
              )}
            </div>

            <p className="text-[11px] text-slate-400 italic">
              💡 Cô giáo có thể thoải mái chỉnh sửa lại văn bản nhận xét trước khi ghi vào sổ liên lạc hoặc báo cáo.
            </p>
          </div>
        </div>
      )}

      {/* Tab 2: AI Parent Message Generator */}
      {activeTab === "parent" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Input Form */}
          <div className="bg-white p-6 rounded-3xl border border-rose-100 shadow-sm space-y-4">
            <h2 className="font-extrabold text-slate-900 text-sm flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-rose-600" />
              <span>Nội dung gửi Phụ huynh</span>
            </h2>

            <form onSubmit={handleGenerateParentMessage} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Tên bé</label>
                <input
                  type="text"
                  required
                  value={parentStudentName}
                  onChange={(e) => setParentStudentName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 font-medium focus:ring-2 focus:ring-rose-500"
                  placeholder="Ví dụ: bé Nguyễn Minh"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Chọn văn phong tin nhắn
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { id: "friendly", label: "🌱 Thân thiện, ấm áp" },
                    { id: "polite", label: "🌸 Lịch sự, chu đáo" },
                    { id: "brief", label: "⚡ Ngắn gọn, súc tích" },
                    { id: "formal", label: "📜 Trang trọng" },
                  ].map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => setParentTone(t.id as any)}
                      className={`p-2.5 rounded-xl text-left border text-xs font-bold transition-all ${
                        parentTone === t.id
                          ? "bg-rose-500 text-white border-rose-600 shadow-sm"
                          : "bg-slate-50 hover:bg-rose-50 text-slate-700 border-slate-200"
                      }`}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Tình hình thực tế cần nhắn cho phụ huynh
                </label>
                <AutoGrowTextarea
                  minRows={4}
                  required
                  value={parentRawInput}
                  onChange={(e) => setParentRawInput(e.target.value)}
                  placeholder="Ví dụ: Bé hôm nay ăn ít và hơi mệt..."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 font-medium focus:ring-2 focus:ring-rose-500"
                />
              </div>

              <button
                type="submit"
                disabled={loadingMessage}
                className="w-full bg-rose-600 hover:bg-rose-700 text-white font-bold py-3 px-4 rounded-xl shadow-sm transition-colors flex items-center justify-center gap-2"
              >
                {loadingMessage ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
                <span>{loadingMessage ? "AI đang soạn tin..." : "Tạo tin nhắn Zalo/SMS"}</span>
              </button>
            </form>
          </div>

          {/* AI Result Message Box */}
          <div className="bg-white p-6 rounded-3xl border border-rose-100 shadow-sm flex flex-col justify-between space-y-4">
            <div>
              <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-3">
                <h3 className="font-extrabold text-slate-900 text-sm flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 text-rose-600" />
                  <span>Tin nhắn hoàn chỉnh gửi Zalo</span>
                </h3>
                {generatedMessage && (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => copyToClipboard(generatedMessage, "message")}
                      className="inline-flex items-center gap-1 text-xs font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 px-3 py-1.5 rounded-lg transition-colors border border-rose-200"
                    >
                      {copiedMessage ? (
                        <Check className="w-3.5 h-3.5 text-rose-600" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                      <span>{copiedMessage ? "Đã chép tin" : "Sao chép tin"}</span>
                    </button>
                    <ExportMenu title={`Tin nhan phu huynh - ${parentStudentName || "be"}`} content={generatedMessage} />
                  </div>
                )}
              </div>

              {generatedMessage ? (
                <div className="bg-rose-50/60 p-4 rounded-2xl border border-rose-100 text-xs text-slate-800 leading-relaxed font-sans whitespace-pre-wrap">
                  {generatedMessage}
                </div>
              ) : (
                <div className="bg-slate-50 p-12 rounded-2xl text-center border border-dashed border-slate-200 text-xs text-slate-400 space-y-2">
                  <MessageSquare className="w-8 h-8 text-slate-300 mx-auto" />
                  <p>Nhập thông tin bên trái và bấm 'Tạo tin nhắn Zalo/SMS'.</p>
                </div>
              )}
            </div>

            <p className="text-[11px] text-slate-400 italic">
              💬 Bấm 'Sao chép tin' để dán trực tiếp vào Zalo hoặc tin nhắn SMS gửi phụ huynh bé.
            </p>
          </div>
        </div>
      )}

      {/* Tab 3: AI Media Prompt Generator (IMAGE & VIDEO) */}
      {activeTab === "media" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Input Form */}
          <div className="bg-white p-6 rounded-3xl border border-indigo-100 shadow-sm space-y-4">
            <h2 className="font-extrabold text-slate-900 text-sm flex items-center gap-2">
              <Film className="w-4 h-4 text-indigo-600" />
              <span>Yêu cầu Học liệu ẢNH & VIDEO Mầm non</span>
            </h2>

            <form onSubmit={handleGenerateMediaPrompt} className="space-y-4 text-xs">
              {/* Media Type Selector */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Loại phương tiện học liệu
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setMediaType("image")}
                    className={`py-2.5 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 transition-all ${
                      mediaType === "image"
                        ? "bg-indigo-600 text-white border-indigo-700 shadow-sm"
                        : "bg-slate-50 hover:bg-indigo-50 text-slate-700 border-slate-200"
                    }`}
                  >
                    <Image className="w-4 h-4" />
                    <span>🖼️ Hình ảnh Học liệu</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setMediaType("video")}
                    className={`py-2.5 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 transition-all ${
                      mediaType === "video"
                        ? "bg-indigo-600 text-white border-indigo-700 shadow-sm"
                        : "bg-slate-50 hover:bg-indigo-50 text-slate-700 border-slate-200"
                    }`}
                  >
                    <Video className="w-4 h-4" />
                    <span>🎥 Video ngắn minh họa</span>
                  </button>
                </div>
              </div>

              {/* Art Style Selector */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Phong cách nghệ thuật mầm non
                </label>
                <select
                  value={artStyle}
                  onChange={(e) => setArtStyle(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white font-medium focus:ring-2 focus:ring-indigo-500"
                >
                  {/* Danh sách này PHẢI khớp với "Gợi ý nhanh > Prompt ẢNH & VIDEO"
                      ở trang Chat (chat/page.tsx) và ART_STYLE_MAP trong aiEngine.ts */}
                  <option value="3d_clay">🎨 Đất nặn 3D dễ thương</option>
                  <option value="3d_cute">🧸 Hoạt hình 3D ngộ nghĩnh</option>
                  <option value="watercolor">🖌️ Màu nước mộng mơ</option>
                  <option value="coloring_book">✏️ Tranh tô màu (đen trắng)</option>
                  <option value="flat_cartoon">⭐ Hoạt hình phẳng (Flashcard)</option>
                </select>
              </div>

              {/* Requirement Input */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Mô tả ý tưởng hình ảnh hoặc video cần tạo
                </label>
                <AutoGrowTextarea
                  minRows={4}
                  required
                  value={mediaRequirement}
                  onChange={(e) => setMediaRequirement(e.target.value)}
                  placeholder="Ví dụ: Bạn Khỉ con dễ thương đang cầm quả cam vàng rực rỡ vui vẻ trong khu rừng..."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 font-medium focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <button
                type="submit"
                disabled={loadingMedia}
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-4 rounded-xl shadow-sm transition-colors flex items-center justify-center gap-2"
              >
                {loadingMedia ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Wand2 className="w-4 h-4" />
                )}
                <span>{loadingMedia ? "AI đang thiết kế Prompt..." : "Tạo Prompt ẢNH & VIDEO"}</span>
              </button>
            </form>
          </div>

          {/* AI Result Card */}
          <div className="bg-white p-6 rounded-3xl border border-indigo-100 shadow-sm flex flex-col justify-between space-y-4">
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h3 className="font-extrabold text-slate-900 text-sm flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-indigo-600" />
                  <span>Prompt Chuẩn cho AI Generator (Midjourney / DALL-E / Runway / Canva)</span>
                </h3>
              </div>

              {englishPrompt ? (
                <div className="space-y-3">
                  {/* English Prompt Box with Copy */}
                  <div className="bg-indigo-950 text-indigo-100 p-4 rounded-2xl border border-indigo-900 space-y-2 relative group">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] uppercase font-bold text-indigo-300 tracking-wider">
                        📌 PROMPT TIẾNG ANH (Dán vào Midjourney / DALL-E / Canva)
                      </span>
                      <button
                        onClick={() => copyToClipboard(englishPrompt, "media")}
                        className="inline-flex items-center gap-1 text-[11px] font-bold text-indigo-200 bg-indigo-800 hover:bg-indigo-700 px-2.5 py-1 rounded-lg transition-colors"
                      >
                        {copiedMediaPrompt ? (
                          <Check className="w-3.5 h-3.5 text-emerald-400" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                        <span>{copiedMediaPrompt ? "Đã sao chép!" : "Sao chép Prompt"}</span>
                      </button>
                    </div>
                    <p className="text-xs font-mono leading-relaxed select-all">
                      {englishPrompt}
                    </p>
                  </div>

                  {/* Vietnamese Description */}
                  <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200 text-xs space-y-1">
                    <strong className="text-slate-800 block text-[11px]">🇻🇳 Mô tả tiếng Việt:</strong>
                    <p className="text-slate-600 leading-relaxed">{vietnameseDesc}</p>
                  </div>

                  {/* Usage Tip */}
                  <div className="bg-amber-50 p-3.5 rounded-2xl border border-amber-200 text-xs space-y-1">
                    <strong className="text-amber-900 flex items-center gap-1 text-[11px]">
                      <Lightbulb className="w-3.5 h-3.5 text-amber-600" />
                      <span>💡 Gợi ý ứng dụng bài giảng:</span>
                    </strong>
                    <p className="text-amber-800 leading-relaxed">{usageTip}</p>
                  </div>
                </div>
              ) : (
                <div className="bg-slate-50 p-12 rounded-2xl text-center border border-dashed border-slate-200 text-xs text-slate-400 space-y-2">
                  <Image className="w-8 h-8 text-slate-300 mx-auto" />
                  <p>Nhập ý tưởng bài giảng mầm non bên trái và bấm 'Tạo Prompt ẢNH & VIDEO'.</p>
                </div>
              )}
            </div>

            <p className="text-[11px] text-slate-400 italic">
              ✨ Cô dán Prompt Tiếng Anh vào Midjourney, DALL-E 3, RunwayML hoặc công cụ Tạo Ảnh AI của Canva để nhận ảnh/video học liệu chất lượng cao.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

export default function ToolsPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-sm text-slate-500">Đang tải công cụ SUMFLOW...</div>}>
      <ToolsContent />
    </Suspense>
  );
}
