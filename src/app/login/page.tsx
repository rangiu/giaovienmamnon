"use client";

import React, { Suspense, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { useAuthGate } from "@/components/auth/AuthGateProvider";

/**
 * /login không còn là trang form riêng — chỉ mở popup đăng nhập (dùng
 * chung AuthModal ở root layout) rồi đưa về trang chủ, để các link/bookmark
 * cũ trỏ tới /login vẫn hoạt động đúng ý.
 */
function LoginRedirect() {
  const router = useRouter();
  const { openLogin } = useAuthGate();

  useEffect(() => {
    openLogin();
    router.replace("/");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-emerald-50 via-white to-amber-50">
      <Loader2 className="w-8 h-8 text-emerald-600 animate-spin" />
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginRedirect />
    </Suspense>
  );
}
