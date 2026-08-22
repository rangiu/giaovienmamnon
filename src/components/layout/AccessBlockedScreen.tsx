"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, LogOut, MessageCircle } from "lucide-react";
import type { AccessReason } from "@/lib/auth";

/**
 * Chỉ còn hiện màn này cho trường hợp hiếm/thủ công (VD: admin tạm khoá 1
 * tài khoản) — luồng đăng ký bình thường không còn tạo trạng thái bị chặn
 * nữa, tạo tài khoản xong là vào dùng được ngay (không cần xác minh Gmail).
 */
export function AccessBlockedScreen({ reason, userName }: { reason: AccessReason; userName: string }) {
  const router = useRouter();
  const isLocked = reason === "LOCKED";

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-emerald-50 via-white to-amber-50 px-4">
      <div className="w-full max-w-sm bg-white rounded-3xl border border-emerald-100 shadow-sm p-8 text-center space-y-4">
        <div className="w-14 h-14 mx-auto rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center">
          <AlertCircle className="w-7 h-7" />
        </div>
        <div>
          <h1 className="text-lg font-black text-slate-900">
            {isLocked ? "Tài khoản đã bị tạm khoá" : "Tài khoản chưa thể truy cập"}
          </h1>
          <p className="text-xs text-slate-500 mt-2 leading-relaxed">
            Xin chào {userName}, {isLocked
              ? "tài khoản của cô hiện đang bị quản trị viên tạm khoá."
              : "tài khoản của cô hiện chưa thể vào hệ thống."}{" "}
            Vui lòng liên hệ hỗ trợ qua Zalo bên dưới để được xử lý nhanh nhất.
          </p>
        </div>

        <a
          href="https://zalo.me/0899442256"
          target="_blank"
          rel="noopener noreferrer"
          className="w-full flex items-center justify-center gap-2 bg-sky-50 hover:bg-sky-100 text-sky-700 text-sm font-bold py-2.5 rounded-xl border border-sky-200 transition-colors"
        >
          <MessageCircle className="w-4 h-4" />
          Nhắn Zalo 0899442256
        </a>

        <button
          onClick={handleLogout}
          className="w-full flex items-center justify-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-600 text-sm font-bold py-2.5 rounded-xl transition-colors"
        >
          <LogOut className="w-4 h-4" />
          Đăng xuất
        </button>
      </div>
    </div>
  );
}
