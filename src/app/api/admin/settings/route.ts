import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import {
  getSetting,
  setSetting,
  SETTING_KEYS,
  getAllPlanPricesVnd,
  getOfflinePriceVnd,
  getFreeChatLimitPerDay,
  getBannerConfig,
} from "@/lib/settings";

export const dynamic = "force-dynamic";

export async function GET() {
  const ctx = await requireAdmin();
  if (ctx instanceof NextResponse) return ctx;

  const plans = await getAllPlanPricesVnd();
  const offlinePriceVnd = await getOfflinePriceVnd();
  const freeChatLimitPerDay = await getFreeChatLimitPerDay();
  const banner = await getBannerConfig();
  const enableTemplateCollection = (await getSetting(SETTING_KEYS.ENABLE_TEMPLATE_COLLECTION)) !== "false";
  const publicTemplateBankEnabled = (await getSetting(SETTING_KEYS.PUBLIC_TEMPLATE_BANK_ENABLED)) === "true";

  return NextResponse.json({
    success: true,
    settings: {
      // Giữ nguyên field cũ để tương thích ngược với FE cũ nếu có.
      monthlyPriceVnd: plans.find((p) => p.code === "MONTHLY")?.priceVnd ?? 99000,
      plans,
      offlinePriceVnd,
      freeChatLimitPerDay,
      banner,
      enableTemplateCollection,
      publicTemplateBankEnabled,
    },
  });
}

export async function PUT(request: Request) {
  const ctx = await requireAdmin();
  if (ctx instanceof NextResponse) return ctx;

  try {
    const body = await request.json();

    if (typeof body.enableTemplateCollection === "boolean") {
      await setSetting(SETTING_KEYS.ENABLE_TEMPLATE_COLLECTION, String(body.enableTemplateCollection));
    }
    if (typeof body.publicTemplateBankEnabled === "boolean") {
      await setSetting(SETTING_KEYS.PUBLIC_TEMPLATE_BANK_ENABLED, String(body.publicTemplateBankEnabled));
    }

    const updates: [string, number][] = [
      [SETTING_KEYS.DAILY_PRICE_VND, body.dailyPriceVnd],
      [SETTING_KEYS.WEEKLY_PRICE_VND, body.weeklyPriceVnd],
      [SETTING_KEYS.MONTHLY_PRICE_VND, body.monthlyPriceVnd],
      [SETTING_KEYS.OFFLINE_PRICE_VND, body.offlinePriceVnd],
    ];

    for (const [key, rawValue] of updates) {
      if (rawValue === undefined || rawValue === null) continue;
      const price = Number(rawValue);
      if (!Number.isFinite(price) || price < 0) {
        return NextResponse.json({ success: false, error: "Giá gói không hợp lệ." }, { status: 400 });
      }
      await setSetting(key, String(Math.round(price)));
    }

    if (body.freeChatLimitPerDay !== undefined && body.freeChatLimitPerDay !== null) {
      const limit = Number(body.freeChatLimitPerDay);
      if (!Number.isFinite(limit) || limit < 0) {
        return NextResponse.json({ success: false, error: "Giới hạn chat không hợp lệ." }, { status: 400 });
      }
      await setSetting(SETTING_KEYS.FREE_CHAT_LIMIT_PER_DAY, String(Math.round(limit)));
    }

    if (body.banner && typeof body.banner === "object") {
      const { enabled, message, link, style } = body.banner;
      if (typeof enabled === "boolean") await setSetting(SETTING_KEYS.BANNER_ENABLED, String(enabled));
      if (typeof message === "string") await setSetting(SETTING_KEYS.BANNER_MESSAGE, message.trim());
      if (typeof link === "string") await setSetting(SETTING_KEYS.BANNER_LINK, link.trim());
      if (style === "info" || style === "urgent" || style === "promo") await setSetting(SETTING_KEYS.BANNER_STYLE, style);
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("PUT /api/admin/settings error:", error);
    return NextResponse.json({ success: false, error: "Không thể cập nhật cài đặt." }, { status: 500 });
  }
}
