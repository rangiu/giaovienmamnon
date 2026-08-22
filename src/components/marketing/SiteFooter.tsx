import { MessageCircle, Facebook } from "lucide-react";
import { NAV_TABS, ZALO_URL, FACEBOOK_URL } from "./SiteNav";

/**
 * Footer CHUNG cho mọi trang công khai — xem SiteHeader.tsx cho lý do tách
 * riêng. id="lien-he" chỉ có tác dụng làm điểm neo cuộn khi đang đứng trên
 * chính /gioi-thieu (nơi NAV_TABS trỏ tới); render trên /blog vẫn hợp lệ,
 * chỉ đơn giản không phải đích của link nào trên chính trang đó.
 */
export function SiteFooter() {
  return (
    <footer id="lien-he" className="border-t border-slate-100 scroll-mt-28 bg-slate-50">
      <div className="max-w-6xl mx-auto px-5 pt-12 pb-8 text-center">
        <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">Liên hệ hỗ trợ</h2>
        <p className="mt-3 text-sm text-slate-500 max-w-lg mx-auto">
          Cô cần hỗ trợ, tư vấn gói dùng hoặc góp ý cho SUMFLOW? Nhắn trực tiếp cho đội ngũ qua Zalo hoặc Facebook —
          phản hồi trong ngày.
        </p>
        <div className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-3">
          <a
            href={ZALO_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-2 bg-sky-500 hover:bg-sky-600 text-white text-sm font-bold py-3 px-6 rounded-2xl shadow-sm transition-colors w-full sm:w-auto"
          >
            <MessageCircle className="w-4 h-4" />
            Nhắn Zalo: 0899 442 256
          </a>
          <a
            href={FACEBOOK_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold py-3 px-6 rounded-2xl shadow-sm transition-colors w-full sm:w-auto"
          >
            <Facebook className="w-4 h-4" />
            Nhắn Facebook
          </a>
        </div>
      </div>

      <div className="border-t border-slate-200">
        <div className="max-w-6xl mx-auto px-5 py-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo.png" alt="SUMFLOW" className="w-6 h-6 object-contain" />
            <span className="font-bold text-sm text-slate-700">SUMFLOW</span>
            <span className="text-xs text-slate-400">© {new Date().getFullYear()}</span>
          </div>
          <nav className="flex items-center gap-4 flex-wrap justify-center">
            {NAV_TABS.map((tab) => (
              <a key={tab.href} href={tab.href} className="text-xs font-semibold text-slate-500 hover:text-emerald-700 transition-colors">
                {tab.label}
              </a>
            ))}
          </nav>
        </div>
      </div>
    </footer>
  );
}
