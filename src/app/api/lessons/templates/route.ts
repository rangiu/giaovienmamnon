import { NextResponse } from "next/server";
import { requireActiveUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ensureSystemTemplatesInDb } from "@/lib/ai/systemTemplates";
import { isPublicTemplateBankEnabled } from "@/lib/settings";

export const dynamic = "force-dynamic";

export async function GET() {
  const ctx = await requireActiveUser();
  if (ctx instanceof NextResponse) return ctx;
  const { teacher } = ctx;

  try {
    // Đảm bảo 3 mẫu chuẩn hệ thống (5E, Truyền thống, STEAM) luôn có sẵn
    await ensureSystemTemplatesInDb();

    const isPublicEnabled = await isPublicTemplateBankEnabled();

    // Lấy danh sách mẫu phù hợp
    const templates = await prisma.lessonTemplate.findMany({
      where: {
        OR: [
          { isSystem: true },
          { teacherId: teacher.id },
          ...(isPublicEnabled ? [{ status: "APPROVED", isSystem: false }] : []),
        ],
      },
      orderBy: [{ isSystem: "desc" }, { createdAt: "desc" }],
    });

    return NextResponse.json({
      success: true,
      templates,
      isPublicBankEnabled: isPublicEnabled,
    });
  } catch (error: any) {
    console.error("GET /api/lessons/templates error:", error);
    return NextResponse.json({ success: false, error: "Không thể lấy danh sách mẫu giáo án." }, { status: 500 });
  }
}
