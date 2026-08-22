import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireActiveUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET() {
  const ctx = await requireActiveUser();
  if (ctx instanceof NextResponse) return ctx;
  const { teacher } = ctx;

  try {
    const classes = await prisma.class.findMany({
      where: { teacherId: teacher.id },
      include: {
        students: {
          include: {
            observations: {
              orderBy: { date: "desc" },
            },
          },
          orderBy: { name: "asc" },
        },
      },
    });

    return NextResponse.json({ success: true, classes });
  } catch (error: any) {
    console.error("GET /api/classes DB Error:", error);
    return NextResponse.json({ success: false, error: "Không thể tải danh sách lớp." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const ctx = await requireActiveUser();
  if (ctx instanceof NextResponse) return ctx;
  const { currentClass } = ctx;

  try {
    const body = await request.json();
    const { classId, name, gender, dateOfBirth, address, hobbies, parentName, parentPhone, notes } = body;

    if (!name || name.trim() === "") {
      return NextResponse.json(
        { success: false, error: "Vui lòng nhập tên bé." },
        { status: 400 }
      );
    }

    const targetClassId = classId || currentClass.id;

    const student = await prisma.student.create({
      data: {
        classId: targetClassId,
        name: name.trim(),
        gender: gender || "Bé",
        dateOfBirth: dateOfBirth || "",
        address: address || "",
        hobbies: hobbies || "",
        parentName: parentName || "",
        parentPhone: parentPhone || "",
        notes: notes || "",
      },
    });

    return NextResponse.json({ success: true, student });
  } catch (error: any) {
    console.error("POST /api/classes DB Error:", error);
    return NextResponse.json({ success: false, error: "Không thể thêm bé mới." }, { status: 500 });
  }
}
