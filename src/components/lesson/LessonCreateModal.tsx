"use client";

import React, { useState } from "react";
import { X, Save, Plus, BookOpen, Trash2 } from "lucide-react";

interface LessonCreateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (newLesson: any) => void;
}

export function LessonCreateModal({
  isOpen,
  onClose,
  onSuccess,
}: LessonCreateModalProps) {
  if (!isOpen) return null;

  const [title, setTitle] = useState("");
  const [ageGroup, setAgeGroup] = useState("4–5 tuổi");
  const [duration, setDuration] = useState("30 phút");
  const [topic, setTopic] = useState("Thế giới động vật");

  const [objKnowledge, setObjKnowledge] = useState("");
  const [objSkills, setObjSkills] = useState("");
  const [objAttitude, setObjAttitude] = useState("");

  const [prepTeacher, setPrepTeacher] = useState("");
  const [prepChild, setPrepChild] = useState("");

  const [teacherActsText, setTeacherActsText] = useState("");
  const [childActsText, setChildActsText] = useState("");
  const [openQuestionsText, setOpenQuestionsText] = useState("");

  const [gameName, setGameName] = useState("");
  const [gameRules, setGameRules] = useState("");
  const [gameHowToPlay, setGameHowToPlay] = useState("");

  const [conclusion, setConclusion] = useState("");
  const [assessment, setAssessment] = useState("");
  const [extension, setExtension] = useState("");

  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      alert("Cô vui lòng nhập tên bài dạy / giáo án nhé!");
      return;
    }
    setSaving(true);

    try {
      const payload = {
        title: title.trim(),
        ageGroup,
        duration: duration.trim() || "30 phút",
        topic: topic.trim() || "Khám phá",
        objectives: {
          knowledge: objKnowledge.trim() || "Trẻ nắm được kiến thức bài dạy.",
          skills: objSkills.trim() || "Rèn kỹ năng quan sát và ghi nhớ.",
          attitude: objAttitude.trim() || "Trẻ tích cực tham gia hoạt động.",
        },
        preparation: {
          teacher: prepTeacher.trim() || "Đạo cụ giảng dạy.",
          child: prepChild.trim() || "Trang phục thoải mái.",
        },
        teacherActivities: teacherActsText
          .split("\n")
          .filter((line) => line.trim() !== ""),
        childActivities: childActsText
          .split("\n")
          .filter((line) => line.trim() !== ""),
        openQuestions: openQuestionsText
          .split("\n")
          .filter((line) => line.trim() !== ""),
        reinforcementGame: {
          name: gameName.trim() || "Trò chơi củng cố",
          rules: gameRules.trim() || "Hào hứng tham gia",
          how_to_play: gameHowToPlay.trim() || "Thực hiện theo hướng dẫn của cô",
        },
        conclusion: conclusion.trim() || "Cô tổng kết và khen ngợi cả lớp.",
        assessment: assessment.trim() || "Đánh giá mức độ hào hứng của trẻ.",
        extension: extension.trim() || "Hoạt động bổ trợ tại các góc chơi.",
      };

      const res = await fetch("/api/lessons", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (data.success && data.lesson) {
        onSuccess(data.lesson);
        onClose();
      } else {
        alert(data.error || "Không thể lưu giáo án");
      }
    } catch (err) {
      console.error(err);
      alert("Lỗi kết nối khi lưu giáo án");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-3xl w-full p-6 shadow-2xl my-8 border border-emerald-100 max-h-[90vh] overflow-y-auto">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-emerald-100 pb-4 mb-4">
          <div className="flex items-center gap-3 text-emerald-900">
            <div className="w-9 h-9 rounded-2xl bg-emerald-600 text-white flex items-center justify-center font-bold shadow-sm">
              <Plus className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-extrabold">Tự Soạn Giáo Án Thủ Công</h2>
              <p className="text-xs text-slate-500">
                Nhập nội dung giáo án theo ý muốn và lưu vào kho bài giảng
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          {/* General Metadata */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="md:col-span-2">
              <label className="block font-bold text-slate-700 mb-1">
                Tên bài dạy / Giáo án <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="Ví dụ: Khám phá quả cam tươi ngọt"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-700 mb-1">Độ tuổi</label>
              <select
                value={ageGroup}
                onChange={(e) => setAgeGroup(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white font-medium"
              >
                <option value="2–3 tuổi">2–3 tuổi (Nhà trẻ)</option>
                <option value="3–4 tuổi">3–4 tuổi (Mầm)</option>
                <option value="4–5 tuổi">4–5 tuổi (Chồi)</option>
                <option value="5–6 tuổi">5–6 tuổi (Lá)</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-700 mb-1">Thời lượng bài dạy</label>
              <input
                type="text"
                placeholder="30 phút"
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-700 mb-1">Chủ đề giáo dục</label>
              <input
                type="text"
                placeholder="Thế giới động vật, Thực vật..."
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>

          {/* Section I: Objectives */}
          <div className="bg-emerald-50/60 p-4 rounded-2xl border border-emerald-100 space-y-2">
            <h4 className="font-extrabold text-emerald-900 text-xs uppercase tracking-wide">
              I. Mục tiêu bài học
            </h4>
            <div>
              <label className="text-[11px] font-bold text-slate-700">1. Kiến thức:</label>
              <input
                type="text"
                placeholder="Trẻ nhận biết tên gọi, màu sắc, đặc điểm của..."
                value={objKnowledge}
                onChange={(e) => setObjKnowledge(e.target.value)}
                className="w-full px-3 py-1.5 rounded-lg border border-slate-200 mt-0.5"
              />
            </div>
            <div>
              <label className="text-[11px] font-bold text-slate-700">2. Kỹ năng:</label>
              <input
                type="text"
                placeholder="Rèn kỹ năng quan sát, phát triển ngôn ngữ..."
                value={objSkills}
                onChange={(e) => setObjSkills(e.target.value)}
                className="w-full px-3 py-1.5 rounded-lg border border-slate-200 mt-0.5"
              />
            </div>
            <div>
              <label className="text-[11px] font-bold text-slate-700">3. Thái độ:</label>
              <input
                type="text"
                placeholder="Trẻ hào hứng, biết yêu quý môi trường..."
                value={objAttitude}
                onChange={(e) => setObjAttitude(e.target.value)}
                className="w-full px-3 py-1.5 rounded-lg border border-slate-200 mt-0.5"
              />
            </div>
          </div>

          {/* Section II: Preparation */}
          <div className="bg-amber-50/60 p-4 rounded-2xl border border-amber-100 space-y-2">
            <h4 className="font-extrabold text-amber-900 text-xs uppercase tracking-wide">
              II. Chuẩn bị đạo cụ
            </h4>
            <div>
              <label className="text-[11px] font-bold text-slate-700">Đồ dùng của Cô:</label>
              <textarea
                rows={2}
                placeholder="Mô hình, tranh ảnh, nhạc nền..."
                value={prepTeacher}
                onChange={(e) => setPrepTeacher(e.target.value)}
                className="w-full px-3 py-1.5 rounded-lg border border-slate-200 mt-0.5"
              />
            </div>
            <div>
              <label className="text-[11px] font-bold text-slate-700">Đồ dùng của Trẻ:</label>
              <textarea
                rows={2}
                placeholder="Đĩa nhựa, mút xốp, trang phục..."
                value={prepChild}
                onChange={(e) => setPrepChild(e.target.value)}
                className="w-full px-3 py-1.5 rounded-lg border border-slate-200 mt-0.5"
              />
            </div>
          </div>

          {/* Section III: Detailed Activities */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-700 mb-1">
                Hoạt động của Cô giáo (Mỗi dòng 1 ý)
              </label>
              <textarea
                rows={4}
                placeholder="- Ổn định tổ chức: Hát bài hát...&#10;- Hoạt động 1: Cho trẻ xem hộp quà...&#10;- Hoạt động 2: Trải nghiệm quan sát..."
                value={teacherActsText}
                onChange={(e) => setTeacherActsText(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-700 mb-1">
                Hoạt động của Trẻ em (Mỗi dòng 1 ý)
              </label>
              <textarea
                rows={4}
                placeholder="- Trẻ nhún nhảy và hát theo cô...&#10;- Trẻ đoán tên vật trong hộp quà...&#10;- Trẻ truyền tay nhau quan sát..."
                value={childActsText}
                onChange={(e) => setChildActsText(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>

          {/* Section IV: Open Questions & Game */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-700 mb-1">
                Câu hỏi gợi mở cho trẻ (Mỗi dòng 1 câu)
              </label>
              <textarea
                rows={3}
                placeholder="Con thấy vỏ quả cam có màu gì?&#10;Khi sờ vào con thấy thế nào?"
                value={openQuestionsText}
                onChange={(e) => setOpenQuestionsText(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div className="bg-rose-50/60 p-3 rounded-2xl border border-rose-100 space-y-1.5">
              <h4 className="font-extrabold text-rose-900 text-xs uppercase tracking-wide">
                🎮 Trò chơi củng cố
              </h4>
              <input
                type="text"
                placeholder="Tên trò chơi (Ví dụ: Chọn cam nhanh mắt)"
                value={gameName}
                onChange={(e) => setGameName(e.target.value)}
                className="w-full px-3 py-1.5 rounded-lg border border-slate-200"
              />
              <input
                type="text"
                placeholder="Luật chơi ngắn gọn"
                value={gameRules}
                onChange={(e) => setGameRules(e.target.value)}
                className="w-full px-3 py-1.5 rounded-lg border border-slate-200"
              />
              <textarea
                rows={2}
                placeholder="Cách chơi chi tiết"
                value={gameHowToPlay}
                onChange={(e) => setGameHowToPlay(e.target.value)}
                className="w-full px-3 py-1.5 rounded-lg border border-slate-200"
              />
            </div>
          </div>

          {/* Footer & Assessment */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block font-bold text-slate-700 mb-1">Kết thúc hoạt động</label>
              <input
                type="text"
                placeholder="Cô nhận xét và tuyên dương lớp..."
                value={conclusion}
                onChange={(e) => setConclusion(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-700 mb-1">Đánh giá trẻ</label>
              <input
                type="text"
                placeholder="Đa số trẻ hào hứng tham gia..."
                value={assessment}
                onChange={(e) => setAssessment(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-700 mb-1">Hoạt động mở rộng</label>
              <input
                type="text"
                placeholder="Nặn quả cam ở góc tạo hình..."
                value={extension}
                onChange={(e) => setExtension(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200"
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-6 py-2.5 rounded-xl shadow-md transition-all"
            >
              <Save className="w-4 h-4" />
              <span>{saving ? "Đang lưu giáo án..." : "Lưu vào kho bài giảng"}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
