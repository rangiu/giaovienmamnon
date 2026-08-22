import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const ctx = await requireAdmin();
  if (ctx instanceof NextResponse) return ctx;

  try {
    const { searchParams } = new URL(request.url);
    const statusFilter = searchParams.get("status") || "PENDING_REVIEW";

    const whereCondition = statusFilter === "ALL" ? { isSystem: false } : { status: statusFilter, isSystem: false };

    const templates = await prisma.lessonTemplate.findMany({
      where: whereCondition,
      include: {
        teacher: {
          include: {
            user: { select: { id: true, name: true, email: true } },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ success: true, templates });
  } catch (error: any) {
    console.error("GET /api/admin/templates error:", error);
    return NextResponse.json({ success: false, error: "Không thể lấy danh sách mẫu chờ duyệt." }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  const ctx = await requireAdmin();
  if (ctx instanceof NextResponse) return ctx;

  try {
    const body = await request.json();
    const { templateId, action, rejectionReason } = body;

    if (!templateId || !action || (action !== "APPROVE" && action !== "REJECT")) {
      return NextResponse.json({ success: false, error: "Dữ liệu yêu cầu không hợp lệ." }, { status: 400 });
    }

    const template = await prisma.lessonTemplate.findUnique({ where: { id: templateId } });
    if (!template) {
      return NextResponse.json({ success: false, error: "Không tìm thấy mẫu giáo án." }, { status: 404 });
    }

    const updated = await prisma.lessonTemplate.update({
      where: { id: templateId },
      data: {
        status: action === "APPROVE" ? "APPROVED" : "REJECTED",
        rejectionReason: action === "REJECT" ? rejectionReason || "Nội dung chưa phù hợp quy chuẩn." : null,
      },
    });

    return NextResponse.json({
      success: true,
      message: action === "APPROVE" ? "Đã phê duyệt đưa mẫu vào Kho Public!" : "Đã từ chối mẫu giáo án.",
      template: updated,
    });
  } catch (error: any) {
    console.error("PATCH /api/admin/templates error:", error);
    return NextResponse.json({ success: false, error: "Không thể cập nhật trạng thái mẫu." }, { status: 500 });
  }
}
