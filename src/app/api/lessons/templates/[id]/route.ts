import { NextResponse } from "next/server";
import { requireActiveUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  const ctx = await requireActiveUser();
  if (ctx instanceof NextResponse) return ctx;
  const { teacher } = ctx;
  const { id } = params;

  try {
    const template = await prisma.lessonTemplate.findUnique({ where: { id } });
    if (!template) {
      return NextResponse.json({ success: false, error: "Không tìm thấy mẫu giáo án." }, { status: 404 });
    }

    if (template.isSystem) {
      return NextResponse.json({ success: false, error: "Không thể xóa mẫu chuẩn hệ thống." }, { status: 403 });
    }

    if (template.teacherId !== teacher.id && ctx.user.role !== "admin") {
      return NextResponse.json({ success: false, error: "Cô không có quyền xóa mẫu giáo án này." }, { status: 403 });
    }

    await prisma.lessonTemplate.delete({ where: { id } });

    return NextResponse.json({ success: true, message: "Đã xóa mẫu giáo án thành công." });
  } catch (error: any) {
    console.error("DELETE /api/lessons/templates/[id] error:", error);
    return NextResponse.json({ success: false, error: "Không thể xóa mẫu giáo án." }, { status: 500 });
  }
}
