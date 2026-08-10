"use client";

import React, { useState } from "react";
import { X, Save, Sparkles, Check } from "lucide-react";

interface LessonEditModalProps {
  lesson: any;
  isOpen: boolean;
  onClose: () => void;
  onSaveSuccess: (updatedLesson: any) => void;
}

export function LessonEditModal({
  lesson,
  isOpen,
  onClose,
  onSaveSuccess,
}: LessonEditModalProps) {
  if (!isOpen || !lesson) return null;

  const parseField = (field: any, defaultVal: any) => {
    if (!field) return defaultVal;
    if (typeof field === "object") return field;
    try {
      return JSON.parse(field);
    } catch {
      return defaultVal;
    }
  };

  const [title, setTitle] = useState(lesson.title || "");
  const [ageGroup, setAgeGroup] = useState(lesson.ageGroup || "4–5 tuổi");
  const [duration, setDuration] = useState(lesson.duration || "30 phút");
  const [topic, setTopic] = useState(lesson.topic || "");

  const initialObjs = parseField(lesson.objectives, { knowledge: "", skills: "", attitude: "" });
  const [objKnowledge, setObjKnowledge] = useState(initialObjs.knowledge || "");
  const [objSkills, setObjSkills] = useState(initialObjs.skills || "");
  const [objAttitude, setObjAttitude] = useState(initialObjs.attitude || "");

  const initialPreps = parseField(lesson.preparation, { teacher: "", child: "" });
  const [prepTeacher, setPrepTeacher] = useState(initialPreps.teacher || "");
  const [prepChild, setPrepChild] = useState(initialPreps.child || "");

  const initialTeacherActs = parseField(lesson.teacherActivities, []);
  const [teacherActsText, setTeacherActsText] = useState(
    Array.isArray(initialTeacherActs) ? initialTeacherActs.join("\n") : String(initialTeacherActs)
  );

  const initialChildActs = parseField(lesson.childActivities, []);
  const [childActsText, setChildActsText] = useState(
    Array.isArray(initialChildActs) ? initialChildActs.join("\n") : String(initialChildActs)
  );

  const initialGame = parseField(lesson.reinforcementGame, { name: "", rules: "", how_to_play: "" });
  const [gameName, setGameName] = useState(initialGame.name || "");
  const [gameRules, setGameRules] = useState(initialGame.rules || "");
  const [gameHowToPlay, setGameHowToPlay] = useState(initialGame.how_to_play || "");

  const [conclusion, setConclusion] = useState(lesson.conclusion || "");
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload = {
        title,
        ageGroup,
        duration,
        topic,
        objectives: {
          knowledge: objKnowledge,
          skills: objSkills,
          attitude: objAttitude,
        },
        preparation: {
          teacher: prepTeacher,
          child: prepChild,
        },
        teacherActivities: teacherActsText.split("\n").filter((line) => line.trim() !== ""),
        childActivities: childActsText.split("\n").filter((line) => line.trim() !== ""),
        reinforcementGame: {
          name: gameName,
          rules: gameRules,
          how_to_play: gameHowToPlay,
        },
        conclusion,
      };

      let res;
      if (lesson.id) {
        res = await fetch(`/api/lessons/${lesson.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      } else {
        res = await fetch("/api/lessons", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      }

      const data = await res.json();
      if (data.success) {
        onSaveSuccess(data.lesson);
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
        <div className="flex items-center justify-between border-b border-emerald-100 pb-4 mb-4">
          <div className="flex items-center gap-2 text-emerald-800">
            <Sparkles className="w-5 h-5 text-emerald-600" />
            <h2 className="text-lg font-bold">Chỉnh sửa Giáo án Mầm non</h2>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-4 text-sm">
          {/* Title & Metadata */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Tên hoạt động / Giáo án
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Độ tuổi
              </label>
              <select
                value={ageGroup}
                onChange={(e) => setAgeGroup(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
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
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Thời lượng
              </label>
              <input
                type="text"
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Chủ đề
              </label>
              <input
                type="text"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>

          {/* Objectives */}
          <div className="bg-emerald-50/50 p-4 rounded-2xl border border-emerald-100 space-y-2">
            <h4 className="font-bold text-emerald-900 text-xs uppercase tracking-wide">
              I. Mục tiêu bài học
            </h4>
            <div>
              <label className="text-[11px] text-slate-600 font-medium">Kiến thức:</label>
              <input
                type="text"
                value={objKnowledge}
                onChange={(e) => setObjKnowledge(e.target.value)}
                className="w-full px-3 py-1.5 rounded-lg border border-slate-200 text-xs"
              />
            </div>
            <div>
              <label className="text-[11px] text-slate-600 font-medium">Kỹ năng:</label>
              <input
                type="text"
                value={objSkills}
                onChange={(e) => setObjSkills(e.target.value)}
                className="w-full px-3 py-1.5 rounded-lg border border-slate-200 text-xs"
              />
            </div>
            <div>
              <label className="text-[11px] text-slate-600 font-medium">Thái độ:</label>
              <input
                type="text"
                value={objAttitude}
                onChange={(e) => setObjAttitude(e.target.value)}
                className="w-full px-3 py-1.5 rounded-lg border border-slate-200 text-xs"
              />
            </div>
          </div>

          {/* Preparation */}
          <div className="bg-amber-50/50 p-4 rounded-2xl border border-amber-100 space-y-2">
            <h4 className="font-bold text-amber-900 text-xs uppercase tracking-wide">
              II. Chuẩn bị
            </h4>
            <div>
              <label className="text-[11px] text-slate-600 font-medium">Giáo viên:</label>
              <textarea
                rows={2}
                value={prepTeacher}
                onChange={(e) => setPrepTeacher(e.target.value)}
                className="w-full px-3 py-1.5 rounded-lg border border-slate-200 text-xs"
              />
            </div>
            <div>
              <label className="text-[11px] text-slate-600 font-medium">Trẻ em:</label>
              <textarea
                rows={2}
                value={prepChild}
                onChange={(e) => setPrepChild(e.target.value)}
                className="w-full px-3 py-1.5 rounded-lg border border-slate-200 text-xs"
              />
            </div>
          </div>

          {/* Teacher & Child Activities */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Hoạt động của Cô (Mỗi dòng 1 hoạt động)
              </label>
              <textarea
                rows={4}
                value={teacherActsText}
                onChange={(e) => setTeacherActsText(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Hoạt động của Trẻ (Mỗi dòng 1 hoạt động)
              </label>
              <textarea
                rows={4}
                value={childActsText}
                onChange={(e) => setChildActsText(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>

          {/* Game */}
          <div className="bg-rose-50/50 p-4 rounded-2xl border border-rose-100 space-y-2">
            <h4 className="font-bold text-rose-900 text-xs uppercase tracking-wide">
              🎮 Trò chơi củng cố
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              <input
                type="text"
                placeholder="Tên trò chơi"
                value={gameName}
                onChange={(e) => setGameName(e.target.value)}
                className="w-full px-3 py-1.5 rounded-lg border border-slate-200 text-xs"
              />
              <input
                type="text"
                placeholder="Luật chơi"
                value={gameRules}
                onChange={(e) => setGameRules(e.target.value)}
                className="w-full px-3 py-1.5 rounded-lg border border-slate-200 text-xs"
              />
            </div>
            <textarea
              rows={2}
              placeholder="Cách chơi"
              value={gameHowToPlay}
              onChange={(e) => setGameHowToPlay(e.target.value)}
              className="w-full px-3 py-1.5 rounded-lg border border-slate-200 text-xs"
            />
          </div>
        </div>

        <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-slate-100">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl"
          >
            Hủy
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-5 py-2 rounded-xl shadow-md"
          >
            <Save className="w-4 h-4" />
            <span>{saving ? "Đang lưu..." : "Lưu thay đổi"}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
