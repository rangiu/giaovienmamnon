"use client";

import React, { useEffect, useRef } from "react";

interface AutoGrowTextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  /** Số dòng tối thiểu lúc chưa gõ gì — giữ vai trò như `rows` cũ. */
  minRows?: number;
}

/**
 * Ô nhập tự cao dần theo nội dung gõ vào — thay cho `<textarea rows={N}>`
 * cố định chiều cao trước đây. Trên điện thoại, ô cố định khiến chữ gõ dài
 * hơn vài dòng bị khuất bên trong khung nhỏ (phải cuộn trong 1 ô bé, dễ
 * tưởng nhầm là chữ bị mất/che khuất) — giờ ô tự phình ra đúng bằng nội
 * dung, cô luôn nhìn thấy toàn bộ những gì đã gõ.
 */
export const AutoGrowTextarea = React.forwardRef<HTMLTextAreaElement, AutoGrowTextareaProps>(
  ({ minRows = 3, className = "", onInput, value, style, ...props }, forwardedRef) => {
    const innerRef = useRef<HTMLTextAreaElement | null>(null);

    const resize = (el: HTMLTextAreaElement | null) => {
      if (!el) return;
      el.style.height = "auto";
      el.style.height = `${el.scrollHeight}px`;
    };

    // Tự chỉnh cao lại khi giá trị đổi từ BÊN NGOÀI (VD: form load dữ liệu
    // có sẵn để sửa, hoặc bị reset) — không chỉ khi tự gõ.
    useEffect(() => {
      resize(innerRef.current);
    }, [value]);

    return (
      <textarea
        ref={(node) => {
          innerRef.current = node;
          if (typeof forwardedRef === "function") forwardedRef(node);
          else if (forwardedRef) (forwardedRef as React.MutableRefObject<HTMLTextAreaElement | null>).current = node;
        }}
        rows={minRows}
        value={value}
        onInput={(e) => {
          resize(e.currentTarget);
          onInput?.(e);
        }}
        className={`resize-none overflow-hidden ${className}`}
        style={{ minHeight: 0, ...style }}
        {...props}
      />
    );
  }
);
AutoGrowTextarea.displayName = "AutoGrowTextarea";
