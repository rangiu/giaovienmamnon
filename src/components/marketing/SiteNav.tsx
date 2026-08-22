// Thanh điều hướng theo mục dùng CHUNG cho mọi trang công khai (marketing):
// /gioi-thieu, /blog, /blog/[slug]. Trước đây mỗi trang tự định nghĩa header/
// footer riêng (blog dùng bản rút gọn khác hẳn) — giờ gộp 1 nơi để LUÔN nhất
// quán định dạng, và để sửa 1 chỗ áp dụng khắp nơi.
//
// Href các mục là ANCHOR đầy đủ TỚI /gioi-thieu (VD "/gioi-thieu#tinh-nang")
// thay vì chỉ "#tinh-nang" — vì các trang blog không có các section đó trên
// chính nó, bấm vào phải điều hướng SANG /gioi-thieu rồi cuộn tới đúng mục.
// Khi đang đứng sẵn trên /gioi-thieu, trình duyệt tự nhận URL trùng path chỉ
// khác #hash nên chỉ cuộn mượt, không tải lại trang — hoạt động đúng như cũ.
export const NAV_TABS = [
  { href: "/gioi-thieu#trang-chu", label: "Trang chủ" },
  { href: "/gioi-thieu#gioi-thieu", label: "Giới thiệu" },
  { href: "/gioi-thieu#tinh-nang", label: "Tính năng" },
  { href: "/gioi-thieu#bang-gia", label: "Bảng giá" },
  { href: "/blog", label: "Blog" },
  { href: "/gioi-thieu#lien-he", label: "Liên hệ" },
];

export const ZALO_URL = "https://zalo.me/0899442256";
export const FACEBOOK_URL = "https://www.facebook.com/share/17phzLgVWC/?mibextid=wwXIfr";
