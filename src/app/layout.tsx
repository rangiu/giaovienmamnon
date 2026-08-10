import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Navbar } from "@/components/layout/Navbar";
import { Sidebar } from "@/components/layout/Sidebar";
import { MobileBottomNav } from "@/components/layout/MobileBottomNav";

const inter = Inter({
  subsets: ["latin", "vietnamese"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "Cô AI - Trợ lý AI Giáo viên Mầm non Việt Nam",
  description: "Trợ lý AI thông minh hỗ trợ giáo viên mầm non Việt Nam soạn giáo án, nhận xét trẻ, viết tin nhắn phụ huynh và quản lý lớp học dễ dàng.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="vi" className={inter.variable}>
      <body className="min-h-screen bg-slate-50 flex flex-col md:flex-row antialiased">
        <Sidebar />
        <div className="flex-1 flex flex-col min-w-0 min-h-screen">
          <Navbar />
          <main className="flex-1 p-4 md:p-8 pb-20 md:pb-8 max-w-7xl w-full mx-auto">
            {children}
          </main>
          <MobileBottomNav />
        </div>
      </body>
    </html>
  );
}
