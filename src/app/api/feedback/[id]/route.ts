import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireActiveUser, requireAdmin } from "@/lib/auth";

export const dynamic = "force-dynamic";

/** Chính chủ xoá phản hồi của mình (xoá thật — nội dung của mình, mình toàn quyền). */
export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await requireActiveUser();
  if (ctx instanceof NextResponse) return ctx;
  const { user } = ctx;
  const { id } = await params;

  try {
    const result = await prisma.feedback.deleteMany({ where: { id, userId: user.id } });
    if (result.count === 0) {
      return NextResponse.json({ success: false, error: "Không tìm thấy phản hồi hoặc cô không có quyền xoá." }, { status: 404 });
    }
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("DELETE /api/feedback/[id] error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

/**
 * Admin ẩn (hoặc bỏ ẩn) 1 phản hồi — lưới an toàn thứ 2 nếu nội dung không
 * phù hợp lọt qua được bộ lọc từ khoá. Dùng ẩn thay vì xoá thật để giữ vết,
 * admin xem lại được nếu cần đối chiếu khi có tranh chấp.
 */
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await requireAdmin();
  if (ctx instanceof NextResponse) return ctx;
  const { id } = await params;

  try {
    const body = await request.json();
    const isHidden = Boolean(body.isHidden);

    const feedback = await prisma.feedback.update({ where: { id }, data: { isHidden } });
    return NextResponse.json({ success: true, feedback });
  } catch (error: any) {
    console.error("PATCH /api/feedback/[id] error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
