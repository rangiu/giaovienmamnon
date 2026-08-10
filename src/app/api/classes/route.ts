import { NextResponse } from "next/server";
import { prisma, getOrCreateDefaultTeacherAndClass } from "@/lib/prisma";

export async function GET() {
  try {
    const { teacher, currentClass } = await getOrCreateDefaultTeacherAndClass();

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

    if (!name || name.trim() === "") {
      return NextResponse.json(
        { success: false, error: "Vui lòng nhập tên bé." },
        { status: 400 }
      );
    }

    const { currentClass } = await getOrCreateDefaultTeacherAndClass();
    const targetClassId = classId || currentClass.id;

    const student = await prisma.student.create({
      data: {
        classId: targetClassId,
        name: name.trim(),
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
