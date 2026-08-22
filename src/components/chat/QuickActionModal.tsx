"use client";

import React, { useState } from "react";
import { X, Loader2, Sparkles } from "lucide-react";
import { AutoGrowTextarea } from "@/components/ui/AutoGrowTextarea";

export interface QuickActionField {
  key: string;
  label: string;
  type: "text" | "textarea" | "select";
  required?: boolean;
  placeholder?: string;
  options?: { value: string; label: string }[];
  defaultValue?: string;
}

export interface QuickActionConfig {
  id: string;
  title: string;
  description: string;
  fields: QuickActionField[];
}

interface QuickActionModalProps {
  config: QuickActionConfig | null;
  onClose: () => void;
  onSubmit: (values: Record<string, string>) => Promise<void> | void;
  submitting: boolean;
}

/**
 * Modal nhập thông tin thật trước khi gọi AI — thay cho việc bấm nút gợi ý
 * nhanh là AI trả lời ngay với 1 câu hỏi mẫu viết cứng, không liên quan gì
 * tới lớp/trẻ thật của cô. Cô điền đúng chủ đề/tên bé/tình huống thật rồi
 * mới gửi cho AI.
 */
export function QuickActionModal({ config, onClose, onSubmit, submitting }: QuickActionModalProps) {
  const [values, setValues] = useState<Record<string, string>>(() => {
    const initial: Record<string, string> = {};
    config?.fields.forEach((f) => {
      initial[f.key] = f.defaultValue || "";
    });
    return initial;
  });

  // Reset form khi đổi sang action khác
  React.useEffect(() => {
    const initial: Record<string, string> = {};
    config?.fields.forEach((f) => {
      initial[f.key] = f.defaultValue || "";
    });
    setValues(initial);
  }, [config?.id]);

  if (!config) return null;

  const handleChange = (key: string, value: string) => {
    setValues((prev) => ({ ...prev, [key]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(values);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between border-b border-emerald-100 pb-3">
          <div>
            <h3 className="font-extrabold text-slate-900 text-sm flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-emerald-600" />
              {config.title}
            </h3>
            <p className="text-[11px] text-slate-500 mt-0.5">{config.description}</p>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3 text-xs">
          {config.fields.map((field) => (
            <div key={field.key}>
              <label className="block font-bold text-slate-700 mb-1">
                {field.label}
                {field.required && <span className="text-rose-500"> *</span>}
              </label>

              {field.type === "textarea" ? (
                <AutoGrowTextarea
                  minRows={3}
                  required={field.required}
                  placeholder={field.placeholder}
                  value={values[field.key] || ""}
                  onChange={(e) => handleChange(field.key, e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500"
                />
              ) : field.type === "select" ? (
                <select
                  value={values[field.key] || ""}
                  onChange={(e) => handleChange(field.key, e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white focus:ring-2 focus:ring-emerald-500"
                >
                  {field.options?.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  type="text"
                  required={field.required}
                  placeholder={field.placeholder}
                  value={values[field.key] || ""}
                  onChange={(e) => handleChange(field.key, e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500"
                />
              )}
            </div>
          ))}

          <div className="flex justify-end gap-2 pt-2">
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
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
              <span>{submitting ? "SUMFLOW đang xử lý..." : "Gửi cho SUMFLOW"}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
