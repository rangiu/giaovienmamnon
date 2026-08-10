import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const teacher = await prisma.teacher.findFirst();
    if (!teacher) {
      return NextResponse.json({ success: true, classes: [] });
    }

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
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { classId, name, gender, dateOfBirth, notes } = body;

    if (!classId || !name) {
      return NextResponse.json(
        { success: false, error: "Vui lòng nhập tên bé và chọn lớp học." },
        { status: 400 }
      );
    }

    const student = await prisma.student.create({
      data: {
        classId,
        name,
        gender: gender || "Bé",
        dateOfBirth: dateOfBirth || "",
        notes: notes || "",
      },
    });

    return NextResponse.json({ success: true, student });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
