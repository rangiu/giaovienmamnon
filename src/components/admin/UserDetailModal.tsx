"use client";

import React, { useEffect, useState } from "react";
import { X, Loader2, LogIn, Sparkles, CreditCard, Lock, Unlock, Mail, Calendar, School, Phone, Send, CheckCircle2, Video, Gift, KeyRound, Copy, Check } from "lucide-react";
import { getActivityStatus } from "./activityStatus";
import { AutoGrowTextarea } from "@/components/ui/AutoGrowTextarea";

interface ActivityEntry {
  type: "LOGIN" | "AI_USAGE" | "PAYMENT";
  at: string;
  title: string;
  detail?: string;
}

interface UserDetail {
  id: string;
  email: string;
  name: string;
  role: string;
  createdAt: string;
  isLocked: boolean;
  lockedAt: string | null;
  schoolName: string | null;
  className: string | null;
  studentCount: number | null;
  phone: string | null;
  subscription: {
    status: string;
    trialEndsAt: string | null;
    currentPeriodEnd: string | null;
  } | null;
  lastActiveAt: string | null;
}

const ACTIVITY_ICON: Record<ActivityEntry["type"], React.ElementType> = {
  LOGIN: LogIn,
  AI_USAGE: Sparkles,
  PAYMENT: CreditCard,
};

const ACTIVITY_COLOR: Record<ActivityEntry["type"], string> = {
  LOGIN: "bg-slate-100 text-slate-600",
  AI_USAGE: "bg-emerald-100 text-emerald-700",
  PAYMENT: "bg-amber-100 text-amber-700",
};

interface UserDetailModalProps {
  userId: string | null;
  onClose: () => void;
  onToggleLock: (userId: string, locked: boolean) => Promise<void>;
}

export function UserDetailModal({ userId, onClose, onToggleLock }: UserDetailModalProps) {
  const [detail, setDetail] = useState<UserDetail | null>(null);
  const [activity, setActivity] = useState<ActivityEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState(false);

  const [grantingCredits, setGrantingCredits] = useState(false);
  const [creditsGranted, setCreditsGranted] = useState<string | null>(null);

  const [showEmailForm, setShowEmailForm] = useState(false);
  const [emailSubject, setEmailSubject] = useState("");
  const [emailMessage, setEmailMessage] = useState("");
  const [sendingEmail, setSendingEmail] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [emailError, setEmailError] = useState("");

  const [resettingPassword, setResettingPassword] = useState(false);
  const [tempPassword, setTempPassword] = useState<string | null>(null);
  const [copiedTempPassword, setCopiedTempPassword] = useState(false);

  useEffect(() => {
    if (!userId) return;
    setLoading(true);
    setDetail(null);
    setShowEmailForm(false);
    setEmailSubject("");
    setEmailMessage("");
    setEmailSent(false);
    setEmailError("");
    setTempPassword(null);
    setCopiedTempPassword(false);
    fetch(`/api/admin/users/${userId}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          setDetail(data.user);
          setActivity(data.activity || []);
        }
      })
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, [userId]);

  if (!userId) return null;

  const handleToggle = async () => {
    if (!detail) return;
    setToggling(true);
    try {
      await onToggleLock(detail.id, !detail.isLocked);
      setDetail({ ...detail, isLocked: !detail.isLocked });
    } finally {
      setToggling(false);
    }
  };

  const grantVideoCredits = async (tier: "HYBRID" | "VEO", amount: number) => {
    if (!detail) return;
    setGrantingCredits(true);
    setCreditsGranted(null);
    try {
      const res = await fetch(`/api/admin/users/${detail.id}/grant-video-credits`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tier, amount }),
      });
      const data = await res.json();
      if (data.success) {
        setCreditsGranted(`Đã tặng ${amount} token ${tier === "HYBRID" ? "Hybrid" : "Veo"}!`);
      }
    } finally {
      setGrantingCredits(false);
    }
  };

  const handleResetPassword = async () => {
    if (!detail) return;
    if (!window.confirm(`Đặt lại mật khẩu cho ${detail.name}? Cô sẽ bị đăng xuất khỏi mọi thiết bị và cần mật khẩu mới để đăng nhập lại.`)) return;
    setResettingPassword(true);
    setTempPassword(null);
    try {
      const res = await fetch(`/api/admin/users/${detail.id}/reset-password`, { method: "POST" });
      const data = await res.json();
      if (data.success) {
        setTempPassword(data.tempPassword);
        setCopiedTempPassword(false);
      } else {
        alert(data.error || "Không thể đặt lại mật khẩu.");
      }
    } catch {
      alert("Không thể kết nối tới máy chủ.");
    } finally {
      setResettingPassword(false);
    }
  };

  const handleCopyTempPassword = async () => {
    if (!tempPassword) return;
    try {
      await navigator.clipboard.writeText(tempPassword);
      setCopiedTempPassword(true);
      setTimeout(() => setCopiedTempPassword(false), 2000);
    } catch {
      // Clipboard có thể bị chặn ở vài trình duyệt/HTTP không an toàn — cô vẫn thấy mật khẩu để tự chép tay.
    }
  };

  const handleSendEmail = async () => {
    if (!detail || !emailSubject.trim() || !emailMessage.trim()) return;
    setSendingEmail(true);
    setEmailError("");
    try {
      const res = await fetch(`/api/admin/users/${detail.id}/send-email`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subject: emailSubject, message: emailMessage }),
      });
      const data = await res.json();
      if (data.success) {
        setEmailSent(true);
        setEmailSubject("");
        setEmailMessage("");
        setTimeout(() => {
          setEmailSent(false);
          setShowEmailForm(false);
        }, 2000);
      } else {
        setEmailError(data.error || "Gửi email thất bại.");
      }
    } catch {
      setEmailError("Không thể kết nối tới máy chủ.");
    } finally {
      setSendingEmail(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between border-b border-emerald-100 pb-3">
          <h3 className="font-extrabold text-slate-900 text-sm">Chi tiết tài khoản</h3>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {loading ? (
          <div className="py-12 text-center">
            <Loader2 className="w-6 h-6 text-emerald-600 animate-spin mx-auto" />
          </div>
        ) : !detail ? (
          <p className="text-xs text-slate-400 text-center py-8">Không tải được thông tin tài khoản.</p>
        ) : (
          <>
            <div className="space-y-2 text-xs">
              <div className="flex items-center justify-between gap-2">
                <p className="font-black text-slate-900 text-base">
                  {detail.name}{" "}
                  {detail.role === "admin" && (
                    <span className="text-[10px] bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full ml-1">Admin</span>
                  )}
                  {detail.isLocked && (
                    <span className="text-[10px] bg-rose-100 text-rose-700 px-2 py-0.5 rounded-full ml-1">Đã khoá</span>
                  )}
                </p>
                {(() => {
                  const activityInfo = getActivityStatus(detail.lastActiveAt);
                  return (
                    <span className={`shrink-0 inline-flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-1 rounded-full ${activityInfo.className}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${activityInfo.dotClassName}`} />
                      {activityInfo.label}
                    </span>
                  );
                })()}
              </div>
              <p className="flex items-center gap-1.5 text-slate-500">
                <Mail className="w-3.5 h-3.5" /> {detail.email}
              </p>
              <p className="flex items-center gap-1.5 text-slate-500">
                <Calendar className="w-3.5 h-3.5" /> Tạo tài khoản: {new Date(detail.createdAt).toLocaleString("vi-VN")}
              </p>
              <p className="flex items-center gap-1.5 text-slate-500">
                <LogIn className="w-3.5 h-3.5" />{" "}
                {detail.lastActiveAt
                  ? `Hoạt động gần nhất: ${new Date(detail.lastActiveAt).toLocaleString("vi-VN")}`
                  : "Chưa từng có hoạt động nào"}
              </p>
              {detail.phone && (
                <p className="flex items-center gap-1.5 text-slate-500">
                  <Phone className="w-3.5 h-3.5" /> {detail.phone}
                </p>
              )}
              {detail.schoolName && (
                <p className="flex items-center gap-1.5 text-slate-500">
                  <School className="w-3.5 h-3.5" /> {detail.schoolName} {detail.className ? `• ${detail.className}` : ""}
                </p>
              )}
              {detail.subscription && (
                <div className="bg-slate-50 rounded-xl p-3 mt-2 space-y-1">
                  <p>
                    <strong>Trạng thái gói:</strong> {detail.subscription.status}
                  </p>
                  {detail.subscription.currentPeriodEnd && (
                    <p>
                      <strong>Hết hạn gói trả phí:</strong>{" "}
                      {new Date(detail.subscription.currentPeriodEnd).toLocaleString("vi-VN")}
                    </p>
                  )}
                  {detail.subscription.trialEndsAt && (
                    <p>
                      <strong>Hết hạn dùng thử:</strong> {new Date(detail.subscription.trialEndsAt).toLocaleString("vi-VN")}
                    </p>
                  )}
                </div>
              )}
            </div>

            <div className="flex items-center gap-2">
              {detail.role !== "admin" && (
                <button
                  onClick={handleToggle}
                  disabled={toggling}
                  className={`flex-1 flex items-center justify-center gap-2 text-xs font-bold py-2.5 rounded-xl transition-colors disabled:opacity-60 ${
                    detail.isLocked
                      ? "bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200"
                      : "bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200"
                  }`}
                >
                  {detail.isLocked ? <Unlock className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
                  {toggling ? "Đang xử lý..." : detail.isLocked ? "Mở khoá tài khoản" : "Khoá tài khoản"}
                </button>
              )}
              <button
                onClick={() => setShowEmailForm((v) => !v)}
                className="flex-1 flex items-center justify-center gap-2 text-xs font-bold py-2.5 rounded-xl bg-sky-50 hover:bg-sky-100 text-sky-700 border border-sky-200 transition-colors"
              >
                <Mail className="w-4 h-4" />
                Gửi email
              </button>
            </div>

            {/* Hỗ trợ lấy lại tài khoản/mật khẩu — cho cô KHÔNG còn truy cập
                được email đã đăng ký (không dùng được luồng OTP tự phục vụ),
                thường nhắn admin qua Zalo nhờ hỗ trợ. */}
            {detail.role !== "admin" && (
              <div className="bg-amber-50/60 border border-amber-100 rounded-2xl p-3.5 space-y-2">
                <p className="flex items-center gap-1.5 text-[11px] font-bold text-amber-800">
                  <KeyRound className="w-3.5 h-3.5" /> Hỗ trợ lấy lại mật khẩu
                </p>
                <p className="text-[11px] text-amber-700">
                  Dùng khi cô báo mất tài khoản mà không tự lấy lại được (không còn truy cập email đã đăng ký).
                </p>
                <button
                  onClick={handleResetPassword}
                  disabled={resettingPassword}
                  className="w-full flex items-center justify-center gap-2 bg-white hover:bg-amber-100 text-amber-800 border border-amber-200 text-[11px] font-bold py-2 rounded-lg disabled:opacity-50"
                >
                  <KeyRound className="w-3.5 h-3.5" />
                  {resettingPassword ? "Đang đặt lại..." : "Đặt lại mật khẩu giúp cô"}
                </button>
                {tempPassword && (
                  <div className="bg-white border border-amber-300 rounded-xl p-3 space-y-1.5">
                    <p className="text-[11px] font-bold text-slate-700">
                      Mật khẩu tạm — gửi ngay cho cô, chỉ hiện DUY NHẤT lần này:
                    </p>
                    <div className="flex items-center gap-2">
                      <code className="flex-1 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-sm font-black tracking-wide text-slate-900">
                        {tempPassword}
                      </code>
                      <button
                        onClick={handleCopyTempPassword}
                        className="shrink-0 w-8 h-8 rounded-lg bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-600"
                        aria-label="Sao chép mật khẩu tạm"
                      >
                        {copiedTempPassword ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                    <p className="text-[10px] text-slate-400">Cô đã bị đăng xuất khỏi mọi thiết bị, cần đăng nhập lại bằng mật khẩu này.</p>
                  </div>
                )}
              </div>
            )}

            {detail.role !== "admin" && (
              <div className="bg-emerald-50/60 border border-emerald-100 rounded-2xl p-3.5 space-y-2">
                <p className="flex items-center gap-1.5 text-[11px] font-bold text-emerald-800">
                  <Video className="w-3.5 h-3.5" /> Tặng tín dụng tạo video
                </p>
                {creditsGranted && <p className="text-[11px] font-semibold text-emerald-700">{creditsGranted}</p>}
                <div className="flex flex-wrap gap-1.5">
                  <button
                    onClick={() => grantVideoCredits("HYBRID", 5)}
                    disabled={grantingCredits}
                    className="flex items-center gap-1 bg-white hover:bg-emerald-100 text-emerald-700 border border-emerald-200 text-[11px] font-bold px-2.5 py-1.5 rounded-lg disabled:opacity-50"
                  >
                    <Gift className="w-3 h-3" /> +5 Hybrid
                  </button>
                  <button
                    onClick={() => grantVideoCredits("HYBRID", 20)}
                    disabled={grantingCredits}
                    className="flex items-center gap-1 bg-white hover:bg-emerald-100 text-emerald-700 border border-emerald-200 text-[11px] font-bold px-2.5 py-1.5 rounded-lg disabled:opacity-50"
                  >
                    <Gift className="w-3 h-3" /> +20 Hybrid
                  </button>
                  <button
                    onClick={() => grantVideoCredits("VEO", 2)}
                    disabled={grantingCredits}
                    className="flex items-center gap-1 bg-white hover:bg-emerald-100 text-emerald-700 border border-emerald-200 text-[11px] font-bold px-2.5 py-1.5 rounded-lg disabled:opacity-50"
                  >
                    <Gift className="w-3 h-3" /> +2 Veo
                  </button>
                </div>
              </div>
            )}

            {showEmailForm && (
              <div className="bg-sky-50/60 border border-sky-100 rounded-2xl p-3.5 space-y-2.5">
                {emailSent ? (
                  <p className="flex items-center gap-1.5 text-emerald-700 font-bold text-xs py-2">
                    <CheckCircle2 className="w-4 h-4" /> Đã gửi email thành công tới {detail.email}!
                  </p>
                ) : (
                  <>
                    <p className="text-[11px] font-bold text-sky-800">Gửi email tới: {detail.email}</p>
                    {emailError && (
                      <p className="text-[11px] font-semibold text-rose-600 bg-rose-50 border border-rose-200 rounded-lg px-2.5 py-1.5">
                        {emailError}
                      </p>
                    )}
                    <input
                      type="text"
                      value={emailSubject}
                      onChange={(e) => setEmailSubject(e.target.value)}
                      placeholder="Tiêu đề email..."
                      className="w-full px-3 py-2 rounded-xl border border-sky-200 text-xs focus:outline-none focus:ring-2 focus:ring-sky-300"
                    />
                    <AutoGrowTextarea
                      value={emailMessage}
                      onChange={(e) => setEmailMessage(e.target.value)}
                      placeholder="Nội dung email..."
                      minRows={4}
                      className="w-full px-3 py-2 rounded-xl border border-sky-200 text-xs focus:outline-none focus:ring-2 focus:ring-sky-300 resize-none"
                    />
                    <button
                      onClick={handleSendEmail}
                      disabled={sendingEmail || !emailSubject.trim() || !emailMessage.trim()}
                      className="w-full flex items-center justify-center gap-2 bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold py-2 rounded-xl transition-colors disabled:opacity-50"
                    >
                      <Send className="w-3.5 h-3.5" />
                      {sendingEmail ? "Đang gửi..." : "Gửi email"}
                    </button>
                  </>
                )}
              </div>
            )}

            <div className="pt-2 border-t border-slate-100">
              <h4 className="font-bold text-slate-800 text-xs mb-2">Log hoạt động gần đây</h4>
              {activity.length === 0 ? (
                <p className="text-xs text-slate-400 text-center py-6">Chưa có hoạt động nào.</p>
              ) : (
                <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                  {activity.map((entry, idx) => {
                    const Icon = ACTIVITY_ICON[entry.type];
                    return (
                      <div key={idx} className="flex items-start gap-2.5 text-xs">
                        <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${ACTIVITY_COLOR[entry.type]}`}>
                          <Icon className="w-3.5 h-3.5" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="font-bold text-slate-800">{entry.title}</p>
                          {entry.detail && <p className="text-slate-400 text-[11px]">{entry.detail}</p>}
                          <p className="text-slate-400 text-[10px]">{new Date(entry.at).toLocaleString("vi-VN")}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
