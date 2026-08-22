import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireActiveUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

/** Xoá 1 cuộc trò chuyện (và toàn bộ tin nhắn bên trong, nhờ onDelete: Cascade). */
export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await requireActiveUser();
  if (ctx instanceof NextResponse) return ctx;
  const { teacher } = ctx;
  const { id } = await params;

  try {
    // Chỉ cho xoá đúng cuộc trò chuyện thuộc CHÍNH giáo viên đang đăng nhập
    // (deleteMany với điều kiện teacherId thay vì delete-by-id trực tiếp)
    // — tránh 1 tài khoản xoá được lịch sử chat của tài khoản khác chỉ bằng
    // cách tự đoán/sửa id trên request.
    const result = await prisma.conversation.deleteMany({
      where: { id, teacherId: teacher.id },
    });

    if (result.count === 0) {
      return NextResponse.json({ success: false, error: "Không tìm thấy cuộc trò chuyện." }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("DELETE /api/chat/[id] error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
