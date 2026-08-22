import type { MetadataRoute } from "next";
import { getPublishedBlogPosts } from "@/lib/blog";

// Đổi domain chính từ coai.sumflow.online sang sumflow.online (root) — sau
// khi cô chuyển route Cloudflare Tunnel, sumflow.online mới là domain thật
// nhận traffic/ranking Google, canonical/sitemap phải khớp domain đó.
const SITE_URL = "https://sumflow.online";

// Đọc DB (bài blog thật) nên PHẢI force-dynamic — máy build dùng
// DATABASE_URL giả (không kết nối được), route này phải chạy lúc request
// thật trên VPS, không được Next cố prerender lúc build.
export const dynamic = "force-dynamic";

// Chỉ liệt kê các trang CÔNG KHAI thật sự tồn tại và nên được Google lập
// chỉ mục — không đưa các trang cần đăng nhập vào đây (robots.ts đã chặn
// crawl riêng, sitemap chỉ nên khớp với các URL thực sự công khai). Bài blog
// lấy TRỰC TIẾP từ DB (bài admin đã đăng thật) — không bịa danh sách tĩnh,
// nên hàm này phải async để đọc được.
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const posts = await getPublishedBlogPosts();

  return [
    {
      url: `${SITE_URL}/gioi-thieu`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 1,
    },
    {
      url: `${SITE_URL}/`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.8,
    },
    {
      url: `${SITE_URL}/blog`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.7,
    },
    ...posts.map((post) => ({
      url: `${SITE_URL}/blog/${post.slug}`,
      lastModified: post.publishedAt || new Date(),
      changeFrequency: "monthly" as const,
      priority: 0.6,
    })),
    {
      url: `${SITE_URL}/login`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.3,
    },
    {
      url: `${SITE_URL}/signup`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.5,
    },
  ];
}
