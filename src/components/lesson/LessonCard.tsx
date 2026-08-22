"use client";

import React, { useState } from "react";
import {
  BookOpen,
  Clock,
  UserCheck,
  CheckCircle2,
  HelpCircle,
  Gamepad2,
  Edit3,
  Bookmark,
  BookmarkCheck,
  Copy,
  Check,
  Sparkles,
  Lightbulb,
} from "lucide-react";
import { PdfExportButton } from "../ui/PdfExportButton";
import { LessonEditModal } from "./LessonEditModal";

interface LessonCardProps {
  lesson: any;
  onSaved?: (savedLesson: any) => void;
  onDuplicate?: (lesson: any) => void;
  showSaveButton?: boolean;
}

export function LessonCard({
  lesson,
  onSaved,
  onDuplicate,
  showSaveButton = true,
}: LessonCardProps) {
  const [currentLesson, setCurrentLesson] = useState(lesson);
  const [isSaved, setIsSaved] = useState(Boolean(lesson.id));
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);

  const parseField = (field: any, defaultVal: any) => {
    if (!field) return defaultVal;
    if (typeof field === "object") return field;
    try {
      return JSON.parse(field);
    } catch {
      return defaultVal;
    }
  };

  const objs = parseField(currentLesson.objectives, { knowledge: "", skills: "", attitude: "" });
  const preps = parseField(currentLesson.preparation, { teacher: "", child: "" });
  const teacherActs = parseField(currentLesson.teacherActivities, []);
  const childActs = parseField(currentLesson.childActivities, []);
  const openQs = parseField(currentLesson.openQuestions, []);
  const game = parseField(currentLesson.reinforcementGame, { name: "", rules: "", how_to_play: "" });
  const customSections = parseField(currentLesson.customSections, null);

  const handleSaveToDb = async () => {
    if (isSaved && currentLesson.id) return;
    setSaving(true);
    try {
      const res = await fetch("/api/lessons", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(currentLesson),
      });
      const data = await res.json();
      if (data.success && data.lesson) {
        setCurrentLesson(data.lesson);
        setIsSaved(true);
        if (onSaved) onSaved(data.lesson);
      } else {
        alert(data.error || "Không thể lưu giáo án");
      }
    } catch (err) {
      console.error("Save lesson failed:", err);
    } finally {
      setSaving(false);
    }
  };

  const handleCopyText = () => {
    const textToCopy = `
[GIÁO ÁN MẦM NON: ${currentLesson.title}]
Độ tuổi: ${currentLesson.ageGroup} | Thời lượng: ${currentLesson.duration} | Chủ đề: ${currentLesson.topic || "Khám phá"}

1. MỤC TIÊU:
- Kiến thức: ${typeof objs === "object" ? objs.knowledge : objs}
- Kỹ năng: ${typeof objs === "object" ? objs.skills : ""}
- Thái độ: ${typeof objs === "object" ? objs.attitude : ""}

2. CHUẨN BỊ:
- Cô: ${typeof preps === "object" ? preps.teacher : preps}
- Trẻ: ${typeof preps === "object" ? preps.child : ""}

3. HOẠT ĐỘNG CỦA CÔ GIÁO:
${Array.isArray(teacherActs) ? teacherActs.map((a: string) => `- ${a}`).join("\n") : teacherActs}

4. HOẠT ĐỘNG CỦA TRẺ:
${Array.isArray(childActs) ? childActs.map((a: string) => `- ${a}`).join("\n") : childActs}

5. TRÒ CHƠI CỦNG CỐ: ${game.name}
Cách chơi: ${game.how_to_play}
${currentLesson.assessment ? `\n6. ĐÁNH GIÁ:\n${currentLesson.assessment}\n` : ""}`.trim();

    navigator.clipboard.writeText(textToCopy);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <>
      <div className="bg-white rounded-3xl border border-emerald-100/80 shadow-lg p-6 space-y-6 hover:shadow-xl transition-all duration-300">
        {/* Header Badge & Title */}
        <div className="flex flex-wrap items-start justify-between gap-4 border-b border-emerald-50 pb-4">
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="bg-emerald-100 text-emerald-800 text-xs font-bold px-3 py-1 rounded-full border border-emerald-200">
                👶 {currentLesson.ageGroup || "4–5 tuổi"}
              </span>
              <span className="bg-amber-100 text-amber-900 text-xs font-bold px-3 py-1 rounded-full border border-amber-200 flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" />
                {currentLesson.duration || "30 phút"}
              </span>
              {currentLesson.topic && (
                <span className="bg-sky-100 text-sky-900 text-xs font-bold px-3 py-1 rounded-full border border-sky-200">
                  📁 {currentLesson.topic}
                </span>
              )}
            </div>
            <h3 className="text-xl font-black text-emerald-950 tracking-tight pt-1">
              {currentLesson.title}
            </h3>
          </div>

          {/* Quick Action Toolbar */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsEditOpen(true)}
              className="p-2 rounded-xl bg-slate-100 hover:bg-emerald-50 text-slate-600 hover:text-emerald-700 transition-colors text-xs font-semibold flex items-center gap-1"
              title="Chỉnh sửa giáo án"
            >
              <Edit3 className="w-4 h-4" />
              <span className="hidden sm:inline">Sửa</span>
            </button>

            <button
              onClick={handleCopyText}
              className="p-2 rounded-xl bg-slate-100 hover:bg-emerald-50 text-slate-600 hover:text-emerald-700 transition-colors text-xs font-semibold flex items-center gap-1"
              title="Sao chép văn bản"
            >
              {copied ? (
                <Check className="w-4 h-4 text-emerald-600" />
              ) : (
                <Copy className="w-4 h-4" />
              )}
              <span className="hidden sm:inline">{copied ? "Đã chép" : "Sao chép"}</span>
            </button>

            {showSaveButton && (
              <button
                onClick={handleSaveToDb}
                disabled={isSaved || saving}
                className={`p-2 rounded-xl text-xs font-bold flex items-center gap-1 transition-all ${
                  isSaved
                    ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                    : "bg-amber-500 hover:bg-amber-600 text-white shadow-sm"
                }`}
              >
                {isSaved ? (
                  <BookmarkCheck className="w-4 h-4 text-emerald-600" />
                ) : (
                  <Bookmark className="w-4 h-4" />
                )}
                <span>{isSaved ? "Đã lưu" : saving ? "Đang lưu..." : "Lưu kho"}</span>
              </button>
            )}

            <PdfExportButton lesson={currentLesson} />
          </div>
        </div>

        {/* Dynamic Custom Sections (Hiển thị đúng 100% các tiêu đề mục từ file Mẫu người dùng tải lên) */}
        {Array.isArray(customSections) && customSections.length > 0 ? (
          <div className="space-y-4">
            {customSections.map((sec: any, idx: number) => (
              <div
                key={idx}
                className="bg-gradient-to-r from-emerald-50/80 to-teal-50/50 p-4 rounded-2xl border border-emerald-100/70 space-y-2"
              >
                <div className="flex items-center gap-2 text-emerald-900 font-extrabold text-sm">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <h4>{sec.heading || `Mục ${idx + 1}`}</h4>
                </div>
                <div className="text-xs text-slate-700 leading-relaxed pl-6">
                  {typeof sec.content === "string" ? (
                    <p className="whitespace-pre-wrap">{sec.content}</p>
                  ) : Array.isArray(sec.content) ? (
                    <ul className="list-disc list-inside space-y-1">
                      {sec.content.map((item: any, i: number) => (
                        <li key={i} className="whitespace-pre-wrap">
                          {typeof item === "object" ? JSON.stringify(item) : String(item)}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <pre className="whitespace-pre-wrap font-sans text-xs">
                      {JSON.stringify(sec.content, null, 2)}
                    </pre>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <>
            {/* Section I: Objectives */}
        <div className="bg-gradient-to-r from-emerald-50/80 to-teal-50/50 p-4 rounded-2xl border border-emerald-100/70 space-y-2">
          <div className="flex items-center gap-2 text-emerald-900 font-extrabold text-sm">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <h4>I. MỤC TIÊU BÀI HỌC</h4>
          </div>
          <div className="space-y-1 text-xs text-slate-700 leading-relaxed pl-6">
            <p className="whitespace-pre-wrap">
              <strong className="text-emerald-950">1. Kiến thức:</strong>{" "}
              {typeof objs === "object" ? objs.knowledge : objs}
            </p>
            {typeof objs === "object" && objs.skills && (
              <p className="whitespace-pre-wrap">
                <strong className="text-emerald-950">2. Kỹ năng:</strong> {objs.skills}
              </p>
            )}
            {typeof objs === "object" && objs.attitude && (
              <p className="whitespace-pre-wrap">
                <strong className="text-emerald-950">3. Thái độ:</strong> {objs.attitude}
              </p>
            )}
          </div>
        </div>

        {/* Section II: Preparation */}
        <div className="bg-gradient-to-r from-amber-50/80 to-orange-50/40 p-4 rounded-2xl border border-amber-100/70 space-y-2">
          <div className="flex items-center gap-2 text-amber-900 font-extrabold text-sm">
            <BookOpen className="w-4 h-4 text-amber-600" />
            <h4>II. CHUẨN BỊ ĐẠO CỤ</h4>
          </div>
          <div className="space-y-1 text-xs text-slate-700 pl-6">
            <p className="whitespace-pre-wrap">
              <strong className="text-amber-950">• Giáo viên:</strong>{" "}
              {typeof preps === "object" ? preps.teacher : preps}
            </p>
            {typeof preps === "object" && preps.child && (
              <p className="whitespace-pre-wrap">
                <strong className="text-amber-950">• Trẻ em:</strong> {preps.child}
              </p>
            )}
          </div>
        </div>

        {/* Section III: Detailed Flow (Teacher & Child Activities) */}
        <div className="space-y-3">
          <h4 className="font-extrabold text-emerald-950 text-sm flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-emerald-600" />
            III. TIẾN TRÌNH HOẠT ĐỘNG SƯ PHẠM
          </h4>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Teacher Activities */}
            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/80 space-y-2">
              <h5 className="font-bold text-xs text-emerald-800 uppercase tracking-wide flex items-center gap-1.5">
                👩‍🏫 Hoạt động của Giáo viên
              </h5>
              <ul className="space-y-2 text-xs text-slate-700">
                {Array.isArray(teacherActs) && teacherActs.length > 0 ? (
                  teacherActs.map((act: string, idx: number) => (
                    <li key={idx} className="flex items-start gap-2">
                      <span className="w-4 h-4 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">
                        {idx + 1}
                      </span>
                      <span className="whitespace-pre-wrap">{act}</span>
                    </li>
                  ))
                ) : Array.isArray(teacherActs) ? (
                  <li className="italic text-slate-400">Chưa có nội dung — cô bấm "Sửa" ở trên để bổ sung nhé.</li>
                ) : (
                  <p className="whitespace-pre-wrap">{teacherActs}</p>
                )}
              </ul>
            </div>

            {/* Child Activities */}
            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/80 space-y-2">
              <h5 className="font-bold text-xs text-sky-800 uppercase tracking-wide flex items-center gap-1.5">
                👶 Hoạt động của Trẻ em
              </h5>
              <ul className="space-y-2 text-xs text-slate-700">
                {Array.isArray(childActs) && childActs.length > 0 ? (
                  childActs.map((act: string, idx: number) => (
                    <li key={idx} className="flex items-start gap-2">
                      <span className="w-4 h-4 rounded-full bg-sky-100 text-sky-800 text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">
                        {idx + 1}
                      </span>
                      <span className="whitespace-pre-wrap">{act}</span>
                    </li>
                  ))
                ) : Array.isArray(childActs) ? (
                  <li className="italic text-slate-400">Chưa có nội dung — cô bấm "Sửa" ở trên để bổ sung nhé.</li>
                ) : (
                  <p className="whitespace-pre-wrap">{childActs}</p>
                )}
              </ul>
            </div>
          </div>
        </div>

        {/* Section IV: Open Questions & Game — trước đây có nội dung nhưng
            KHÔNG có tiêu đề "IV." bao ngoài như I/II/III/V, đánh số nhảy cóc
            III -> V nhìn như thiếu hẳn 1 mục dù nội dung vẫn đủ. Thêm tiêu
            đề nhóm cho khớp mạch đánh số, chỉ hiện khi có ít nhất 1 trong 2
            khối con (giống cách "V. ĐÁNH GIÁ" chỉ hiện khi có nội dung). */}
        {(openQs || (game && game.name)) && (
        <div className="space-y-3">
          <h4 className="font-extrabold text-rose-950 text-sm flex items-center gap-2">
            <Lightbulb className="w-4 h-4 text-rose-600" />
            IV. CÂU HỎI GỢI MỞ & TRÒ CHƠI CỦNG CỐ
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Open Questions */}
          {openQs && (
            <div className="bg-sky-50/60 p-4 rounded-2xl border border-sky-100 space-y-2">
              <div className="flex items-center gap-2 text-sky-900 font-bold text-xs">
                <HelpCircle className="w-4 h-4 text-sky-600" />
                <h5>CÂU HỎI GỢI MỞ DÀNH CHO TRẺ</h5>
              </div>
              <ul className="list-disc list-inside space-y-1 text-xs text-slate-700">
                {Array.isArray(openQs) && openQs.length > 0 ? (
                  openQs.map((q: string, idx: number) => <li key={idx} className="whitespace-pre-wrap">{q}</li>)
                ) : Array.isArray(openQs) ? (
                  <li className="italic text-slate-400 list-none">Chưa có câu hỏi gợi mở — cô bấm "Sửa" ở trên để bổ sung nhé.</li>
                ) : (
                  <li className="whitespace-pre-wrap">{openQs}</li>
                )}
              </ul>
            </div>
          )}

          {/* Reinforcement Game */}
          {game && game.name && (
            <div className="bg-rose-50/60 p-4 rounded-2xl border border-rose-100 space-y-2">
              <div className="flex items-center gap-2 text-rose-900 font-bold text-xs">
                <Gamepad2 className="w-4 h-4 text-rose-600" />
                <h5>TRÒ CHƠI CỦNG CỐ: {game.name}</h5>
              </div>
              <div className="text-xs text-slate-700 space-y-1">
                {game.rules && (
                  <p className="whitespace-pre-wrap">
                    <strong>Luật chơi:</strong> {game.rules}
                  </p>
                )}
                {game.how_to_play && (
                  <p className="whitespace-pre-wrap">
                    <strong>Cách chơi:</strong> {game.how_to_play}
                  </p>
                )}
              </div>
            </div>
          )}
          </div>
        </div>
        )}

        {/* Section V: Assessment — trước đây gộp chung vào khối "Footer info"
            phía dưới không có số/tiêu đề riêng, dễ bị bỏ sót khi cô đọc
            lướt giáo án — tách thành 1 mục rõ ràng như I-IV ở trên, đặt Ở
            CUỐI đúng trật tự giáo án thật (đánh giá luôn ở cuối, sau khi đã
            tổ chức xong hoạt động). */}
        {currentLesson.assessment && (
          <div className="bg-gradient-to-r from-violet-50/80 to-fuchsia-50/40 p-4 rounded-2xl border border-violet-100/70 space-y-2">
            <div className="flex items-center gap-2 text-violet-900 font-extrabold text-sm">
              <UserCheck className="w-4 h-4 text-violet-600" />
              <h4>V. ĐÁNH GIÁ</h4>
            </div>
            <p className="text-xs text-slate-700 leading-relaxed pl-6 whitespace-pre-wrap">
              {currentLesson.assessment}
            </p>
          </div>
        )}

        {(currentLesson.conclusion || currentLesson.extension) && (
          <div className="bg-slate-50 p-4 rounded-2xl text-xs space-y-1 text-slate-600 border border-slate-200/60">
            {currentLesson.conclusion && (
              <p className="whitespace-pre-wrap">
                <strong className="text-slate-800">Kết thúc:</strong> {currentLesson.conclusion}
              </p>
            )}
            {currentLesson.extension && (
              <p className="whitespace-pre-wrap">
                <strong className="text-slate-800">Hoạt động mở rộng:</strong> {currentLesson.extension}
              </p>
            )}
          </div>
        )}
          </>
        )}
      </div>

      <LessonEditModal
        lesson={currentLesson}
        isOpen={isEditOpen}
        onClose={() => setIsEditOpen(false)}
        onSaveSuccess={(updated) => {
          setCurrentLesson(updated);
          if (onSaved) onSaved(updated);
        }}
      />
    </>
  );
}
