import { prisma } from "./prisma";

export const SETTING_KEYS = {
  DAILY_PRICE_VND: "daily_price_vnd",
  WEEKLY_PRICE_VND: "weekly_price_vnd",
  MONTHLY_PRICE_VND: "monthly_price_vnd",
  // Giá THAM KHẢO cho gói tải bản offline vĩnh viễn — bán/giao thủ công
  // qua Facebook/Zalo, không qua cổng thanh toán tự động.
  OFFLINE_PRICE_VND: "offline_price_vnd",
  // Số lượt chat tối đa/NGÀY cho tài khoản FREE/EXPIRED (chưa trả phí) —
  // trước đây tính theo GIỜ, đổi sang theo NGÀY cho đúng ý nghĩa "lượt/ngày"
  // (bản thân copy quảng cáo ở Sidebar/trang giới thiệu từ trước đã ghi
  // "lượt/ngày" dù logic cũ tính theo giờ — sửa cho khớp thật).
  FREE_CHAT_LIMIT_PER_DAY: "free_chat_limit_per_day",
  // Banner thông báo khẩn chạy ngang đầu trang — admin bật/tắt + soạn nội
  // dung, hiện cho MỌI người (kể cả khách chưa đăng nhập).
  BANNER_ENABLED: "banner_enabled",
  BANNER_MESSAGE: "banner_message",
  BANNER_LINK: "banner_link",
  // "info" (xanh dương) | "urgent" (đỏ) | "promo" (cam/vàng) — đổi màu banner theo tính chất tin.
  BANNER_STYLE: "banner_style",
  // Bật/Tắt thu thập file giáo án mẫu từ người dùng (Vòng 1 Admin)
  ENABLE_TEMPLATE_COLLECTION: "enable_template_collection",
  // Bật/Tắt hiển thị Kho Mẫu Tham Khảo Public cho người dùng phổ thông (Phase 2)
  PUBLIC_TEMPLATE_BANK_ENABLED: "public_template_bank_enabled",
} as const;

const DEFAULTS: Record<string, string> = {
  [SETTING_KEYS.DAILY_PRICE_VND]: "5000",
  [SETTING_KEYS.WEEKLY_PRICE_VND]: "25000",
  [SETTING_KEYS.MONTHLY_PRICE_VND]: "99000",
  [SETTING_KEYS.OFFLINE_PRICE_VND]: "1990000",
  [SETTING_KEYS.FREE_CHAT_LIMIT_PER_DAY]: "3",
  [SETTING_KEYS.BANNER_ENABLED]: "false",
  [SETTING_KEYS.BANNER_MESSAGE]: "",
  [SETTING_KEYS.BANNER_LINK]: "",
  [SETTING_KEYS.BANNER_STYLE]: "info",
  [SETTING_KEYS.ENABLE_TEMPLATE_COLLECTION]: "true",
  [SETTING_KEYS.PUBLIC_TEMPLATE_BANK_ENABLED]: "false",
};

export async function getSetting(key: string): Promise<string> {
  const row = await prisma.appSetting.findUnique({ where: { key } });
  return row?.value ?? DEFAULTS[key] ?? "";
}

export async function setSetting(key: string, value: string) {
  return prisma.appSetting.upsert({
    where: { key },
    create: { key, value },
    update: { value },
  });
}

export async function getMonthlyPriceVnd(): Promise<number> {
  const value = await getSetting(SETTING_KEYS.MONTHLY_PRICE_VND);
  return Number(value) || 99000;
}

/** Các gói thuê bao theo thời hạn cố định — hiển thị cho giáo viên chọn ở trang Billing. */
export const SUBSCRIPTION_PLANS = [
  { code: "DAILY", label: "Theo ngày", durationDays: 1, settingKey: SETTING_KEYS.DAILY_PRICE_VND },
  { code: "WEEKLY", label: "Theo tuần", durationDays: 7, settingKey: SETTING_KEYS.WEEKLY_PRICE_VND },
  { code: "MONTHLY", label: "Theo tháng", durationDays: 30, settingKey: SETTING_KEYS.MONTHLY_PRICE_VND },
] as const;

export type PlanCode = (typeof SUBSCRIPTION_PLANS)[number]["code"];

export async function getAllPlanPricesVnd(): Promise<
  { code: PlanCode; label: string; durationDays: number; priceVnd: number }[]
> {
  const rows = await Promise.all(
    SUBSCRIPTION_PLANS.map(async (plan) => ({
      code: plan.code,
      label: plan.label,
      durationDays: plan.durationDays,
      priceVnd: Number(await getSetting(plan.settingKey)) || 0,
    }))
  );
  return rows;
}

export async function getPlanByCode(code: string) {
  const plan = SUBSCRIPTION_PLANS.find((p) => p.code === code);
  if (!plan) return null;
  const priceVnd = Number(await getSetting(plan.settingKey)) || 0;
  return { ...plan, priceVnd };
}

export async function getOfflinePriceVnd(): Promise<number> {
  const value = await getSetting(SETTING_KEYS.OFFLINE_PRICE_VND);
  return Number(value) || 1990000;
}

export async function getFreeChatLimitPerDay(): Promise<number> {
  const value = await getSetting(SETTING_KEYS.FREE_CHAT_LIMIT_PER_DAY);
  return Number(value) || 3;
}

export interface BannerConfig {
  enabled: boolean;
  message: string;
  link: string | null;
  style: "info" | "urgent" | "promo";
}

export async function getBannerConfig(): Promise<BannerConfig> {
  const [enabled, message, link, style] = await Promise.all([
    getSetting(SETTING_KEYS.BANNER_ENABLED),
    getSetting(SETTING_KEYS.BANNER_MESSAGE),
    getSetting(SETTING_KEYS.BANNER_LINK),
    getSetting(SETTING_KEYS.BANNER_STYLE),
  ]);
  return {
    enabled: enabled === "true" && message.trim() !== "",
    message: message.trim(),
    link: link.trim() || null,
    style: style === "urgent" || style === "promo" ? style : "info",
  };
}

export async function isTemplateCollectionEnabled(): Promise<boolean> {
  const value = await getSetting(SETTING_KEYS.ENABLE_TEMPLATE_COLLECTION);
  return value !== "false";
}

export async function isPublicTemplateBankEnabled(): Promise<boolean> {
  const value = await getSetting(SETTING_KEYS.PUBLIC_TEMPLATE_BANK_ENABLED);
  return value === "true";
}

