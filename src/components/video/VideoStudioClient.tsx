"use client";

import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Clapperboard, Sparkles, Loader2, AlertCircle, PlusCircle, CreditCard, Trash2, Wand2, Scissors } from "lucide-react";
import { AutoGrowTextarea } from "@/components/ui/AutoGrowTextarea";

interface VideoJobItem {
  id: string;
  tier: string;
  rawRequest: string;
  status: string;
  errorMessage: string | null;
  durationSeconds: number | null;
  requestedDurationSeconds: number | null;
  tokensConsumed: number | null;
  contentWasTrimmed: boolean;
  createdAt: string;
  completedAt: string | null;
  videoUrl: string | null;
}

// Công thức tính token PHẢI KHỚP ĐÚNG src/lib/videoCredits.ts (estimateTokenCost)
// — trùng lặp có chủ ý để hiện số NGAY trên giao diện lúc cô chọn thời
// lượng, không cần round-trip lên server (công thức thuần, không cần AI).
const SECONDS_PER_SCENE_ESTIMATE = 5;
const TOKENS_PER_CHARACTER_ASSET_ESTIMATE = 1;
const MIN_VIDEO_DURATION_SECONDS = 15;
const MAX_VIDEO_DURATION_SECONDS = 120;
const MIN_SCENES = 5;
const MAX_SCENES = 14;
const DURATION_PRESETS = [15, 30, 60, 90, 120];

function estimateTokenCost(durationSeconds: number): number {
  const rawScenes = Math.ceil(durationSeconds / SECONDS_PER_SCENE_ESTIMATE);
  const scenes = Math.min(MAX_SCENES, Math.max(MIN_SCENES, rawScenes));
  return scenes + TOKENS_PER_CHARACTER_ASSET_ESTIMATE;
}

const STATUS_INFO: Record<string, { label: string; className: string }> = {
  PENDING: { label: "Đang chờ xử lý", className: "bg-slate-100 text-slate-600" },
  SCRIPTING: { label: "Đang viết kịch bản...", className: "bg-sky-100 text-sky-700" },
  GENERATING_ASSETS: { label: "Đang vẽ nhân vật/nền...", className: "bg-sky-100 text-sky-700" },
  RENDERING: { label: "Đang dựng video...", className: "bg-amber-100 text-amber-700" },
  COMPLETED: { label: "Hoàn thành", className: "bg-emerald-100 text-emerald-700" },
  FAILED: { label: "Thất bại", className: "bg-rose-100 text-rose-700" },
};

const NON_TERMINAL_STATUSES = new Set(["PENDING", "SCRIPTING", "GENERATING_ASSETS", "RENDERING"]);
const MAX_REQUEST_LENGTH = 500;
const POLL_INTERVAL_MS = 8000;
// Khớp MAX_VIDEO_JOBS_PER_USER ở src/app/api/video-jobs/route.ts — chặn
// ngay ở giao diện (cảnh báo sớm) song song với chặn thật ở server.
const MAX_VIDEO_JOBS = 10;

export function VideoStudioClient() {
  const [balances, setBalances] = useState<{ HYBRID: number; VEO: number }>({ HYBRID: 0, VEO: 0 });
  const [jobs, setJobs] = useState<VideoJobItem[]>([]);
  const [loadingJobs, setLoadingJobs] = useState(true);

  const [rawRequest, setRawRequest] = useState("");
  const [durationSeconds, setDurationSeconds] = useState(30);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Ước lượng thời lượng bằng AI — lớp 1 trong 3 lớp phòng lỗi "thời lượng
  // chọn quá ngắn so với nội dung" (xem videoScriptEngine.ts's
  // estimateStoryDurationSeconds). Gọi TRƯỚC khi tạo video, KHÔNG tốn token
  // tín dụng video — chỉ 1 lệnh AI rẻ.
  const [estimating, setEstimating] = useState(false);
  const [estimatedSeconds, setEstimatedSeconds] = useState<number | null>(null);
  const [estimateError, setEstimateError] = useState<string | null>(null);

  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const loadBalances = () => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((data) => {
        if (data.success && data.videoCredits) setBalances(data.videoCredits);
      })
      .catch(() => {});
  };

  const loadJobs = async () => {
    try {
      const res = await fetch("/api/video-jobs");
      const data = await res.json();
      if (data.success) setJobs(data.jobs);
    } finally {
      setLoadingJobs(false);
    }
  };

  useEffect(() => {
    loadBalances();
    loadJobs();
  }, []);

  // Còn job nào chưa xong thì tự poll làm mới danh sách — không cần bấm F5.
  useEffect(() => {
    const hasPending = jobs.some((j) => NON_TERMINAL_STATUSES.has(j.status));
    if (!hasPending) {
      if (pollRef.current) clearInterval(pollRef.current);
      return;
    }
    pollRef.current = setInterval(() => {
      loadJobs();
      loadBalances();
    }, POLL_INTERVAL_MS);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jobs]);

  const handleEstimateDuration = async () => {
    if (!rawRequest.trim()) return;
    setEstimating(true);
    setEstimateError(null);
    setEstimatedSeconds(null);
    try {
      const res = await fetch("/api/video-jobs/estimate-duration", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rawRequest: rawRequest.trim() }),
      });
      const data = await res.json();
      if (data.success) {
        setEstimatedSeconds(data.estimatedSeconds);
      } else {
        setEstimateError(data.error || "Không ước lượng được.");
      }
    } catch {
      setEstimateError("Không thể kết nối tới máy chủ.");
    } finally {
      setEstimating(false);
    }
  };

  const applyEstimatedDuration = () => {
    if (estimatedSeconds == null) return;
    setDurationSeconds(estimatedSeconds);
    setEstimatedSeconds(null);
  };

  const handleDelete = async (jobId: string) => {
    if (!window.confirm("Xoá video này? Không thể khôi phục lại sau khi xoá.")) return;
    setDeletingId(jobId);
    try {
      const res = await fetch(`/api/video-jobs/${jobId}`, { method: "DELETE" });
      const data = await res.json();
      if (data.success) {
        setJobs((prev) => prev.filter((j) => j.id !== jobId));
      } else {
        setError(data.error || "Không thể xoá video.");
      }
    } catch {
      setError("Không thể kết nối tới máy chủ.");
    } finally {
      setDeletingId(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rawRequest.trim()) return;
    if (jobs.length >= MAX_VIDEO_JOBS) {
      setError(`Kho Video đã đầy (tối đa ${MAX_VIDEO_JOBS} video). Cô xoá bớt video cũ để tạo video mới nhé!`);
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/video-jobs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tier: "HYBRID", rawRequest: rawRequest.trim(), durationSeconds }),
      });
      const data = await res.json();
      if (data.success) {
        setRawRequest("");
        await loadJobs();
        await loadBalances();
      } else {
        setError(data.error || "Không thể tạo yêu cầu video.");
      }
    } catch {
      setError("Không thể kết nối tới máy chủ.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 pb-12">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
          <Clapperboard className="w-5 h-5" />
        </div>
        <div>
          <h1 className="text-lg font-black text-slate-900">Video Studio</h1>
          <p className="text-xs text-slate-500">Nhập yêu cầu, AI tự viết kịch bản, vẽ tranh minh hoạ và dựng video cho cô</p>
        </div>
      </div>

      {/* Số dư token */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-white rounded-2xl border border-emerald-100 shadow-sm p-4 flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold text-slate-500">Token Hybrid còn lại</p>
            <p className="text-xl font-black text-emerald-700">{balances.HYBRID}</p>
          </div>
          <Sparkles className="w-6 h-6 text-emerald-400" />
        </div>
        <div className="bg-white rounded-2xl border border-amber-100 shadow-sm p-4 flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold text-slate-500">Token Veo còn lại</p>
            <p className="text-xl font-black text-amber-700">{balances.VEO}</p>
          </div>
          <Clapperboard className="w-6 h-6 text-amber-400" />
        </div>
      </div>

      <Link
        href="/video-credits"
        className="flex items-center justify-center gap-2 bg-amber-500 hover:bg-amber-600 text-white text-sm font-bold py-3 rounded-2xl shadow-sm shadow-amber-200 transition-colors"
      >
        <CreditCard className="w-4 h-4" />
        Nạp thêm token
      </Link>

      {/* Form tạo video mới */}
      <div className="bg-white rounded-3xl border border-emerald-100 shadow-sm p-6 space-y-4">
        <div className="flex items-center gap-2 font-bold text-slate-800 text-sm">
          <PlusCircle className="w-4 h-4 text-emerald-600" />
          Tạo video mới
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div className="p-3 rounded-2xl border-2 border-emerald-500 bg-emerald-50 text-center">
            <p className="text-xs font-bold text-emerald-800">✅ Hybrid</p>
            <p className="text-[10px] text-emerald-600 mt-0.5">Ảnh AI + hoạt hình, giá rẻ</p>
          </div>
          <div className="p-3 rounded-2xl border-2 border-slate-200 bg-slate-50 text-center opacity-60">
            <p className="text-xs font-bold text-slate-500">🔒 Veo</p>
            <p className="text-[10px] text-slate-400 mt-0.5">Chuyển động thật — sắp ra mắt</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1">Yêu cầu của cô</label>
            <AutoGrowTextarea
              minRows={3}
              required
              value={rawRequest}
              onChange={(e) => {
                setRawRequest(e.target.value);
                setEstimatedSeconds(null);
                setEstimateError(null);
              }}
              maxLength={MAX_REQUEST_LENGTH}
              placeholder="VD: Video kể chuyện Thỏ con và Rùa con thi chạy, dành cho trẻ 4-5 tuổi, có bài học về sự kiên trì..."
              className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-300"
            />
            <div className="flex items-center justify-between mt-1">
              <button
                type="button"
                onClick={handleEstimateDuration}
                disabled={!rawRequest.trim() || estimating}
                className="flex items-center gap-1 text-[11px] font-bold text-emerald-700 hover:underline disabled:opacity-50 disabled:no-underline"
              >
                {estimating ? <Loader2 className="w-3 h-3 animate-spin" /> : <Wand2 className="w-3 h-3" />}
                {estimating ? "AI đang ước lượng..." : "AI ước lượng thời lượng phù hợp"}
              </button>
              <p className="text-[10px] text-slate-400">{rawRequest.length}/{MAX_REQUEST_LENGTH}</p>
            </div>

            {estimateError && (
              <p className="mt-1.5 text-[11px] text-slate-400">{estimateError}</p>
            )}

            {estimatedSeconds != null && (
              <div className="mt-1.5 flex items-center justify-between gap-2 bg-sky-50 border border-sky-200 rounded-xl px-3 py-2">
                <p className="text-[11px] font-semibold text-sky-800">
                  AI ước tính nội dung này cần khoảng <strong>{estimatedSeconds} giây</strong> để kể trọn vẹn.
                </p>
                <button
                  type="button"
                  onClick={applyEstimatedDuration}
                  className="shrink-0 text-[11px] font-bold text-white bg-sky-600 hover:bg-sky-700 px-2.5 py-1 rounded-lg"
                >
                  Dùng {estimatedSeconds}s
                </button>
              </div>
            )}
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1">Thời lượng video mong muốn (giây)</label>
            <div className="grid grid-cols-5 gap-1.5 mb-2">
              {DURATION_PRESETS.map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => setDurationSeconds(preset)}
                  className={`text-xs font-bold py-2 rounded-xl border-2 transition-colors ${
                    durationSeconds === preset
                      ? "border-emerald-500 bg-emerald-50 text-emerald-800"
                      : "border-slate-200 text-slate-500 hover:border-emerald-300"
                  }`}
                >
                  {preset}s
                </button>
              ))}
            </div>
            {/* Ô nhập số tự do thay cho thanh kéo cũ (chỉ chọn được các mốc
                cố định) — cho phép áp dụng ĐÚNG số giây AI ước lượng (VD 32,
                47 giây), các nút mốc nhanh ở trên chỉ là gợi ý điền nhanh. */}
            <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-100 rounded-xl px-3 py-2">
              <input
                type="number"
                min={MIN_VIDEO_DURATION_SECONDS}
                max={MAX_VIDEO_DURATION_SECONDS}
                value={durationSeconds}
                onChange={(e) => {
                  const val = Number(e.target.value);
                  if (Number.isFinite(val)) setDurationSeconds(val);
                }}
                onBlur={() =>
                  setDurationSeconds((v) => Math.min(MAX_VIDEO_DURATION_SECONDS, Math.max(MIN_VIDEO_DURATION_SECONDS, Math.round(v || MIN_VIDEO_DURATION_SECONDS))))
                }
                className="w-16 bg-transparent text-sm font-bold text-slate-700 focus:outline-none"
              />
              <span className="text-xs font-bold text-slate-500">giây</span>
              <span className="ml-auto text-xs font-black text-emerald-700">Tốn {estimateTokenCost(durationSeconds)} token</span>
            </div>
            <p className="text-[10px] text-slate-400 mt-1">
              Từ {MIN_VIDEO_DURATION_SECONDS} đến {MAX_VIDEO_DURATION_SECONDS} giây.
            </p>
          </div>

          {error && (
            <p className="flex items-center gap-1.5 text-xs font-semibold text-rose-600 bg-rose-50 border border-rose-200 rounded-xl px-3 py-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              {error}
            </p>
          )}

          {jobs.length >= MAX_VIDEO_JOBS && (
            <p className="flex items-center gap-1.5 text-xs font-semibold text-amber-700 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              Kho Video đã đầy ({jobs.length}/{MAX_VIDEO_JOBS}) — cô xoá bớt video cũ để tạo video mới nhé!
            </p>
          )}

          <button
            type="submit"
            disabled={
              submitting ||
              !rawRequest.trim() ||
              durationSeconds < MIN_VIDEO_DURATION_SECONDS ||
              durationSeconds > MAX_VIDEO_DURATION_SECONDS ||
              balances.HYBRID < estimateTokenCost(durationSeconds) ||
              jobs.length >= MAX_VIDEO_JOBS
            }
            className="w-full flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold py-3 rounded-xl shadow-sm transition-colors disabled:opacity-60"
          >
            {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
            {submitting
              ? "Đang gửi yêu cầu..."
              : jobs.length >= MAX_VIDEO_JOBS
              ? "Kho Video đã đầy"
              : durationSeconds < MIN_VIDEO_DURATION_SECONDS || durationSeconds > MAX_VIDEO_DURATION_SECONDS
              ? `Thời lượng phải từ ${MIN_VIDEO_DURATION_SECONDS} đến ${MAX_VIDEO_DURATION_SECONDS} giây`
              : balances.HYBRID < estimateTokenCost(durationSeconds)
              ? `Không đủ token — cần ${estimateTokenCost(durationSeconds)}, còn ${balances.HYBRID}`
              : `Tạo video (tốn ${estimateTokenCost(durationSeconds)} token)`}
          </button>
          <p className="text-[11px] text-slate-400 text-center leading-relaxed">
            Video có thể mất vài phút để tạo xong — cô sẽ nhận thông báo khi video sẵn sàng, không cần chờ ở trang này.
          </p>
        </form>
      </div>

      {/* Kho Video */}
      <div className="bg-white rounded-3xl border border-emerald-100 shadow-sm p-6 space-y-3">
        <div className="font-bold text-slate-800 text-sm">
          Kho Video ({jobs.length}/{MAX_VIDEO_JOBS})
        </div>

        {loadingJobs ? (
          <div className="py-8 text-center">
            <Loader2 className="w-5 h-5 text-emerald-600 animate-spin mx-auto" />
          </div>
        ) : jobs.length === 0 ? (
          <p className="text-center text-xs text-slate-400 py-8">Chưa có video nào — tạo video đầu tiên ở trên nhé!</p>
        ) : (
          <div className="space-y-3">
            {jobs.map((job) => {
              const statusInfo = STATUS_INFO[job.status] || { label: job.status, className: "bg-slate-100 text-slate-500" };
              return (
                <div key={job.id} className="border border-slate-100 rounded-2xl p-4 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm font-semibold text-slate-800 flex-1 min-w-0">{job.rawRequest}</p>
                    <span className={`shrink-0 text-[11px] font-bold px-2.5 py-1 rounded-full ${statusInfo.className}`}>
                      {statusInfo.label}
                    </span>
                    {!NON_TERMINAL_STATUSES.has(job.status) && (
                      <button
                        onClick={() => handleDelete(job.id)}
                        disabled={deletingId === job.id}
                        aria-label="Xoá video"
                        className="shrink-0 p-1.5 rounded-lg text-slate-400 hover:bg-rose-50 hover:text-rose-600 transition-colors disabled:opacity-50"
                      >
                        {deletingId === job.id ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Trash2 className="w-3.5 h-3.5" />
                        )}
                      </button>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-400">
                    {job.tier === "HYBRID" ? "Hybrid" : "Veo"} • {new Date(job.createdAt).toLocaleString("vi-VN")}
                    {job.durationSeconds ? ` • ${job.durationSeconds}s` : job.requestedDurationSeconds ? ` • ~${job.requestedDurationSeconds}s` : ""}
                    {job.tokensConsumed ? ` • ${job.tokensConsumed} token` : ""}
                  </p>

                  {job.contentWasTrimmed && (
                    <p className="flex items-start gap-1.5 text-[11px] text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-2.5 py-1.5">
                      <Scissors className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                      Nội dung khá dài so với thời lượng đã chọn — 1 vài đoạn đã được rút gọn tự động để vừa video. Chọn thời lượng dài hơn ở lần sau nếu muốn giữ trọn nội dung.
                    </p>
                  )}

                  {job.status === "COMPLETED" && job.videoUrl && (
                    <video controls preload="metadata" className="w-full rounded-xl bg-black max-h-96">
                      <source src={job.videoUrl} type="video/mp4" />
                    </video>
                  )}

                  {job.status === "FAILED" && job.errorMessage && (
                    <p className="text-[11px] text-rose-600 bg-rose-50 border border-rose-200 rounded-lg px-2.5 py-1.5">
                      {job.errorMessage}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
