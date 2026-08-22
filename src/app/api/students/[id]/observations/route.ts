import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireActiveUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

// Quản lý lớp học (thêm/sửa học sinh, ghi quan sát) mở cho cả tài khoản
// FREE — chỉ các tính năng AI tốn phí mới cần gói trả phí.
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await requireActiveUser();
  if (ctx instanceof NextResponse) return ctx;
  const { teacher, user } = ctx;
  const { id } = await params;

  try {
    // Chỉ cho phép ghi quan sát cho học sinh thuộc lớp giáo viên đang đăng nhập.
    const student = await prisma.student.findFirst({ where: { id, class: { teacherId: teacher.id } } });
    if (!student) {
      return NextResponse.json({ success: false, error: "Không tìm thấy học sinh trong lớp của bạn." }, { status: 404 });
    }

    const body = await request.json();
    const { content, category } = body;

    if (!content || typeof content !== "string" || content.trim() === "") {
      return NextResponse.json({ success: false, error: "Cô vui lòng nhập nội dung quan sát bé nhé!" }, { status: 400 });
    }

    // Ghi đúng tên giáo viên thật đang đăng nhập — nếu bỏ trống, DB sẽ
    // âm thầm rơi về default cũ "Cô Lan" (giả), gây hiểu nhầm ai ghi quan sát.
    const observation = await prisma.observation.create({
      data: {
        studentId: id,
        content: content.trim(),
        category: category || "Chung",
        date: new Date(),
        createdBy: user.name,
      },
    });

    return NextResponse.json({ success: true, observation });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
