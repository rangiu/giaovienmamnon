"use client";

import React, { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { useAuthGate } from "@/components/auth/AuthGateProvider";

/**
 * /signup không còn là trang form riêng — chỉ mở popup đăng ký (dùng chung
 * AuthModal ở root layout) rồi đưa về trang chủ, để các link/bookmark cũ
 * trỏ tới /signup vẫn hoạt động đúng ý.
 */
export default function SignupPage() {
  const router = useRouter();
  const { openSignup } = useAuthGate();

  useEffect(() => {
    openSignup();
    router.replace("/");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-emerald-50 via-white to-amber-50">
      <Loader2 className="w-8 h-8 text-emerald-600 animate-spin" />
    </div>
  );
}
