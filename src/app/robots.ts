import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      // Không cho bot crawl các trang trong app cần đăng nhập/riêng tư của
      // từng giáo viên — chỉ mở trang công khai (landing, đăng nhập/đăng ký).
      disallow: [
        "/api/",
        "/admin",
        "/chat",
        "/lessons",
        "/classes",
        "/topics",
        "/assessment",
        "/tools",
        "/settings",
        "/billing",
        "/video-studio",
        "/video-credits",
      ],
    },
    sitemap: "https://sumflow.online/sitemap.xml",
  };
}
