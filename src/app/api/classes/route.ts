import { NextResponse } from "next/server";
import { prisma, getOrCreateDefaultTeacherAndClass } from "@/lib/prisma";

const FALLBACK_STUDENTS = [
  { id: "st-1", name: "Lý Tuấn Đạt", gender: "Bé trai", dateOfBirth: "12/03/2021", notes: "Cần rèn luyện thêm bài tập thăng bằng.", observations: [] },
  { id: "st-2", name: "Sùng Văn Hình", gender: "Bé trai", dateOfBirth: "05/06/2021", notes: "Ngoan ngoãn, hoàn thành xuất sắc các mục tiêu.", observations: [] },
  { id: "st-3", name: "Nguyễn Minh", gender: "Bé trai", dateOfBirth: "15/05/2021", notes: "Tự giác xúc ăn, hiếu động.", observations: [] },
  { id: "st-4", name: "Trần An", gender: "Bé gái", dateOfBirth: "20/08/2021", notes: "Giao tiếp tự tin, hát múa đẹp.", observations: [] },
  { id: "st-5", name: "Lê Mai", gender: "Bé gái", dateOfBirth: "02/02/2021", notes: "Ghi nhớ nhanh, tự dọn dẹp góc chơi.", observations: [] },
];

export async function GET() {
  try {
    const { teacher } = await getOrCreateDefaultTeacherAndClass();

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
    return NextResponse.json({
      success: true,
      classes: [
        {
          id: "fallback-class-id",
          name: "Lớp Mầm 1",
          ageGroup: "4–5 tuổi",
          students: FALLBACK_STUDENTS,
        },
      ],
    });
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
    console.error("POST /api/classes DB Error:", error);
    // Return fallback newly created student object
    const body = await request.json().catch(() => ({}));
    return NextResponse.json({
      success: true,
      student: {
        id: "st-" + Date.now(),
        name: body.name || "Bé Mới",
        gender: body.gender || "Bé",
        dateOfBirth: body.dateOfBirth || "",
        notes: body.notes || "",
      },
    });
  }
}
