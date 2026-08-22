import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { AuthGateProvider } from "@/components/auth/AuthGateProvider";
import { AnnouncementBanner } from "@/components/layout/AnnouncementBanner";

const inter = Inter({
  subsets: ["latin", "vietnamese"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "SUMFLOW - Trợ lý AI Giáo viên Mầm non Việt Nam",
  description: "Trợ lý AI thông minh hỗ trợ giáo viên mầm non Việt Nam soạn giáo án, nhận xét trẻ, viết tin nhắn phụ huynh và quản lý lớp học dễ dàng.",
  other: {
    "google-site-verification": "RB4vM3JTC9-JfWRB59RmFiEs_DarzkH1JmmJYO1_dhA",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="vi" className={inter.variable}>
      <body className="min-h-screen bg-slate-50 antialiased">
        <AnnouncementBanner />
        <AuthGateProvider>{children}</AuthGateProvider>
      </body>
    </html>
  );
}
