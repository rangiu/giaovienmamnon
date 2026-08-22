"use client";

import React, { useState, useEffect } from "react";
import {
  BookOpen,
  Search,
  Plus,
  Trash2,
  Copy,
  Sparkles,
  Loader2,
  FolderOpen,
  Edit3,
} from "lucide-react";
import { LessonCard } from "@/components/lesson/LessonCard";
import { LessonCreateModal } from "@/components/lesson/LessonCreateModal";
import { TemplateQuickFormModal } from "@/components/lesson/TemplateQuickFormModal";
import Link from "next/link";

const AGE_GROUPS = ["Tất cả", "2–3 tuổi", "3–4 tuổi", "4–5 tuổi", "5–6 tuổi"];

export default function LessonsPage() {
  const [lessons, setLessons] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [selectedAge, setSelectedAge] = useState("Tất cả");
  const [loading, setLoading] = useState(true);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false);

  const fetchLessons = () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (search) params.append("search", search);
    if (selectedAge !== "Tất cả") params.append("ageGroup", selectedAge);

    fetch(`/api/lessons?${params.toString()}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.success) setLessons(data.lessons);
      })
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchLessons();
  }, [search, selectedAge]);

  const handleDeleteLesson = async (id: string) => {
    if (!confirm("Cô có chắc chắn muốn xóa giáo án này khỏi kho lưu trữ không?")) return;
    try {
      const res = await fetch(`/api/lessons/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (data.success) {
        setLessons((prev) => prev.filter((l) => l.id !== id));
      }
    } catch (err) {
      console.error("Delete lesson error:", err);
    }
  };

  const handleDuplicateLesson = async (lesson: any) => {
    try {
      const copyData = {
        ...lesson,
        id: undefined,
        title: `${lesson.title} (Bản sao)`,
      };
      const res = await fetch("/api/lessons", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(copyData),
      });
      const data = await res.json();
      if (data.success) {
        setLessons((prev) => [data.lesson, ...prev]);
        alert("Đã nhân bản giáo án thành công!");
      }
    } catch (err) {
      console.error("Duplicate error:", err);
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-emerald-100 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shadow-md shadow-emerald-200">
            <BookOpen className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl md:text-2xl font-black text-slate-900 tracking-tight">
              Kho Giáo án Mầm non
            </h1>
            <p className="text-xs text-slate-500">
              Quản lý danh sách bài giảng, tự tạo giáo án riêng, chỉnh sửa và xuất PDF
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setIsTemplateModalOpen(true)}
            className="inline-flex items-center justify-center gap-2 bg-amber-500 hover:bg-amber-600 text-white font-extrabold text-xs py-3 px-4 rounded-2xl shadow-md transition-all shrink-0"
          >
            <Sparkles className="w-4 h-4 text-amber-200" />
            <span>📋 Soạn Giáo Án Theo Mẫu Word</span>
          </button>

          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="inline-flex items-center justify-center gap-2 bg-emerald-100 hover:bg-emerald-200 text-emerald-900 font-extrabold text-xs py-3 px-4 rounded-2xl border border-emerald-300 transition-all shrink-0"
          >
            <Plus className="w-4 h-4 text-emerald-700" />
            <span>✍️ Tự soạn giáo án thủ công</span>
          </button>

          <Link
            href="/chat?preset=lesson"
            className="inline-flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs py-3 px-5 rounded-2xl shadow-md transition-all shrink-0"
          >
            <Sparkles className="w-4 h-4" />
            <span>🌟 Chat Soạn Bài</span>
          </Link>
        </div>
      </div>

      {/* Search & Filters */}
      <div className="flex flex-col sm:flex-row items-center gap-3 justify-between bg-white p-4 rounded-3xl border border-emerald-100 shadow-2xs">
        {/* Search Input */}
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
          <input
            type="text"
            placeholder="Tìm kiếm giáo án hoặc chủ đề..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
          />
        </div>

        {/* Age Group Filter Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
          {AGE_GROUPS.map((age) => (
            <button
              key={age}
              onClick={() => setSelectedAge(age)}
              className={`text-xs font-bold px-3.5 py-2 rounded-xl transition-all shrink-0 ${
                selectedAge === age
                  ? "bg-emerald-600 text-white shadow-sm"
                  : "bg-slate-100 hover:bg-emerald-50 text-slate-600 hover:text-emerald-700"
              }`}
            >
              {age}
            </button>
          ))}
        </div>
      </div>

      {/* Lesson List */}
      {loading ? (
        <div className="bg-white p-12 rounded-3xl text-center space-y-3 border border-emerald-100">
          <Loader2 className="w-8 h-8 text-emerald-600 animate-spin mx-auto" />
          <p className="text-xs text-slate-500">Đang tải kho giáo án...</p>
        </div>
      ) : lessons.length > 0 ? (
        <div className="space-y-6">
          {lessons.map((lesson) => (
            <div key={lesson.id} className="relative group">
              <LessonCard
                lesson={lesson}
                showSaveButton={false}
                onSaved={(updated) => {
                  setLessons((prev) =>
                    prev.map((l) => (l.id === updated.id ? updated : l))
                  );
                }}
              />

              {/* Management bar */}
              <div className="flex items-center justify-end gap-2 pt-2 px-2">
                <button
                  onClick={() => handleDuplicateLesson(lesson)}
                  className="inline-flex items-center gap-1 text-xs font-bold text-slate-600 hover:text-emerald-700 bg-slate-100 hover:bg-emerald-50 px-3 py-1.5 rounded-lg transition-colors"
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>Nhân bản giáo án</span>
                </button>
                <button
                  onClick={() => handleDeleteLesson(lesson.id)}
                  className="inline-flex items-center gap-1 text-xs font-bold text-rose-600 hover:text-rose-700 bg-rose-50 hover:bg-rose-100 px-3 py-1.5 rounded-lg transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Xóa</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-3xl p-12 text-center border border-dashed border-slate-300 space-y-3">
          <FolderOpen className="w-12 h-12 text-slate-300 mx-auto" />
          <h3 className="font-bold text-slate-700 text-base">
            Chưa tìm thấy giáo án phù hợp trong kho
          </h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            Cô có thể chọn tự tạo giáo án riêng thủ công hoặc yêu cầu SUMFLOW soạn tự động nhé!
          </p>
          <div className="flex justify-center gap-3 pt-2">
            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="inline-flex items-center gap-1.5 bg-emerald-100 text-emerald-900 font-bold text-xs py-2.5 px-4 rounded-xl border border-emerald-300 hover:bg-emerald-200"
            >
              <Plus className="w-4 h-4 text-emerald-700" />
              <span>✍️ Tự soạn giáo án</span>
            </button>
            <Link
              href="/chat"
              className="inline-flex items-center gap-1.5 bg-emerald-600 text-white font-bold text-xs py-2.5 px-4 rounded-xl shadow-sm hover:bg-emerald-700"
            >
              <Sparkles className="w-4 h-4" />
              <span>🌟 Soạn với SUMFLOW</span>
            </Link>
          </div>
        </div>
      )}

      {/* Manual Lesson Create Modal */}
      <LessonCreateModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSuccess={(newLesson) => {
          setLessons((prev) => [newLesson, ...prev]);
        }}
      />

      {/* AI Template & Quick Form Modal */}
      <TemplateQuickFormModal
        isOpen={isTemplateModalOpen}
        onClose={() => setIsTemplateModalOpen(false)}
        onLessonGenerated={(newLesson) => {
          setLessons((prev) => [newLesson, ...prev]);
        }}
      />
    </div>
  );
}
