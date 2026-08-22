import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireActiveUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

/** Sửa thông tin cơ bản của 1 học sinh (chỉ trong lớp của chính giáo viên đang đăng nhập). */
export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await requireActiveUser();
  if (ctx instanceof NextResponse) return ctx;
  const { teacher } = ctx;
  const { id } = await params;

  try {
    const existing = await prisma.student.findFirst({ where: { id, class: { teacherId: teacher.id } } });
    if (!existing) {
      return NextResponse.json({ success: false, error: "Không tìm thấy học sinh trong lớp của bạn." }, { status: 404 });
    }

    const body = await request.json();
    const { name, gender, dateOfBirth, address, hobbies, parentName, parentPhone, notes } = body;

    if (name !== undefined && (!name || !name.trim())) {
      return NextResponse.json({ success: false, error: "Tên bé không được để trống." }, { status: 400 });
    }

    const updated = await prisma.student.update({
      where: { id },
      data: {
        ...(name !== undefined && { name: name.trim() }),
        ...(gender !== undefined && { gender }),
        ...(dateOfBirth !== undefined && { dateOfBirth }),
        ...(address !== undefined && { address }),
        ...(hobbies !== undefined && { hobbies }),
        ...(parentName !== undefined && { parentName }),
        ...(parentPhone !== undefined && { parentPhone }),
        ...(notes !== undefined && { notes }),
      },
    });

    return NextResponse.json({ success: true, student: updated });
  } catch (error: any) {
    console.error("PUT /api/students/[id] error:", error);
    return NextResponse.json({ success: false, error: "Không thể cập nhật thông tin học sinh." }, { status: 500 });
  }
}
