import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowRight, Calendar, User, Sparkles } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getPublishedBlogPostBySlug } from "@/lib/blog";
import { BlogMarkdown } from "@/components/blog/BlogMarkdown";
import { SiteHeader } from "@/components/marketing/SiteHeader";
import { SiteFooter } from "@/components/marketing/SiteFooter";

export const dynamic = "force-dynamic";

const SITE_URL = "https://sumflow.online";

function formatDate(d: Date | string | null) {
  if (!d) return "";
  return new Date(d).toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" });
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const post = await getPublishedBlogPostBySlug(slug);
  if (!post) return { title: "Không tìm thấy bài viết — SUMFLOW" };

  const description = post.excerpt || post.content.slice(0, 160).replace(/[#*_>-]/g, "");
  return {
    title: `${post.title} — Blog SUMFLOW`,
    description,
    alternates: { canonical: `${SITE_URL}/blog/${post.slug}` },
    openGraph: {
      title: post.title,
      description,
      url: `${SITE_URL}/blog/${post.slug}`,
      siteName: "SUMFLOW",
      locale: "vi_VN",
      type: "article",
      publishedTime: post.publishedAt?.toISOString(),
      images: [{ url: post.coverImageUrl || `${SITE_URL}/logo.png` }],
    },
    twitter: {
      card: "summary_large_image",
      title: post.title,
      description,
      images: [post.coverImageUrl || `${SITE_URL}/logo.png`],
    },
  };
}

export default async function BlogDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const post = await getPublishedBlogPostBySlug(slug);
  if (!post) notFound();

  // Tăng lượt xem — fire-and-forget, không chặn render trang, không quan
  // trọng nếu thất bại (chỉ là số liệu tham khảo, không phải dữ liệu giao dịch).
  prisma.blogPost.update({ where: { id: post.id }, data: { viewCount: { increment: 1 } } }).catch(() => {});

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: post.title,
    description: post.excerpt || undefined,
    image: post.coverImageUrl ? [post.coverImageUrl] : [`${SITE_URL}/logo.png`],
    datePublished: post.publishedAt?.toISOString(),
    dateModified: post.updatedAt.toISOString(),
    author: { "@type": "Organization", name: post.authorName },
    publisher: { "@type": "Organization", name: "SUMFLOW", logo: { "@type": "ImageObject", url: `${SITE_URL}/logo.png` } },
    mainEntityOfPage: { "@type": "WebPage", "@id": `${SITE_URL}/blog/${post.slug}` },
  };

  return (
    <div className="min-h-screen bg-white">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <SiteHeader />

      <article className="max-w-3xl mx-auto px-5 py-10 sm:py-14">
        <Link href="/blog" className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-700 hover:underline mb-6">
          <ArrowLeft className="w-3.5 h-3.5" />
          Tất cả bài viết
        </Link>

        <h1 className="text-2xl sm:text-4xl font-black text-slate-900 tracking-tight leading-tight">{post.title}</h1>

        <div className="mt-4 flex items-center gap-4 text-xs text-slate-500 flex-wrap">
          <span className="flex items-center gap-1.5"><User className="w-3.5 h-3.5" />{post.authorName}</span>
          <span className="flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5" />{formatDate(post.publishedAt)}</span>
        </div>

        {post.coverImageUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={post.coverImageUrl} alt={post.title} className="w-full rounded-3xl border border-emerald-100 mt-8 object-cover max-h-96" />
        )}

        <div className="mt-8">
          <BlogMarkdown content={post.content} />
        </div>

        <div className="mt-12 bg-emerald-600 rounded-3xl p-8 text-center text-white">
          <Sparkles className="w-7 h-7 mx-auto mb-3" />
          <h2 className="text-lg sm:text-xl font-black">Trải nghiệm SUMFLOW ngay hôm nay</h2>
          <p className="mt-2 text-sm text-emerald-50">Soạn giáo án, tạo video AI và quản lý lớp học — tất cả chỉ trong vài giây.</p>
          <Link
            href="/chat"
            className="mt-5 inline-flex items-center justify-center gap-2 bg-white hover:bg-emerald-50 text-emerald-700 font-bold text-sm py-3 px-6 rounded-2xl shadow-lg transition-all"
          >
            Trải nghiệm ngay
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </article>

      <SiteFooter />
    </div>
  );
}
