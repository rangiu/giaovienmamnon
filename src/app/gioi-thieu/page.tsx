import type { Metadata } from "next";
import Link from "next/link";
import {
  Bot,
  BookOpen,
  Users,
  ClipboardCheck,
  Wand2,
  MessageCircle,
  Check,
  ArrowRight,
  Sparkles,
  ShieldCheck,
  Smartphone,
  Clock,
  Heart,
  GraduationCap,
  Clapperboard,
  Newspaper,
} from "lucide-react";
import { getAllPlanPricesVnd, getOfflinePriceVnd, getFreeChatLimitPerDay } from "@/lib/settings";
import { getLatestBlogPosts } from "@/lib/blog";
import { SiteHeader } from "@/components/marketing/SiteHeader";
import { SiteFooter } from "@/components/marketing/SiteFooter";
import { FACEBOOK_URL } from "@/components/marketing/SiteNav";

// Trang giới thiệu tĩnh, tách riêng khỏi Dashboard động ở "/" — tối ưu cho
// SEO/quảng cáo (tiêu đề & mô tả riêng, tải nhanh, không cần đăng nhập).
// Giá gói lấy trực tiếp từ cấu hình admin thật (KHÔNG bịa số liệu). Bắt
// buộc "force-dynamic" (không prerender lúc build) — giống mọi route khác
// đọc DB trong app này — vì máy build cục bộ không có kết nối DB, còn trên
// VPS thì luôn fetch mới mỗi request nên giá luôn khớp với admin cập nhật.
export const dynamic = "force-dynamic";

// Đổi domain chính từ coai.sumflow.online sang sumflow.online (root) — sau
// khi cô chuyển route Cloudflare Tunnel, sumflow.online mới là domain thật
// nhận traffic/ranking Google, canonical/OG/JSON-LD phải khớp domain đó.
const SITE_URL = "https://sumflow.online";

export const metadata: Metadata = {
  title: "SUMFLOW - Trợ lý AI cho Giáo viên Mầm non Việt Nam",
  description:
    "SUMFLOW giúp giáo viên mầm non soạn giáo án bằng AI, tạo video hoạt hình AI cho trẻ, quản lý lớp học, viết nhận xét trẻ và tin nhắn phụ huynh chỉ trong vài giây. Dùng thử miễn phí ngay hôm nay.",
  keywords: [
    "trợ lý AI mầm non",
    "trợ lý mầm non",
    "trợ lý AI soạn giáo án",
    "soạn giáo án mầm non",
    "AI cho giáo viên mầm non",
    "phần mềm quản lý lớp mầm non",
    "trợ lý AI giáo viên",
    "sổ đánh giá trẻ mầm non",
    "video hoạt hình AI cho trẻ mầm non",
    "tạo video AI mầm non",
    "SUMFLOW",
  ],
  alternates: { canonical: `${SITE_URL}/gioi-thieu` },
  openGraph: {
    title: "SUMFLOW - Trợ lý AI cho Giáo viên Mầm non Việt Nam",
    description:
      "Soạn giáo án, tạo video hoạt hình AI, viết nhận xét trẻ, quản lý lớp học và đánh giá sự phát triển của trẻ — tất cả trong 1 trợ lý AI dành riêng cho giáo viên mầm non Việt Nam.",
    url: `${SITE_URL}/gioi-thieu`,
    siteName: "SUMFLOW",
    locale: "vi_VN",
    type: "website",
    images: [{ url: `${SITE_URL}/logo.png`, width: 512, height: 512, alt: "SUMFLOW" }],
  },
  twitter: {
    card: "summary",
    title: "SUMFLOW - Trợ lý AI cho Giáo viên Mầm non Việt Nam",
    description: "Soạn giáo án, tạo video AI, quản lý lớp học và đánh giá trẻ bằng AI — dành riêng cho giáo viên mầm non Việt Nam.",
    images: [`${SITE_URL}/logo.png`],
  },
};

const FEATURES = [
  {
    icon: Bot,
    title: "SUMFLOW Assistant",
    desc: "Trò chuyện trực tiếp với AI để hỏi đáp chuyên môn, xin gợi ý hoạt động, trò chơi hay cách xử lý tình huống lớp học — như có thêm 1 đồng nghiệp luôn sẵn sàng.",
  },
  {
    icon: BookOpen,
    title: "Kho Giáo án AI",
    desc: "Chỉ cần nhập chủ đề, độ tuổi và thời lượng — AI soạn ngay 1 giáo án đầy đủ mục tiêu, chuẩn bị, tiến trình hoạt động, trò chơi củng cố. Lưu kho, chỉnh sửa và xuất PDF A4 dễ dàng.",
  },
  {
    icon: Users,
    title: "Quản lý Lớp học",
    desc: "Quản lý danh sách học sinh, ghi chú quan sát hằng ngày, theo dõi từng bé một cách có hệ thống — mở miễn phí cho mọi tài khoản.",
  },
  {
    icon: ClipboardCheck,
    title: "Sổ đánh giá sau chủ đề",
    desc: "Chấm và tổng hợp kết quả đánh giá trẻ theo từng chủ đề, AI tự phân tích điểm mạnh/điểm cần hỗ trợ của cả lớp và từng bé dựa trên minh chứng quan sát thật — mở miễn phí cho mọi tài khoản.",
  },
  {
    icon: Wand2,
    title: "Công cụ AI Nhanh",
    desc: "Viết nhận xét trẻ, soạn tin nhắn gửi phụ huynh, tạo prompt ảnh/video học liệu — chỉ trong vài giây, văn phong ấm áp đúng chất giáo viên mầm non.",
  },
  {
    icon: Clapperboard,
    title: "Video Studio — Video hoạt hình AI",
    desc: "Chỉ cần nhập ý tưởng và chọn thời lượng — AI tự viết kịch bản, vẽ tranh minh hoạ giữ đồng nhất nhân vật xuyên suốt và dựng thành video hoạt hình có giọng đọc, sẵn sàng chiếu cho trẻ xem ngay trên lớp.",
  },
];

// Nội dung Q&A THẬT, hữu ích cho người đọc — đồng thời phủ tự nhiên nhiều
// biến thể từ khoá dài (trợ lý AI mầm non, trợ lý AI soạn giáo án, video AI
// mầm non...) mà không nhồi từ khoá lộ liễu.
const FAQS = [
  {
    q: "SUMFLOW là gì?",
    a: "SUMFLOW là trợ lý AI mầm non — hỗ trợ giáo viên mầm non Việt Nam soạn giáo án, tạo video hoạt hình AI cho trẻ, quản lý lớp học, viết nhận xét trẻ và đánh giá sự phát triển, tất cả trong 1 nơi duy nhất.",
  },
  {
    q: "Trợ lý AI soạn giáo án mầm non hoạt động thế nào?",
    a: "Cô chỉ cần nhập chủ đề, độ tuổi và thời lượng bằng tiếng Việt tự nhiên — AI soạn ngay 1 giáo án đầy đủ mục tiêu, chuẩn bị, tiến trình hoạt động và trò chơi củng cố, đúng chuẩn chương trình giáo dục mầm non Việt Nam. Cô luôn là người chỉnh sửa và quyết định cuối cùng.",
  },
  {
    q: "SUMFLOW có tạo được video hoạt hình AI cho trẻ mầm non không?",
    a: "Có — tính năng Video Studio: cô nhập ý tưởng và chọn thời lượng, AI tự viết kịch bản, vẽ tranh minh hoạ giữ đồng nhất nhân vật xuyên suốt và dựng thành video hoạt hình có giọng đọc, sẵn sàng chiếu cho trẻ xem ngay trên lớp.",
  },
  {
    q: "Dùng thử SUMFLOW có mất phí không?",
    a: "Không — tạo tài khoản miễn phí trong 30 giây, dùng ngay Chat AI cơ bản, Quản lý lớp học và Sổ đánh giá sau chủ đề không giới hạn. Nâng cấp gói khi cần dùng đầy đủ tính năng Soạn giáo án AI, viết nhận xét trẻ và Video Studio.",
  },
  {
    q: "SUMFLOW có khó dùng với giáo viên ít rành công nghệ không?",
    a: "Không — SUMFLOW thiết kế tối giản, 100% tiếng Việt, không cần cài đặt, dùng thành thạo chỉ sau vài phút ngay trên điện thoại.",
  },
  {
    q: "Dữ liệu lớp học và học sinh có được bảo mật không?",
    a: "Có — dữ liệu của mỗi tài khoản giáo viên tách biệt hoàn toàn, không chia sẻ giữa các trường/giáo viên khác.",
  },
];

const BENEFITS = [
  "Tiết kiệm hàng giờ soạn giáo án mỗi tuần",
  "Giao diện tiếng Việt đơn giản, dễ dùng cho mọi lứa tuổi giáo viên",
  "Không cần cài đặt — dùng ngay trên điện thoại hoặc máy tính",
  "Dữ liệu trẻ và lớp học được lưu trữ riêng tư, bảo mật",
];

export default async function GioiThieuPage() {
  const [plans, offlinePriceVnd, freeChatLimit, latestPosts] = await Promise.all([
    getAllPlanPricesVnd(),
    getOfflinePriceVnd(),
    getFreeChatLimitPerDay(),
    getLatestBlogPosts(3),
  ]);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "SUMFLOW",
    applicationCategory: "EducationalApplication",
    operatingSystem: "Web",
    description:
      "Trợ lý AI hỗ trợ giáo viên mầm non Việt Nam soạn giáo án, tạo video hoạt hình AI, quản lý lớp học, viết nhận xét trẻ và đánh giá sự phát triển của trẻ.",
    url: `${SITE_URL}/gioi-thieu`,
    image: `${SITE_URL}/logo.png`,
    sameAs: [FACEBOOK_URL],
    offers: plans.map((p) => ({
      "@type": "Offer",
      name: `Gói ${p.label}`,
      price: p.priceVnd,
      priceCurrency: "VND",
    })),
  };

  // Schema riêng cho khối FAQ — cho phép Google hiện trực tiếp câu hỏi/trả
  // lời ngay trên trang kết quả tìm kiếm (rich result), không phải chỉ
  // trang trí cho đẹp.
  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: FAQS.map((faq) => ({
      "@type": "Question",
      name: faq.q,
      acceptedAnswer: { "@type": "Answer", text: faq.a },
    })),
  };

  return (
    <div className="min-h-screen bg-white">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />

      <SiteHeader />

      {/* Hero */}
      <section id="trang-chu" className="bg-gradient-to-br from-emerald-50 via-white to-amber-50 scroll-mt-12 overflow-hidden">
        <div className="max-w-6xl mx-auto px-5 py-14 sm:py-20 grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <div className="text-center lg:text-left">
            <span className="inline-flex items-center gap-1.5 text-[11px] sm:text-xs font-bold text-emerald-800 bg-emerald-100 px-3 py-1.5 rounded-full border border-emerald-200 mb-5">
              <Sparkles className="w-3.5 h-3.5" />
              Trợ lý AI dành riêng cho Giáo viên Mầm non Việt Nam
            </span>
            {/* H1 PHẢI chứa cụm từ khoá chính ("trợ lý AI", "mầm non", "soạn
                giáo án") — bản cũ chỉ có ở đoạn mô tả phụ, KHÔNG có trong H1
                (thẻ nặng ký nhất trang cho SEO), sửa lại cho đúng. */}
            <h1 className="text-3xl sm:text-5xl font-black text-slate-900 tracking-tight leading-tight">
              Trợ lý AI mầm non{" "}
              <span className="text-emerald-600">soạn giáo án nhanh gấp nhiều lần</span>
            </h1>
            <p className="mt-5 text-sm sm:text-base text-slate-600 max-w-xl mx-auto lg:mx-0 leading-relaxed">
              SUMFLOW là trợ lý AI giúp cô giáo mầm non soạn giáo án, viết nhận xét trẻ, tin nhắn phụ huynh và đánh
              giá sự phát triển của trẻ — chỉ trong vài giây, ngay trên điện thoại.
            </p>
            <div className="mt-8 flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-3">
              <Link
                href="/chat"
                className="inline-flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm py-3.5 px-7 rounded-2xl shadow-lg shadow-emerald-200 transition-all w-full sm:w-auto"
              >
                Trải nghiệm ngay
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
            <p className="mt-4 text-[11px] sm:text-xs text-slate-400">
              Vào dùng thử ngay — không cần tạo tài khoản trước.
            </p>
          </div>

          {/* Minh hoạ hội thoại AI — dựng bằng CSS/icon thật (không phải ảnh
              chụp), luôn nét trên mọi kích thước màn hình, không lo vỡ ảnh. */}
          <div className="relative hidden lg:block">
            <div className="absolute -top-6 -right-6 w-40 h-40 bg-amber-200/50 rounded-full blur-3xl" />
            <div className="absolute -bottom-8 -left-8 w-48 h-48 bg-emerald-200/50 rounded-full blur-3xl" />
            <div className="relative bg-white rounded-3xl shadow-2xl border border-emerald-100 overflow-hidden">
              <div className="flex items-center gap-2 px-4 py-3 border-b border-slate-100 bg-slate-50">
                <div className="w-7 h-7 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0">
                  <Bot className="w-4 h-4" />
                </div>
                <span className="text-xs font-extrabold text-slate-700">SUMFLOW Assistant</span>
                <span className="ml-auto w-2 h-2 rounded-full bg-emerald-500" />
              </div>
              <div className="p-4 space-y-3">
                <div className="flex justify-end">
                  <div className="bg-emerald-600 text-white text-xs rounded-2xl rounded-tr-sm px-3.5 py-2.5 max-w-[85%]">
                    Soạn giáo án chủ đề "Con vật trong rừng" cho lớp 4–5 tuổi
                  </div>
                </div>
                <div className="flex justify-start">
                  <div className="bg-slate-50 border border-slate-100 text-slate-700 text-xs rounded-2xl rounded-tl-sm px-3.5 py-2.5 max-w-[90%] space-y-1.5">
                    <p className="font-bold text-emerald-700">Dạ cô, em soạn xong rồi ạ! ✅</p>
                    <p className="flex items-center gap-1.5"><Check className="w-3 h-3 text-emerald-600 shrink-0" /> Mục tiêu & chuẩn bị đồ dùng</p>
                    <p className="flex items-center gap-1.5"><Check className="w-3 h-3 text-emerald-600 shrink-0" /> Hoạt động của cô & của trẻ</p>
                    <p className="flex items-center gap-1.5"><Check className="w-3 h-3 text-emerald-600 shrink-0" /> Trò chơi củng cố</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Benefits strip */}
      <section className="border-y border-emerald-100 bg-emerald-50/40">
        <div className="max-w-6xl mx-auto px-5 py-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {BENEFITS.map((b) => (
            <div key={b} className="flex items-start gap-2 text-xs sm:text-sm text-slate-700 font-medium">
              <Check className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <span>{b}</span>
            </div>
          ))}
        </div>
      </section>

      {/* Giới thiệu (About) */}
      <section id="gioi-thieu" className="max-w-6xl mx-auto px-5 py-16 sm:py-20 scroll-mt-28">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-10 items-center">
          <div>
            <span className="inline-flex items-center gap-1.5 text-[11px] font-bold text-emerald-800 bg-emerald-100 px-3 py-1.5 rounded-full border border-emerald-200 mb-4">
              <Heart className="w-3.5 h-3.5" />
              Vì sao có SUMFLOW
            </span>
            <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
              Giáo viên mầm non xứng đáng có nhiều thời gian hơn cho trẻ
            </h2>
            <div className="mt-4 space-y-3 text-sm text-slate-600 leading-relaxed">
              <p>
                Mỗi ngày, cô giáo mầm non không chỉ dạy học mà còn phải soạn giáo án, ghi nhận xét từng trẻ, viết
                tin nhắn cho phụ huynh và tổng hợp đánh giá sau mỗi chủ đề — những công việc giấy tờ chiếm rất
                nhiều thời gian lẽ ra nên dành cho các bé.
              </p>
              <p>
                <strong className="text-slate-800">SUMFLOW</strong> ra đời để giải quyết đúng bài toán đó: một trợ
                lý AI nói tiếng Việt, hiểu chương trình giáo dục mầm non Việt Nam, giúp cô rút ngắn phần lớn thời
                gian soạn thảo — trong khi cô vẫn luôn là người quyết định cuối cùng, AI chỉ hỗ trợ chứ không thay
                thế chuyên môn của cô.
              </p>
              <p>
                Chúng tôi thiết kế SUMFLOW tối giản hết mức có thể, để dù cô ít quen công nghệ cũng có thể dùng
                thành thạo chỉ sau vài phút — không cần cài đặt, không cần hướng dẫn phức tạp.
              </p>
            </div>
            <div className="mt-6 flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
                <GraduationCap className="w-5 h-5" />
              </div>
              <p className="text-xs text-slate-500">
                Phù hợp cho giáo viên mầm non thuộc mọi độ tuổi lớp — Nhà trẻ đến Mẫu giáo lớn (2–6 tuổi).
              </p>
            </div>
          </div>
          {/* Thẻ minh hoạ dựng bằng icon thật thay vì ảnh chụp — luôn nét dù
              màn hình lớn nhỏ, không phụ thuộc chất lượng ảnh nguồn. */}
          <div className="relative bg-gradient-to-br from-emerald-500 to-teal-600 rounded-3xl shadow-xl p-8 sm:p-10 text-white overflow-hidden">
            <div className="absolute -top-10 -right-10 w-40 h-40 bg-white/10 rounded-full" />
            <div className="absolute -bottom-14 -left-10 w-48 h-48 bg-white/10 rounded-full" />
            <div className="relative">
              <div className="w-14 h-14 rounded-2xl bg-white flex items-center justify-center shadow-lg mb-5">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/logo.png" alt="SUMFLOW" className="w-9 h-9 object-contain" />
              </div>
              <p className="text-lg font-black leading-snug">
                "Để mỗi giờ soạn bài của cô, đổi lấy thêm một giờ ở bên các con."
              </p>
              <div className="mt-7 space-y-3">
                {[
                  { icon: MessageCircle, text: "100% tiếng Việt, văn phong gần gũi mầm non" },
                  { icon: ShieldCheck, text: "Dữ liệu riêng tư — tách biệt theo từng tài khoản" },
                  { icon: Smartphone, text: "Không cần cài đặt, dùng ngay trên điện thoại" },
                ].map((item) => {
                  const Icon = item.icon;
                  return (
                    <div key={item.text} className="flex items-center gap-3 bg-white/10 rounded-2xl px-4 py-3">
                      <Icon className="w-4 h-4 shrink-0" />
                      <span className="text-xs font-semibold">{item.text}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="tinh-nang" className="max-w-6xl mx-auto px-5 py-16 sm:py-20 scroll-mt-28">
        <div className="text-center max-w-2xl mx-auto mb-12">
          <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
            Mọi công cụ cô cần, trong một nơi
          </h2>
          <p className="mt-3 text-sm text-slate-500">
            Được thiết kế riêng cho công việc hằng ngày của giáo viên mầm non Việt Nam.
          </p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {FEATURES.map((f) => {
            const Icon = f.icon;
            return (
              <div
                key={f.title}
                className="bg-white p-6 rounded-3xl border border-emerald-100 shadow-sm hover:shadow-md transition-shadow"
              >
                <div className="w-11 h-11 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center mb-4">
                  <Icon className="w-5 h-5" />
                </div>
                <h3 className="font-extrabold text-slate-900 text-sm mb-1.5">{f.title}</h3>
                <p className="text-xs text-slate-500 leading-relaxed">{f.desc}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* Anywhere / responsive */}
      <section className="bg-slate-900 text-white">
        <div className="max-w-6xl mx-auto px-5 py-16 sm:py-20">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <h2 className="text-2xl sm:text-3xl font-black tracking-tight">Nhẹ nhàng, an tâm, ở bất cứ đâu</h2>
            <p className="mt-3 text-sm text-slate-400">Những gì cô cần ở một công cụ hằng ngày — không hơn, không kém.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-center md:text-left">
            {[
              { icon: Smartphone, title: "Dùng mọi lúc mọi nơi", desc: "Hoạt động mượt trên điện thoại, máy tính bảng và máy tính — không cần cài đặt gì thêm." },
              { icon: Clock, title: "Tiết kiệm thời gian", desc: "Việc soạn thảo tốn hàng giờ giờ chỉ còn vài giây, để cô có thêm thời gian cho các bé." },
              { icon: ShieldCheck, title: "Riêng tư & an toàn", desc: "Dữ liệu lớp học của mỗi tài khoản tách biệt hoàn toàn, không chia sẻ giữa các trường/giáo viên." },
            ].map((item) => {
              const Icon = item.icon;
              return (
                <div key={item.title} className="flex flex-col items-center md:items-start gap-3 bg-white/5 rounded-3xl border border-white/10 p-6">
                  <div className="w-11 h-11 rounded-2xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                    <Icon className="w-5 h-5" />
                  </div>
                  <h3 className="font-extrabold text-sm">{item.title}</h3>
                  <p className="text-xs text-slate-400 leading-relaxed">{item.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="bang-gia" className="max-w-6xl mx-auto px-5 py-16 sm:py-20 scroll-mt-28">
        <div className="text-center max-w-2xl mx-auto mb-12">
          <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">Bảng giá đơn giản</h2>
          <p className="mt-3 text-sm text-slate-500">
            Bắt đầu miễn phí với Chat cơ bản ({freeChatLimit} lượt/ngày), Kho giáo án và Quản lý lớp học luôn mở.
            Nâng cấp khi cần dùng đầy đủ tính năng AI.
          </p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 max-w-3xl mx-auto">
          {plans.map((plan, idx) => (
            <div
              key={plan.code}
              className={`p-6 rounded-3xl border text-center ${
                idx === 1 ? "border-emerald-400 bg-emerald-50 shadow-md relative" : "border-slate-200 bg-white"
              }`}
            >
              {idx === 1 && (
                <span className="inline-block text-[10px] font-black text-emerald-700 bg-emerald-100 px-2.5 py-1 rounded-full mb-2">
                  PHỔ BIẾN NHẤT
                </span>
              )}
              <p className="font-bold text-sm text-slate-700">{plan.label}</p>
              <p className="text-2xl font-black text-slate-900 mt-1">{plan.priceVnd.toLocaleString("vi-VN")}đ</p>
              <p className="text-[11px] text-slate-400 mt-1">{plan.durationDays} ngày sử dụng</p>
              <Link
                href="/signup"
                className={`mt-4 inline-flex items-center justify-center gap-1.5 w-full font-bold text-xs py-2.5 rounded-xl transition-colors ${
                  idx === 1
                    ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                    : "bg-emerald-50 hover:bg-emerald-100 text-emerald-800"
                }`}
              >
                Chọn gói này
              </Link>
            </div>
          ))}
        </div>

        {/* Cả 3 gói trả phí đều bao gồm ĐẦY ĐỦ như nhau, chỉ khác thời hạn —
            liệt kê rõ 1 lần để cô biết chính xác trả phí thì được gì. */}
        <div className="max-w-3xl mx-auto mt-8 bg-slate-50 rounded-3xl border border-slate-200 p-6">
          <p className="text-xs font-black text-slate-700 uppercase tracking-wide mb-3">Cả 3 gói đều bao gồm đầy đủ:</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2">
            {[
              "Chat AI không giới hạn lượt/ngày",
              "Soạn giáo án AI đầy đủ, xuất PDF",
              "AI viết nhận xét trẻ & tin nhắn phụ huynh",
              "Sổ đánh giá sau chủ đề có AI phân tích",
              "Công cụ tạo prompt ảnh/video học liệu",
              "Quản lý lớp học & lưu trữ không giới hạn",
            ].map((item) => (
              <div key={item} className="flex items-center gap-2 text-xs text-slate-600">
                <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span>{item}</span>
              </div>
            ))}
          </div>
        </div>

        <p className="text-center text-xs text-slate-400 mt-8">
          Cần bản cài đặt offline dùng vĩnh viễn trên máy? Giá tham khảo từ{" "}
          <strong className="text-slate-600">{offlinePriceVnd.toLocaleString("vi-VN")}đ</strong> — liên hệ trực
          tiếp qua Zalo/Facebook bên dưới để được tư vấn.
        </p>
      </section>

      {/* FAQ — nội dung dạng câu hỏi/trả lời phủ được nhiều biến thể từ khoá
          dài (VD "trợ lý AI soạn giáo án mầm non là gì") một cách tự nhiên,
          hữu ích thật cho người đọc — không phải nhồi từ khoá — đúng tinh
          thần "viết nội dung chất lượng". Kèm FAQPage schema (JSON-LD) bên
          dưới để Google có thể hiện trực tiếp câu hỏi/trả lời ngay trên
          trang kết quả tìm kiếm (rich result), tăng khả năng được click. */}
      <section className="max-w-3xl mx-auto px-5 py-16 sm:py-20">
        <div className="text-center mb-10">
          <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">Câu hỏi thường gặp</h2>
        </div>
        <div className="space-y-4">
          {FAQS.map((faq) => (
            <div key={faq.q} className="bg-white p-5 rounded-2xl border border-emerald-100">
              <h3 className="font-extrabold text-slate-900 text-sm">{faq.q}</h3>
              <p className="mt-1.5 text-xs text-slate-600 leading-relaxed">{faq.a}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Bài viết mới nhất — chỉ hiện khi đã có bài đăng, không để trống mục
          thừa. Nội dung thật lấy từ DB do admin đăng qua BlogAdminPanel,
          KHÔNG bịa bài mẫu — đúng nguyên tắc không hiển thị dữ liệu giả. */}
      {latestPosts.length > 0 && (
        <section className="bg-emerald-50/40 border-y border-emerald-100">
          <div className="max-w-6xl mx-auto px-5 py-16 sm:py-20">
            <div className="flex items-center justify-between mb-10 flex-wrap gap-3">
              <div>
                <span className="inline-flex items-center gap-1.5 text-[11px] font-bold text-emerald-800 bg-emerald-100 px-3 py-1.5 rounded-full border border-emerald-200 mb-3">
                  <Newspaper className="w-3.5 h-3.5" />
                  Blog SUMFLOW
                </span>
                <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">Bài viết mới nhất</h2>
              </div>
              <Link href="/blog" className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-bold text-emerald-700 hover:underline shrink-0">
                Xem tất cả bài viết
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {latestPosts.map((post) => (
                <Link
                  key={post.id}
                  href={`/blog/${post.slug}`}
                  className="group bg-white rounded-3xl border border-emerald-100 shadow-sm hover:shadow-md transition-shadow overflow-hidden flex flex-col"
                >
                  {post.coverImageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={post.coverImageUrl} alt={post.title} className="w-full h-36 object-cover" />
                  ) : (
                    <div className="w-full h-36 bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src="/logo.png" alt="SUMFLOW" className="w-10 h-10 object-contain opacity-90" />
                    </div>
                  )}
                  <div className="p-5 flex flex-col flex-1">
                    <h3 className="font-extrabold text-slate-900 text-sm leading-snug group-hover:text-emerald-700 transition-colors">
                      {post.title}
                    </h3>
                    {post.excerpt && <p className="mt-2 text-xs text-slate-500 leading-relaxed line-clamp-2">{post.excerpt}</p>}
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* CTA banner */}
      <section className="relative bg-emerald-600 overflow-hidden">
        <div className="absolute -top-12 -right-12 w-64 h-64 bg-white/10 rounded-full" />
        <div className="absolute -bottom-16 -left-16 w-72 h-72 bg-emerald-700/30 rounded-full" />
        <div className="relative max-w-4xl mx-auto px-5 py-14 text-center text-white">
          <div className="w-14 h-14 rounded-2xl bg-white/15 flex items-center justify-center mx-auto mb-5">
            <Sparkles className="w-7 h-7" />
          </div>
          <h2 className="text-2xl sm:text-3xl font-black tracking-tight">Sẵn sàng tiết kiệm thời gian soạn bài?</h2>
          <p className="mt-3 text-sm text-emerald-50">
            Trải nghiệm ngay — soạn giáo án đầu tiên của cô chỉ trong vài giây.
          </p>
          <Link
            href="/chat"
            className="mt-6 inline-flex items-center justify-center gap-2 bg-white hover:bg-emerald-50 text-emerald-700 font-bold text-sm py-3.5 px-7 rounded-2xl shadow-lg transition-all"
          >
            Trải nghiệm ngay
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}
