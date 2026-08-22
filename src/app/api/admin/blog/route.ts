import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { slugify, uniqueSlug } from "@/lib/blog";

export const dynamic = "force-dynamic";

/** Toàn bộ bài viết (kể cả nháp) — cho trang quản trị. */
export async function GET() {
  const ctx = await requireAdmin();
  if (ctx instanceof NextResponse) return ctx;

  const posts = await prisma.blogPost.findMany({ orderBy: { createdAt: "desc" } });
  return NextResponse.json({ success: true, posts });
}

/** Tạo bài viết mới — mặc định lưu NHÁP (status DRAFT), admin bấm "Đăng" riêng khi sẵn sàng. */
export async function POST(request: Request) {
  const ctx = await requireAdmin();
  if (ctx instanceof NextResponse) return ctx;

  try {
    const body = await request.json();
    const { title, excerpt, content, coverImageUrl, authorName, status } = body;

    if (!title || typeof title !== "string" || !title.trim()) {
      return NextResponse.json({ success: false, error: "Vui lòng nhập tiêu đề bài viết." }, { status: 400 });
    }
    if (!content || typeof content !== "string" || !content.trim()) {
      return NextResponse.json({ success: false, error: "Vui lòng nhập nội dung bài viết." }, { status: 400 });
    }

    const trimmedTitle = title.trim();
    const publish = status === "PUBLISHED";
    const slug = await uniqueSlug(slugify(trimmedTitle));

    const post = await prisma.blogPost.create({
      data: {
        slug,
        title: trimmedTitle,
        excerpt: typeof excerpt === "string" && excerpt.trim() ? excerpt.trim() : null,
        content: content.trim(),
        coverImageUrl: typeof coverImageUrl === "string" && coverImageUrl.trim() ? coverImageUrl.trim() : null,
        authorName: typeof authorName === "string" && authorName.trim() ? authorName.trim() : "Đội ngũ SUMFLOW",
        status: publish ? "PUBLISHED" : "DRAFT",
        publishedAt: publish ? new Date() : null,
      },
    });

    return NextResponse.json({ success: true, post });
  } catch (error: any) {
    console.error("POST /api/admin/blog error:", error);
    return NextResponse.json({ success: false, error: "Không thể tạo bài viết." }, { status: 500 });
  }
}
