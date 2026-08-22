"use client";

import React, { createContext, useContext, useEffect, useRef, useState } from "react";
import { AuthModal, AuthMode } from "./AuthModal";

interface AuthGateContextValue {
  openLogin: () => void;
  openSignup: () => void;
}

const AuthGateContext = createContext<AuthGateContextValue | null>(null);

/** Bấm nút "Đăng nhập"/"Đăng ký" ở đâu trong app cũng gọi được qua hook này. */
export function useAuthGate() {
  const ctx = useContext(AuthGateContext);
  if (!ctx) throw new Error("useAuthGate phải dùng trong AuthGateProvider");
  return ctx;
}

/**
 * Cho phép khách (chưa đăng nhập) xem được mọi trang thay vì bị đá thẳng
 * về /login. Component này gắn 1 lần ở root layout, làm 2 việc:
 *
 * 1. Cung cấp context openLogin()/openSignup() để bất kỳ nút nào (Navbar,
 *    Sidebar...) cũng gọi mở popup được.
 * 2. Tự động "vá" window.fetch — bất kỳ request nào trong app trả về 401
 *    với code "UNAUTHENTICATED" (tức route đó cần đăng nhập) sẽ tự bật
 *    popup đăng nhập lên, KHÔNG cần sửa từng nút bấm/từng trang riêng lẻ.
 *    Đây chính là cách "mọi tính năng chỉ cho xem, dùng thì hiện popup"
 *    hoạt động đồng loạt trên toàn bộ app.
 */
export function AuthGateProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<AuthMode>("login");
  const lastPromptRef = useRef(0);

  useEffect(() => {
    const originalFetch = window.fetch.bind(window);

    window.fetch = async (...args: Parameters<typeof fetch>) => {
      const res = await originalFetch(...args);

      // Chỉ tự bật popup cho hành động THAO TÁC thật (POST/PUT/DELETE...) —
      // các fetch GET nền (tự tải dữ liệu lúc vào trang) bị 401 thì để
      // trang tự hiển thị rỗng bình thường, đúng kiểu "khách xem được, chỉ
      // dùng mới cần đăng nhập" thay vì che popup ngay khi vừa vào trang.
      const method = (args[1]?.method || "GET").toUpperCase();
      const isMutation = method !== "GET" && method !== "HEAD";

      if (res.status === 401 && isMutation) {
        try {
          const cloned = res.clone();
          const data = await cloned.json();
          if (data?.code === "UNAUTHENTICATED") {
            // Chống bật popup dồn dập khi bấm liên tiếp nhiều thao tác.
            const now = Date.now();
            if (now - lastPromptRef.current > 300) {
              lastPromptRef.current = now;
              setMode("login");
              setOpen(true);
            }
          }
        } catch {
          // Body không phải JSON — bỏ qua, không phải trường hợp cần popup.
        }
      }

      return res;
    };

    return () => {
      window.fetch = originalFetch;
    };
  }, []);

  const handleSuccess = () => {
    setOpen(false);
    // Tải lại để mọi component tự fetch lại dữ liệu đúng theo tài khoản
    // vừa đăng nhập/đăng ký — đơn giản và chắc chắn hơn là tự replay từng
    // request lẻ đã bị 401 trước đó.
    window.location.reload();
  };

  return (
    <AuthGateContext.Provider
      value={{
        openLogin: () => {
          setMode("login");
          setOpen(true);
        },
        openSignup: () => {
          setMode("signup");
          setOpen(true);
        },
      }}
    >
      {children}
      <AuthModal
        open={open}
        mode={mode}
        onModeChange={setMode}
        onClose={() => setOpen(false)}
        onSuccess={handleSuccess}
      />
    </AuthGateContext.Provider>
  );
}
