import Link from "next/link";
import { NAV_TABS } from "./SiteNav";

/**
 * Header CHUNG cho mọi trang công khai (gioi-thieu, blog, blog/[slug]) — dính
 * cố định trên đầu khi cuộn, kèm thanh tab điều hướng luôn hiện sẵn. Trước
 * đây blog tự dựng 1 header rút gọn riêng (chỉ logo + nút, không có thanh
 * tab) khiến trang blog trông như "app khác" — giờ dùng lại NGUYÊN VẸN 1
 * component này ở mọi nơi để định dạng luôn nhất quán.
 */
export function SiteHeader() {
  return (
    <header className="sticky top-0 z-30 bg-white border-b border-emerald-100 shadow-sm">
      <div className="max-w-6xl mx-auto px-5 py-4 flex items-center justify-between">
        <Link href="/gioi-thieu" className="flex items-center gap-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.png" alt="SUMFLOW" className="w-8 h-8 object-contain" />
          <span className="font-black text-lg text-emerald-950">SUMFLOW</span>
        </Link>
        <div className="flex items-center gap-2">
          <Link
            href="/chat"
            className="text-xs sm:text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-700 px-4 py-2 rounded-xl shadow-sm transition-colors"
          >
            Trải nghiệm ngay
          </Link>
        </div>
      </div>

      {/* Thanh tab điều hướng theo mục — cuộn ngang được trên di động */}
      <nav className="border-t border-emerald-50 bg-white/80">
        <div className="max-w-6xl mx-auto px-5 flex items-center gap-1 overflow-x-auto no-scrollbar">
          {NAV_TABS.map((tab) => (
            <a
              key={tab.href}
              href={tab.href}
              className="shrink-0 text-xs sm:text-sm font-bold text-slate-600 hover:text-emerald-700 hover:bg-emerald-50 px-3.5 py-2.5 rounded-lg transition-colors"
            >
              {tab.label}
            </a>
          ))}
        </div>
      </nav>
    </header>
  );
}
