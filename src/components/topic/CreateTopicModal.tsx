"use client";

import React, { useEffect, useState } from "react";
import { X, ClipboardCheck, Loader2, CheckCircle2 } from "lucide-react";

interface CreateTopicModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated: (topicId: string) => void;
  defaultAgeGroup?: string;
}

export function CreateTopicModal({ isOpen, onClose, onCreated, defaultAgeGroup }: CreateTopicModalProps) {
  const [name, setName] = useState("");
  const [ageGroup, setAgeGroup] = useState(defaultAgeGroup || "4–5 tuổi");
  const [startDate, setStartDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [endDate, setEndDate] = useState(() =>
    new Date(Date.now() + 25 * 86400000).toISOString().slice(0, 10)
  );
  const [domains, setDomains] = useState<any[]>([]);
  const [objectives, setObjectives] = useState<any[]>([]);
  const [selectedObjectiveIds, setSelectedObjectiveIds] = useState<string[]>([]);
  const [loadingObjectives, setLoadingObjectives] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    setLoadingObjectives(true);
    fetch("/api/assessment/objectives")
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          setDomains(data.domains || []);
          setObjectives(data.objectives || []);
          // Mặc định chọn sẵn tất cả mục tiêu — giáo viên có thể bỏ bớt.
          setSelectedObjectiveIds((data.objectives || []).map((o: any) => o.id));
        }
      })
      .catch((err) => console.error(err))
      .finally(() => setLoadingObjectives(false));
  }, [isOpen]);

  if (!isOpen) return null;

  const toggleObjective = (id: string) => {
    setSelectedObjectiveIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError("Cô vui lòng nhập tên chủ đề nhé!");
      return;
    }
    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch("/api/topics", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          ageGroup,
          startDate,
          endDate,
          objectiveIds: selectedObjectiveIds,
        }),
      });
      const data = await res.json();
      if (data.success) {
        onCreated(data.topic.id);
        onClose();
        setName("");
      } else {
        setError(data.error || "Không thể tạo chủ đề mới");
      }
    } catch (err) {
      console.error(err);
      setError("Không thể kết nối tới máy chủ");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl max-w-2xl w-full p-6 shadow-2xl space-y-5 border border-emerald-100 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between border-b border-emerald-100 pb-3">
          <div className="flex items-center gap-2.5 text-slate-900 font-extrabold text-base">
            <ClipboardCheck className="w-5 h-5 text-emerald-600" />
            <span>✨ Tạo Chủ đề Đánh giá mới</span>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div>
            <label className="block font-bold text-slate-700 mb-1">Tên chủ đề</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ví dụ: Thế giới động vật, Gia đình của bé..."
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 font-medium focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block font-bold text-slate-700 mb-1">Độ tuổi</label>
              <select
                value={ageGroup}
                onChange={(e) => setAgeGroup(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white font-medium focus:ring-2 focus:ring-emerald-500"
              >
                <option value="2–3 tuổi">2–3 tuổi</option>
                <option value="3–4 tuổi">3–4 tuổi</option>
                <option value="4–5 tuổi">4–5 tuổi</option>
                <option value="5–6 tuổi">5–6 tuổi</option>
              </select>
            </div>
            <div>
              <label className="block font-bold text-slate-700 mb-1">Ngày bắt đầu</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 font-medium focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-700 mb-1">Ngày kết thúc</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 font-medium focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-2">
              Chọn mục tiêu đánh giá cho chủ đề này
            </label>

            {loadingObjectives ? (
              <div className="text-center py-6 text-slate-400">
                <Loader2 className="w-5 h-5 animate-spin mx-auto" />
              </div>
            ) : objectives.length === 0 ? (
              <p className="text-slate-400 italic">Chưa có mục tiêu đánh giá nào trong hệ thống.</p>
            ) : (
              <div className="space-y-3 max-h-64 overflow-y-auto border border-slate-200 rounded-2xl p-3">
                {domains.map((domain) => {
                  const domainObjectives = objectives.filter((o) => o.domainCode === domain.code);
                  if (domainObjectives.length === 0) return null;
                  return (
                    <div key={domain.id}>
                      <h4 className="font-bold text-emerald-800 mb-1.5">{domain.name}</h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                        {domainObjectives.map((obj) => (
                          <label
                            key={obj.id}
                            className="flex items-start gap-2 p-2 rounded-xl hover:bg-emerald-50 cursor-pointer"
                          >
                            <input
                              type="checkbox"
                              checked={selectedObjectiveIds.includes(obj.id)}
                              onChange={() => toggleObjective(obj.id)}
                              className="mt-0.5 accent-emerald-600"
                            />
                            <span className="text-slate-700">
                              <strong className="text-slate-900">{obj.code}</strong> — {obj.name}
                            </span>
                          </label>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {error && (
            <p className="text-rose-600 font-semibold bg-rose-50 border border-rose-200 rounded-xl p-2.5">
              {error}
            </p>
          )}

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 font-bold text-slate-600 hover:bg-slate-100 rounded-xl"
            >
              Huỷ
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-5 py-2.5 rounded-xl shadow-sm disabled:opacity-60"
            >
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
              <span>{submitting ? "Đang tạo..." : "Tạo chủ đề"}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
