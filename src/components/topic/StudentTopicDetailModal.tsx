"use client";

import React from "react";
import { X, CheckCircle2, AlertCircle, FileText, Calendar, Link2, Sparkles } from "lucide-react";

interface StudentTopicDetailModalProps {
  studentRow: any;
  objectives: any[];
  isOpen: boolean;
  onClose: () => void;
}

export function StudentTopicDetailModal({
  studentRow,
  objectives,
  isOpen,
  onClose,
}: StudentTopicDetailModalProps) {
  if (!isOpen || !studentRow) return null;

  const achievedRatings = studentRow.ratings.filter((r: any) => r.rating === "+");
  const unachievedRatings = studentRow.ratings.filter((r: any) => r.rating === "-");

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-2xl w-full p-6 shadow-2xl space-y-5 border border-emerald-100 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-emerald-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-500 text-white font-black text-lg flex items-center justify-center shadow-md shadow-emerald-200">
              {studentRow.name.charAt(0)}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-extrabold text-slate-900">
                  {studentRow.name}
                </h2>
                <span
                  className={`text-xs font-black px-2.5 py-0.5 rounded-full ${
                    studentRow.classification === "ĐẠT"
                      ? "bg-emerald-100 text-emerald-800 border border-emerald-200"
                      : "bg-rose-100 text-rose-800 border border-rose-200"
                  }`}
                >
                  Xếp loại: {studentRow.classification}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Đạt: <strong>{studentRow.achievedCount} / {studentRow.totalObjectives} mục tiêu</strong> ({studentRow.passPercentage}%)
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

        {/* Achieved vs Unachieved Summary */}
        <div className="grid grid-cols-2 gap-3 text-xs">
          <div className="bg-emerald-50 p-3.5 rounded-2xl border border-emerald-200 space-y-1">
            <span className="text-emerald-800 font-bold block">🟢 Mục tiêu Đạt:</span>
            <strong className="text-lg font-black text-emerald-950">
              {achievedRatings.length} mục tiêu
            </strong>
          </div>

          <div className="bg-rose-50 p-3.5 rounded-2xl border border-rose-200 space-y-1">
            <span className="text-rose-800 font-bold block">🔴 Mục tiêu Chưa đạt:</span>
            <strong className="text-lg font-black text-rose-950">
              {unachievedRatings.length} mục tiêu
            </strong>
          </div>
        </div>

        {/* Detailed Objective List */}
        <div className="space-y-3">
          <h3 className="font-extrabold text-slate-900 text-xs uppercase tracking-wide">
            Chi tiết kết quả đánh giá theo từng mục tiêu
          </h3>

          <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
            {studentRow.ratings.map((r: any) => {
              const objInfo = objectives.find((o) => o.id === r.objectiveId || o.code === r.code);
              const isPassed = r.rating === "+";

              return (
                <div
                  key={r.objectiveId}
                  className={`p-3 rounded-2xl border text-xs space-y-1 ${
                    isPassed
                      ? "bg-emerald-50/60 border-emerald-200"
                      : "bg-rose-50/60 border-rose-200"
                  }`}
                >
                  <div className="flex items-center justify-between font-bold">
                    <span className="text-slate-900">
                      [{r.code}] {objInfo?.name || "Mục tiêu"}
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded-md text-[11px] font-black ${
                        isPassed ? "bg-emerald-600 text-white" : "bg-rose-600 text-white"
                      }`}
                    >
                      {isPassed ? "+ (ĐẠT)" : "- (CHƯA ĐẠT)"}
                    </span>
                  </div>
                  <p className="text-slate-600 text-[11px]">{objInfo?.description}</p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Linked Empirical Observation section */}
        {studentRow.observations?.length > 0 && (
          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-2">
            <div className="flex items-center gap-2 text-slate-900 font-bold text-xs">
              <Link2 className="w-4 h-4 text-emerald-600" />
              <h4>Minh chứng quan sát thực tế liên quan từ Nhật ký</h4>
            </div>
            <div className="space-y-2 text-xs">
              {studentRow.observations.map((obs: any) => (
                <div key={obs.id} className="bg-white p-3 rounded-xl border border-slate-200 space-y-1">
                  <div className="flex items-center justify-between text-[10px] text-slate-400">
                    <span className="font-bold text-emerald-800">{obs.category || "Quan sát"}</span>
                    <span>{new Date(obs.date).toLocaleDateString("vi-VN")}</span>
                  </div>
                  <p className="text-slate-800 font-medium">"{obs.content}"</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
