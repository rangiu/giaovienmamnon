"use client";

import React, { useEffect, useState } from "react";
import { MessagesSquare, Star, Loader2, Send, Trash2, EyeOff, Eye, ShieldCheck } from "lucide-react";
import { AutoGrowTextarea } from "@/components/ui/AutoGrowTextarea";
import { REACTION_TYPES, REACTION_EMOJI, REACTION_LABEL, ReactionType } from "@/lib/reactions";

interface FeedbackItem {
  id: string;
  authorName: string;
  rating: number | null;
  content: string;
  createdAt: string;
  isMine: boolean;
  isHidden?: boolean;
  reactionCounts: Partial<Record<ReactionType, number>>;
  myReaction: ReactionType | null;
}

function StarRow({
  value,
  onChange,
  size = "w-5 h-5",
}: {
  value: number;
  onChange?: (v: number) => void;
  size?: string;
}) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          disabled={!onChange}
          onClick={() => onChange?.(n)}
          className={onChange ? "cursor-pointer" : "cursor-default"}
        >
          <Star className={`${size} ${n <= value ? "fill-amber-400 text-amber-400" : "text-slate-300"}`} />
        </button>
      ))}
    </div>
  );
}

export default function DienDanPage() {
  const [feedbacks, setFeedbacks] = useState<FeedbackItem[]>([]);
  const [stats, setStats] = useState<{ total: number; ratedCount: number; avgRating: number | null }>({
    total: 0,
    ratedCount: 0,
    avgRating: null,
  });
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  const [rating, setRating] = useState(0);
  const [content, setContent] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const loadFeedbacks = () => {
    setLoading(true);
    fetch("/api/feedback")
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          setFeedbacks(data.feedbacks);
          setStats(data.stats);
        }
      })
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadFeedbacks();
    fetch("/api/auth/me")
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.user?.role === "admin") setIsAdmin(true);
      })
      .catch(() => {});
    // Vừa mở trang là coi như đã xem hết bài hiện có — reset số đỏ ở
    // Sidebar (không cần đợi cô đọc từng bài, mở trang là đủ tính "đã xem").
    fetch("/api/feedback/mark-seen", { method: "POST" }).catch(() => {});
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) return;
    setSubmitting(true);
    setFormError("");

    try {
      const res = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content, rating: rating || undefined }),
      });
      const data = await res.json();
      if (data.success) {
        setContent("");
        setRating(0);
        loadFeedbacks();
      } else {
        // 401 (chưa đăng nhập) đã tự bật popup đăng nhập qua AuthGateProvider
        // — chỉ cần hiện lỗi tại chỗ cho các trường hợp còn lại (VD: lọc
        // ngôn từ, thiếu nội dung).
        if (data.code !== undefined || res.status !== 401) {
          setFormError(data.error || "Không thể gửi phản hồi lúc này.");
        }
      }
    } catch (err) {
      console.error(err);
      setFormError("Lỗi kết nối, cô thử lại nhé.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Cô có chắc muốn xoá phản hồi này không?")) return;
    setDeletingId(id);
    try {
      const res = await fetch(`/api/feedback/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (data.success) {
        setFeedbacks((prev) => prev.filter((f) => f.id !== id));
      } else {
        alert(data.error || "Không thể xoá phản hồi.");
      }
    } finally {
      setDeletingId(null);
    }
  };

  const handleReact = async (feedbackId: string, emoji: ReactionType) => {
    try {
      const res = await fetch(`/api/feedback/${feedbackId}/react`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ emoji }),
      });
      const data = await res.json();
      if (data.success) {
        setFeedbacks((prev) =>
          prev.map((f) => (f.id === feedbackId ? { ...f, reactionCounts: data.counts, myReaction: data.myReaction } : f))
        );
      }
      // 401 (chưa đăng nhập) đã tự bật popup đăng nhập qua AuthGateProvider.
    } catch (err) {
      console.error(err);
    }
  };

  const handleAdminHide = async (id: string, hide: boolean) => {
    setDeletingId(id);
    try {
      const res = await fetch(`/api/feedback/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isHidden: hide }),
      });
      const data = await res.json();
      if (data.success) {
        setFeedbacks((prev) => prev.filter((f) => f.id !== id));
      } else {
        alert(data.error || "Không thể ẩn phản hồi.");
      }
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="space-y-6 pb-12 max-w-3xl mx-auto">
      {/* Header */}
      <div className="bg-white p-6 rounded-3xl border border-emerald-100 shadow-sm flex items-center gap-3">
        <div className="w-12 h-12 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shadow-md shadow-emerald-200">
          <MessagesSquare className="w-6 h-6" />
        </div>
        <div className="flex-1">
          <h1 className="text-xl md:text-2xl font-black text-slate-900 tracking-tight">Diễn đàn phản hồi</h1>
          <p className="text-xs text-slate-500">Chia sẻ trải nghiệm, góp ý và đánh giá của cô về SUMFLOW</p>
        </div>
        {stats.avgRating !== null && (
          <div className="text-right shrink-0 hidden sm:block">
            <div className="flex items-center justify-end gap-1">
              <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
              <span className="font-black text-slate-900">{stats.avgRating.toFixed(1)}</span>
            </div>
            <p className="text-[10px] text-slate-400">{stats.ratedCount} lượt đánh giá</p>
          </div>
        )}
      </div>

      {/* Form gửi phản hồi mới */}
      <div className="bg-white p-6 rounded-3xl border border-emerald-100 shadow-sm space-y-3">
        <h2 className="font-extrabold text-slate-900 text-sm">Để lại phản hồi của cô</h2>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="flex items-center gap-3">
            <span className="text-xs font-bold text-slate-600">Đánh giá:</span>
            <StarRow value={rating} onChange={setRating} />
            {rating > 0 && (
              <button type="button" onClick={() => setRating(0)} className="text-[11px] text-slate-400 hover:text-slate-600">
                Bỏ chọn
              </button>
            )}
          </div>
          <AutoGrowTextarea
            minRows={3}
            required
            maxLength={1000}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Cô thấy SUMFLOW dùng thế nào? Có góp ý gì để em cải thiện thêm không ạ?"
            className="w-full px-3.5 py-2.5 rounded-2xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-300"
          />
          {formError && (
            <p className="text-xs font-semibold text-rose-600 bg-rose-50 border border-rose-200 rounded-xl px-3 py-2">
              {formError}
            </p>
          )}
          <div className="flex items-center justify-between">
            <p className="text-[11px] text-slate-400">Nội dung công khai, hiển thị cho mọi người xem.</p>
            <button
              type="submit"
              disabled={submitting || !content.trim()}
              className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-5 py-2.5 rounded-xl shadow-sm transition-colors disabled:opacity-60"
            >
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              {submitting ? "Đang gửi..." : "Gửi phản hồi"}
            </button>
          </div>
        </form>
      </div>

      {/* Danh sách phản hồi */}
      <div className="space-y-3">
        {loading ? (
          <div className="bg-white p-12 rounded-3xl text-center border border-emerald-100">
            <Loader2 className="w-7 h-7 text-emerald-600 animate-spin mx-auto" />
          </div>
        ) : feedbacks.length === 0 ? (
          <div className="bg-white p-12 rounded-3xl text-center border border-dashed border-slate-300">
            <MessagesSquare className="w-10 h-10 text-slate-300 mx-auto mb-2" />
            <p className="text-sm text-slate-500">Chưa có phản hồi nào — cô hãy là người đầu tiên chia sẻ nhé!</p>
          </div>
        ) : (
          feedbacks.map((f) => (
            <div key={f.id} className="bg-white p-5 rounded-3xl border border-emerald-100 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-700 font-bold text-xs flex items-center justify-center shrink-0">
                    {f.authorName?.[0]?.toUpperCase() || "C"}
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-slate-800 truncate">{f.authorName}</p>
                    <p className="text-[10px] text-slate-400">{new Date(f.createdAt).toLocaleString("vi-VN")}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {f.rating && <StarRow value={f.rating} size="w-3.5 h-3.5" />}
                  {f.isMine && (
                    <button
                      onClick={() => handleDelete(f.id)}
                      disabled={deletingId === f.id}
                      title="Xoá phản hồi của tôi"
                      className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors disabled:opacity-50"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                  {isAdmin && !f.isMine && (
                    <button
                      onClick={() => handleAdminHide(f.id, true)}
                      disabled={deletingId === f.id}
                      title="Ẩn phản hồi này (quản trị)"
                      className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-amber-600 hover:bg-amber-50 transition-colors disabled:opacity-50"
                    >
                      <EyeOff className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
              <p className="text-sm text-slate-700 leading-relaxed mt-3 whitespace-pre-wrap">{f.content}</p>

              {/* Biểu cảm kiểu Facebook — bấm lại đúng biểu cảm đã chọn để bỏ chọn. */}
              <div className="flex items-center gap-1 mt-3 pt-3 border-t border-slate-50 flex-wrap">
                {REACTION_TYPES.map((emoji) => {
                  const count = f.reactionCounts?.[emoji] || 0;
                  const isMine = f.myReaction === emoji;
                  return (
                    <button
                      key={emoji}
                      onClick={() => handleReact(f.id, emoji)}
                      title={REACTION_LABEL[emoji]}
                      className={`inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full border transition-colors ${
                        isMine
                          ? "bg-emerald-100 border-emerald-300 text-emerald-800 font-bold"
                          : "bg-slate-50 border-slate-200 text-slate-500 hover:bg-slate-100"
                      }`}
                    >
                      <span>{REACTION_EMOJI[emoji]}</span>
                      {count > 0 && <span>{count}</span>}
                    </button>
                  );
                })}
              </div>
            </div>
          ))
        )}
      </div>

      {isAdmin && (
        <p className="flex items-center gap-1.5 text-[11px] text-slate-400 justify-center">
          <ShieldCheck className="w-3.5 h-3.5" />
          Bạn đang xem với quyền quản trị — có thể ẩn phản hồi không phù hợp.
        </p>
      )}
    </div>
  );
}
