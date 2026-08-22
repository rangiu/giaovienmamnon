import { prisma } from "@/lib/prisma";

/**
 * Sinh slug URL từ tiêu đề tiếng Việt — bỏ dấu, đổi đ/Đ thành d/D riêng (NFD
 * không tách được ký tự này), chỉ giữ chữ/số, nối bằng dấu gạch ngang. Dùng
 * chung ý tưởng với safeFileName() trong exportDocument.ts nhưng đổi khoảng
 * trắng thành "-" thay vì "_" cho đúng quy ước URL.
 */
export function slugify(title: string): string {
  return (title || "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 80);
}

/** Đảm bảo slug không trùng — nếu đã tồn tại thì nối thêm hậu tố -2, -3... */
export async function uniqueSlug(base: string, excludeId?: string): Promise<string> {
  const root = base || "bai-viet";
  let candidate = root;
  let n = 2;
  // Số bài viết nhỏ (blog nội bộ) — vòng lặp tuần tự đơn giản là đủ, không
  // cần tối ưu 1 query phức tạp.
  while (true) {
    const existing = await prisma.blogPost.findUnique({ where: { slug: candidate } });
    if (!existing || existing.id === excludeId) return candidate;
    candidate = `${root}-${n}`;
    n += 1;
  }
}

const PUBLIC_LIST_SELECT = {
  id: true,
  slug: true,
  title: true,
  excerpt: true,
  coverImageUrl: true,
  authorName: true,
  publishedAt: true,
  viewCount: true,
} as const;

/** Danh sách bài đã đăng, mới nhất trước — dùng cho trang /blog. */
export async function getPublishedBlogPosts(limit = 50) {
  return prisma.blogPost.findMany({
    where: { status: "PUBLISHED" },
    orderBy: { publishedAt: "desc" },
    take: limit,
    select: PUBLIC_LIST_SELECT,
  });
}

/** N bài mới nhất — dùng cho khối "Bài viết mới nhất" nhúng ở /gioi-thieu. */
export async function getLatestBlogPosts(n = 3) {
  return getPublishedBlogPosts(n);
}

/** 1 bài đã đăng theo slug — null nếu chưa đăng hoặc không tồn tại (không lộ bài DRAFT ra ngoài). */
export async function getPublishedBlogPostBySlug(slug: string) {
  return prisma.blogPost.findFirst({ where: { slug, status: "PUBLISHED" } });
}
