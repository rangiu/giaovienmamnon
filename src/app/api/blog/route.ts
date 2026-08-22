import { NextResponse } from "next/server";
import { getPublishedBlogPosts } from "@/lib/blog";

export const dynamic = "force-dynamic";

/** Danh sách bài blog ĐÃ ĐĂNG (công khai, không cần đăng nhập). */
export async function GET() {
  try {
    const posts = await getPublishedBlogPosts();
    return NextResponse.json({ success: true, posts });
  } catch (error: any) {
    console.error("GET /api/blog error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
