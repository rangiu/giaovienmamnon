"use client";

import React, { useEffect, useState } from "react";
import { X, Megaphone } from "lucide-react";

interface BannerConfig {
  enabled: boolean;
  message: string;
  link: string | null;
  style: "info" | "urgent" | "promo";
}

const STYLE_CLASSES: Record<BannerConfig["style"], string> = {
  info: "bg-sky-600 text-white",
  urgent: "bg-rose-600 text-white",
  promo: "bg-gradient-to-r from-amber-500 to-orange-500 text-white",
};

const DISMISS_KEY_PREFIX = "sumflow_banner_dismissed_";

/**
 * Banner chạy ngang đầu trang cho tin khẩn (VD: khuyến mãi Tết) — admin cấu
 * hình bật/tắt + nội dung. Hiện cho MỌI người kể cả khách chưa đăng nhập
 * (đặt ở root layout, không phải trong (app) layout). Cô có thể tắt tạm —
 * nhớ theo TỪNG NỘI DUNG cụ thể (hash message) NHƯNG chỉ trong phiên trình
 * duyệt hiện tại (sessionStorage, không phải localStorage) — trước đây dùng
 * localStorage khiến chỉ cần bấm tắt 1 LẦN DUY NHẤT là banner biến mất VĨNH
 * VIỄN trên máy đó dù admin bật lại cấu hình, y hệt như "banner không hoạt
 * động". Đóng tab/mở lại thì banner hiện lại bình thường, phù hợp hơn với
 * tin có tính thời hạn (khuyến mãi) thay vì mất hẳn chỉ vì 1 lần bấm tắt.
 */
export function AnnouncementBanner() {
  const [banner, setBanner] = useState<BannerConfig | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    fetch("/api/banner")
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.banner?.enabled) {
          setBanner(data.banner);
          const key = DISMISS_KEY_PREFIX + data.banner.message.length + "_" + data.banner.message.slice(0, 20);
          setDismissed(sessionStorage.getItem(key) === "1");
        }
      })
      .catch(() => {});
  }, []);

  if (!banner || !banner.enabled || dismissed) return null;

  const handleDismiss = () => {
    const key = DISMISS_KEY_PREFIX + banner.message.length + "_" + banner.message.slice(0, 20);
    sessionStorage.setItem(key, "1");
    setDismissed(true);
  };

  // Lặp lại chính lời nhắn NHIỀU LẦN trong 1 "content" (không phải chỉ 1
  // lần) — bug thật đã gặp: kỹ thuật marquee chuẩn (2 bản sao + translateX
  // -50%) chỉ chạy đúng/mượt khi 1 bản sao ĐÃ rộng hơn hẳn khung banner —
  // với thông báo NGẮN, 1 bản sao lại hẹp hơn khung banner rất nhiều, nên
  // toàn bộ chuyển động co cụm lại ở góc trái (dải nội dung ngắn trượt nhẹ
  // trong đúng phần hẹp đó) thay vì chạy trọn 1 vòng ngang hết chiều rộng
  // banner. Lặp lại 6 lần đảm bảo 1 bản sao luôn đủ rộng bất kể thông báo
  // ngắn/dài, mà vẫn giữ nguyên đúng 2 bản sao + -50% (kỹ thuật loop mượt
  // không đổi).
  const repeatedMessage = Array.from({ length: 6 }, () => banner.message).join("   •   ");
  const content = (
    <span className="inline-flex items-center gap-2 px-6">
      <Megaphone className="w-3.5 h-3.5 shrink-0" />
      {repeatedMessage}
    </span>
  );

  return (
    <div className={`relative overflow-hidden ${STYLE_CLASSES[banner.style]}`}>
      <div className="flex items-center">
        <div className="flex-1 overflow-hidden py-2">
          {/* "w-max": BẮT BUỘC để chiều rộng dải marquee tính theo ĐÚNG nội
              dung bên trong (2 bản sao) thay vì bị co theo khung chứa —
              nếu không có, translateX(-50%) tính sai theo chiều rộng khung
              (không phải chiều rộng nội dung thật), y hệt nguyên nhân bug
              "chỉ chạy góc trái" đã gặp. */}
          <div className="flex w-max whitespace-nowrap animate-marquee text-xs font-bold">
            {banner.link ? (
              <>
                <a href={banner.link} className="hover:underline">{content}</a>
                <a href={banner.link} className="hover:underline" aria-hidden="true">{content}</a>
              </>
            ) : (
              <>
                {content}
                <span aria-hidden="true">{content}</span>
              </>
            )}
          </div>
        </div>
        <button
          onClick={handleDismiss}
          aria-label="Đóng thông báo"
          className="shrink-0 px-3 py-2 hover:bg-black/10 transition-colors"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
