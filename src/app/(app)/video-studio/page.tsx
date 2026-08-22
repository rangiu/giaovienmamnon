import { VideoStudioClient } from "@/components/video/VideoStudioClient";

// Gate truy cập chung (chưa xác minh/đã khoá) đã xử lý ở (app)/layout.tsx —
// trang này chỉ cần requireActiveUser ở tầng API (video-jobs route), không
// cần requireFullAccess vì tín dụng video là sản phẩm mua riêng, dùng được
// kể cả tài khoản FREE/EXPIRED (giống logic mua gói thuê bao ở /billing).
export default function VideoStudioPage() {
  return <VideoStudioClient />;
}
