import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    let teacher = await prisma.teacher.findFirst({
      include: {
        user: true,
        classes: {
          include: {
            students: {
              include: {
                observations: {
                  orderBy: { date: "desc" },
                },
              },
            },
          },
        },
      },
    });

    if (!teacher) {
      // Fallback auto seed if needed
      const user = await prisma.user.create({
        data: {
          email: "colan@mamnon.edu.vn",
          name: "Cô Nguyễn Thị Lan",
          role: "teacher",
          teacher: {
            create: {
              schoolName: "Trường Mầm Non Họa Mi",
              className: "Lớp Mầm 1",
              ageGroup: "4–5 tuổi",
              studentCount: 28,
              currentTopic: "Thế giới động vật",
            },
          },
        },
        include: { teacher: true },
      });
      teacher = await prisma.teacher.findUnique({
        where: { id: user.teacher!.id },
        include: {
          user: true,
          classes: {
            include: {
              students: {
                include: { observations: true },
              },
            },
          },
        },
      });
    }

    return NextResponse.json({ success: true, teacher });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { id, schoolName, className, ageGroup, studentCount, currentTopic, teachingStyle } = body;

    const updated = await prisma.teacher.update({
      where: { id },
      data: {
        schoolName,
        className,
        ageGroup,
        studentCount: Number(studentCount) || 28,
        currentTopic,
        teachingStyle,
      },
    });

    return NextResponse.json({ success: true, teacher: updated });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
