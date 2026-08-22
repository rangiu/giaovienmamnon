import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { slugify, uniqueSlug } from "@/lib/blog";

export const dynamic = "force-dynamic";

/**
 * Sửa bài viết (tiêu đề/tóm tắt/nội dung/ảnh bìa/tác giả/trạng thái). Đổi
 * tiêu đề KHÔNG tự đổi slug (giữ nguyên URL cũ, tránh vỡ link đã chia sẻ/đã
 * được Google lập chỉ mục) — chỉ đổi slug khi admin chủ động gửi field slug.
 * publishedAt chỉ set 1 LẦN DUY NHẤT lúc chuyển DRAFT→PUBLISHED lần đầu, các
 * lần sửa nội dung sau đó không đổi ngày đăng gốc.
 */
export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await requireAdmin();
  if (ctx instanceof NextResponse) return ctx;
  const { id } = await params;

  try {
    const body = await request.json();
    const existing = await prisma.blogPost.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ success: false, error: "Không tìm thấy bài viết." }, { status: 404 });
    }

    const data: Record<string, any> = {};

    if (typeof body.title === "string") {
      if (!body.title.trim()) {
        return NextResponse.json({ success: false, error: "Tiêu đề không được để trống." }, { status: 400 });
      }
      data.title = body.title.trim();
    }
    if (typeof body.content === "string") {
      if (!body.content.trim()) {
        return NextResponse.json({ success: false, error: "Nội dung không được để trống." }, { status: 400 });
      }
      data.content = body.content.trim();
    }
    if (typeof body.excerpt === "string") {
      data.excerpt = body.excerpt.trim() || null;
    }
    if (typeof body.coverImageUrl === "string") {
      data.coverImageUrl = body.coverImageUrl.trim() || null;
    }
    if (typeof body.authorName === "string" && body.authorName.trim()) {
      data.authorName = body.authorName.trim();
    }
    if (typeof body.slug === "string" && body.slug.trim()) {
      data.slug = await uniqueSlug(slugify(body.slug.trim()), id);
    }
    if (body.status === "PUBLISHED" || body.status === "DRAFT") {
      data.status = body.status;
      if (body.status === "PUBLISHED" && !existing.publishedAt) {
        data.publishedAt = new Date();
      }
      if (body.status === "DRAFT") {
        // Gỡ về nháp thì thôi không hiện công khai nữa, nhưng GIỮ NGUYÊN
        // publishedAt cũ — nếu đăng lại sau thì không cần set lại từ đầu.
      }
    }

    const post = await prisma.blogPost.update({ where: { id }, data });
    return NextResponse.json({ success: true, post });
  } catch (error: any) {
    if (error?.code === "P2002") {
      return NextResponse.json({ success: false, error: "Slug này đã được dùng cho bài viết khác." }, { status: 409 });
    }
    console.error("PUT /api/admin/blog/[id] error:", error);
    return NextResponse.json({ success: false, error: "Không thể cập nhật bài viết." }, { status: 500 });
  }
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await requireAdmin();
  if (ctx instanceof NextResponse) return ctx;
  const { id } = await params;

  try {
    await prisma.blogPost.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error: any) {
    if (error?.code === "P2025") {
      return NextResponse.json({ success: false, error: "Không tìm thấy bài viết." }, { status: 404 });
    }
    console.error("DELETE /api/admin/blog/[id] error:", error);
    return NextResponse.json({ success: false, error: "Không thể xoá bài viết." }, { status: 500 });
  }
}
