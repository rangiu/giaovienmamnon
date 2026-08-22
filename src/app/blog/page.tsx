import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Calendar, User } from "lucide-react";
import { getPublishedBlogPosts } from "@/lib/blog";
import { SiteHeader } from "@/components/marketing/SiteHeader";
import { SiteFooter } from "@/components/marketing/SiteFooter";

// Trang danh sách blog — công khai, không cần đăng nhập, giống gioi-thieu
// (force-dynamic vì đọc DB, máy build cục bộ không có kết nối DB). Đây là 1
// PHẦN HIỂN THỊ của trang giới thiệu (không phải app riêng) nên dùng lại
// NGUYÊN VẸN SiteHeader/SiteFooter — cùng định dạng, cùng thanh điều hướng,
// cùng chân trang liên hệ như /gioi-thieu.
export const dynamic = "force-dynamic";

const SITE_URL = "https://sumflow.online";

export const metadata: Metadata = {
  title: "Blog SUMFLOW — Kiến thức & mẹo cho giáo viên mầm non",
  description:
    "Bài viết chia sẻ kinh nghiệm soạn giáo án, chăm sóc và giáo dục trẻ mầm non, mẹo dùng AI hiệu quả — cập nhật thường xuyên từ đội ngũ SUMFLOW.",
  alternates: { canonical: `${SITE_URL}/blog` },
  openGraph: {
    title: "Blog SUMFLOW — Kiến thức & mẹo cho giáo viên mầm non",
    description: "Bài viết chia sẻ kinh nghiệm soạn giáo án, chăm sóc và giáo dục trẻ mầm non từ đội ngũ SUMFLOW.",
    url: `${SITE_URL}/blog`,
    siteName: "SUMFLOW",
    locale: "vi_VN",
    type: "website",
  },
};

function formatDate(d: Date | string | null) {
  if (!d) return "";
  return new Date(d).toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" });
}

export default async function BlogListPage() {
  const posts = await getPublishedBlogPosts();

  return (
    <div className="min-h-screen bg-white">
      <SiteHeader />

      <section className="bg-gradient-to-br from-emerald-50 via-white to-amber-50">
        <div className="max-w-6xl mx-auto px-5 py-12 sm:py-16">
          <h1 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight">Blog SUMFLOW</h1>
          <p className="mt-3 text-sm sm:text-base text-slate-600 max-w-2xl">
            Kinh nghiệm soạn giáo án, chăm sóc — giáo dục trẻ mầm non và mẹo dùng AI hiệu quả, cập nhật từ đội ngũ
            SUMFLOW.
          </p>
        </div>
      </section>

      <section className="max-w-6xl mx-auto px-5 py-12 sm:py-16">
        {posts.length === 0 ? (
          <p className="text-sm text-slate-400 text-center py-16">Chưa có bài viết nào — quay lại sau nhé.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {posts.map((post) => (
              <Link
                key={post.id}
                href={`/blog/${post.slug}`}
                className="group bg-white rounded-3xl border border-emerald-100 shadow-sm hover:shadow-md transition-shadow overflow-hidden flex flex-col"
              >
                {post.coverImageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={post.coverImageUrl} alt={post.title} className="w-full h-40 object-cover" />
                ) : (
                  <div className="w-full h-40 bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src="/logo.png" alt="SUMFLOW" className="w-12 h-12 object-contain opacity-90" />
                  </div>
                )}
                <div className="p-5 flex flex-col flex-1">
                  <h2 className="font-extrabold text-slate-900 text-sm sm:text-base leading-snug group-hover:text-emerald-700 transition-colors">
                    {post.title}
                  </h2>
                  {post.excerpt && <p className="mt-2 text-xs text-slate-500 leading-relaxed line-clamp-3">{post.excerpt}</p>}
                  <div className="mt-4 flex items-center gap-3 text-[11px] text-slate-400 flex-wrap">
                    <span className="flex items-center gap-1"><User className="w-3 h-3" />{post.authorName}</span>
                    <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{formatDate(post.publishedAt)}</span>
                  </div>
                  <span className="mt-3 inline-flex items-center gap-1 text-xs font-bold text-emerald-700">
                    Đọc tiếp
                    <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>

      <SiteFooter />
    </div>
  );
}
