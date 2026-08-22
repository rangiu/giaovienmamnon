/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Build output gọn cho Docker — chỉ đóng gói đúng node_modules cần dùng,
  // giúp image nhỏ hơn nhiều, quan trọng trên VPS ít RAM/disk.
  output: "standalone",
  experimental: {
    // Bug thật đã gặp: dù đặt ĐÚNG vị trí src/instrumentation.ts, hook
    // register() (khởi động poller video lúc server boot, xem
    // src/instrumentation.ts) vẫn KHÔNG được Next.js 14.2.x nhận diện nếu
    // thiếu cờ này — kiểm tra qua .next build output không thấy file
    // instrumentation nào được đóng gói. Bật cờ để hook thật sự chạy, không
    // chỉ trông chờ vào lớp an toàn thứ 2 (gọi startVideoJobPoller() ở đầu
    // route GET/POST video-jobs).
    instrumentationHook: true,
    // @remotion/bundler tự chứa 1 bundler khác bên trong (rspack/esbuild)
    // để dựng video Tier Hybrid lúc RUNTIME — nếu để Next.js webpack cố
    // BUNDLE các gói này vào server bundle của chính nó, nó sẽ cố parse cả
    // file binary native (.node) và file .d.ts của esbuild như module JS
    // thường và vỡ build ("Unexpected character"). Khai TÊN các gói này
    // "external" để Next chỉ require() thẳng từ node_modules lúc chạy
    // (đúng cách Node hoạt động vốn có), không đi qua webpack nữa.
    serverComponentsExternalPackages: [
      "remotion",
      "@remotion/bundler",
      "@remotion/renderer",
      "@remotion/compositor-win32-x64-msvc",
      "@remotion/compositor-linux-x64-gnu",
      "@remotion/compositor-linux-x64-musl",
      "esbuild",
      "@rspack/core",
      "@rspack/binding",
    ],
  },
};

export default nextConfig;
