"use client";

import React, { useState } from "react";
import {
  X,
  Mail,
  Lock,
  User,
  LogIn,
  UserPlus,
  Facebook,
  MessageCircle,
  KeyRound,
  CheckCircle2,
} from "lucide-react";

export type AuthMode = "login" | "signup" | "forgot" | "reset";

interface AuthModalProps {
  open: boolean;
  mode: AuthMode;
  onModeChange: (mode: AuthMode) => void;
  onClose: () => void;
  /** Gọi sau khi đăng nhập/đăng ký thành công — reload lại dữ liệu trang hiện tại. */
  onSuccess: () => void;
}

/**
 * Popup đăng nhập / đăng ký dùng chung toàn app — thay cho 2 trang riêng
 * /login, /signup trước đây. Khách vào web xem được ngay mọi trang, chỉ
 * khi thao tác cần đăng nhập (gọi API bị 401) thì popup này tự bật lên
 * (xem AuthGateProvider), hoặc bấm nút "Đăng nhập/Đăng ký" ở góc.
 */
export function AuthModal({ open, mode, onModeChange, onClose, onSuccess }: AuthModalProps) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [loading, setLoading] = useState(false);

  if (!open) return null;

  const resetForm = () => {
    setName("");
    setEmail("");
    setPassword("");
    setOtp("");
    setNewPassword("");
    setError("");
    setInfo("");
  };

  const handleSwitchMode = (next: AuthMode) => {
    resetForm();
    onModeChange(next);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setInfo("");
    setLoading(true);
    try {
      if (mode === "forgot") {
        const res = await fetch("/api/auth/forgot-password", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email }),
        });
        const data = await res.json();
        if (!data.success) {
          setError(data.error || "Không thể gửi mã.");
          return;
        }
        onModeChange("reset");
        setInfo(`Đã gửi mã OTP tới ${email} — cô kiểm tra hộp thư (kể cả mục Spam) nhé!`);
        return;
      }

      if (mode === "reset") {
        const res = await fetch("/api/auth/reset-password", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, otp, newPassword }),
        });
        const data = await res.json();
        if (!data.success) {
          setError(data.error || "Không thể đặt lại mật khẩu.");
          return;
        }
        handleSwitchMode("login");
        setInfo("Đặt lại mật khẩu thành công! Cô đăng nhập lại với mật khẩu mới nhé.");
        return;
      }

      const url = mode === "login" ? "/api/auth/login" : "/api/auth/signup";
      const body = mode === "login" ? { email, password } : { name, email, password };
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!data.success) {
        setError(data.error || (mode === "login" ? "Đăng nhập thất bại." : "Đăng ký thất bại."));
        return;
      }
      resetForm();
      onSuccess();
    } catch {
      setError("Không thể kết nối tới máy chủ. Vui lòng thử lại.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl space-y-4 relative max-h-[92vh] overflow-y-auto">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500"
          aria-label="Đóng"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex flex-col items-center gap-2 pt-2">
          <div className="w-12 h-12 rounded-2xl bg-white border border-emerald-100 flex items-center justify-center shadow-lg shadow-emerald-100">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo.png" alt="SUMFLOW" className="w-9 h-9 object-contain" />
          </div>
          <h2 className="text-lg font-black text-slate-900">
            {mode === "login" && "Đăng nhập SUMFLOW"}
            {mode === "signup" && "Tạo tài khoản SUMFLOW"}
            {mode === "forgot" && "Quên mật khẩu"}
            {mode === "reset" && "Nhập mã & đặt mật khẩu mới"}
          </h2>
          <p className="text-xs text-slate-500 text-center">
            {mode === "login" && "Đăng nhập để dùng đầy đủ tính năng của SUMFLOW."}
            {mode === "signup" && "Tạo tài khoản xong là dùng được ngay, không cần chờ hay xác minh gì cả."}
            {mode === "forgot" && "Nhập email đã đăng ký, em gửi mã OTP để cô đặt lại mật khẩu."}
            {mode === "reset" && "Nhập mã OTP vừa gửi tới email và mật khẩu mới."}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          {info && (
            <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-medium rounded-xl px-3 py-2.5 flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{info}</span>
            </div>
          )}
          {error && (
            <div className="bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium rounded-xl px-3 py-2.5">
              {error}
            </div>
          )}

          {mode === "signup" && (
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1.5">Họ và tên</label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Cô Nguyễn Thị Lan"
                  className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-300 focus:border-emerald-400"
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1.5">Email</label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="email"
                required
                readOnly={mode === "reset"}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="ban@truongmamnon.edu.vn"
                className={`w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-300 focus:border-emerald-400 ${
                  mode === "reset" ? "bg-slate-50 text-slate-500" : ""
                }`}
              />
            </div>
          </div>

          {(mode === "login" || mode === "signup") && (
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1.5">Mật khẩu</label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  required
                  minLength={mode === "signup" ? 6 : undefined}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={mode === "signup" ? "Tối thiểu 6 ký tự" : "••••••••"}
                  className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-300 focus:border-emerald-400"
                />
              </div>
              {mode === "login" && (
                <button
                  type="button"
                  onClick={() => handleSwitchMode("forgot")}
                  className="mt-1.5 text-[11px] font-bold text-emerald-700 hover:underline"
                >
                  Quên mật khẩu?
                </button>
              )}
            </div>
          )}

          {mode === "reset" && (
            <>
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1.5">Mã OTP (6 số)</label>
                <div className="relative">
                  <KeyRound className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    inputMode="numeric"
                    maxLength={6}
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
                    placeholder="123456"
                    className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 text-sm tracking-[0.3em] font-bold focus:outline-none focus:ring-2 focus:ring-emerald-300 focus:border-emerald-400"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1.5">Mật khẩu mới</label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="password"
                    required
                    minLength={6}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Tối thiểu 6 ký tự"
                    className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-300 focus:border-emerald-400"
                  />
                </div>
              </div>
              <button
                type="button"
                onClick={() => handleSwitchMode("forgot")}
                className="text-[11px] font-bold text-emerald-700 hover:underline"
              >
                Chưa nhận được mã? Gửi lại
              </button>
            </>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold py-2.5 rounded-xl shadow-sm transition-colors disabled:opacity-60"
          >
            {mode === "login" && <LogIn className="w-4 h-4" />}
            {mode === "signup" && <UserPlus className="w-4 h-4" />}
            {(mode === "forgot" || mode === "reset") && <KeyRound className="w-4 h-4" />}
            {loading
              ? "Đang xử lý..."
              : mode === "login"
              ? "Đăng nhập"
              : mode === "signup"
              ? "Đăng ký"
              : mode === "forgot"
              ? "Gửi mã OTP"
              : "Đặt lại mật khẩu"}
          </button>
        </form>

        <p className="text-center text-xs text-slate-500">
          {mode === "login" ? (
            <>
              Chưa có tài khoản?{" "}
              <button onClick={() => handleSwitchMode("signup")} className="text-emerald-700 font-bold hover:underline">
                Đăng ký ngay
              </button>
            </>
          ) : (
            <>
              Đã có tài khoản?{" "}
              <button onClick={() => handleSwitchMode("login")} className="text-emerald-700 font-bold hover:underline">
                Đăng nhập
              </button>
            </>
          )}
        </p>

        <div className="pt-3 border-t border-slate-100 space-y-2">
          <p className="text-center text-[10px] font-bold text-slate-400 uppercase tracking-wider">Cần hỗ trợ?</p>
          <div className="grid grid-cols-2 gap-2">
            <a
              href="https://www.facebook.com/share/17phzLgVWC/?mibextid=wwXIfr"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-1.5 bg-white hover:bg-blue-50 text-blue-700 text-xs font-bold py-2 rounded-xl border border-slate-200 hover:border-blue-200 transition-colors"
            >
              <Facebook className="w-3.5 h-3.5" />
              Facebook
            </a>
            <a
              href="https://zalo.me/0899442256"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-1.5 bg-white hover:bg-sky-50 text-sky-700 text-xs font-bold py-2 rounded-xl border border-slate-200 hover:border-sky-200 transition-colors"
            >
              <MessageCircle className="w-3.5 h-3.5" />
              Zalo
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
