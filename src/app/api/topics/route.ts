import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const teacher = await prisma.teacher.findFirst();
    if (!teacher) {
      return NextResponse.json({ success: true, topics: [] });
    }

    const currentClass = await prisma.class.findFirst({
      where: { teacherId: teacher.id },
    });

    if (!currentClass) {
      return NextResponse.json({ success: true, topics: [] });
    }

    const topics = await prisma.topic.findMany({
      where: { classId: currentClass.id },
      include: {
        topicObjectives: {
          include: { objective: true },
          orderBy: { orderIndex: "asc" },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ success: true, topics });
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
    const { name, ageGroup = "4–5 tuổi", startDate, endDate, objectiveIds } = body;

    if (!name) {
      return NextResponse.json(
        { success: false, error: "Cô vui lòng nhập tên chủ đề nhé!" },
        { status: 400 }
      );
    }

    const teacher = await prisma.teacher.findFirst();
    const currentClass = await prisma.class.findFirst({
      where: { teacherId: teacher?.id },
    });

    if (!currentClass) {
      return NextResponse.json(
        { success: false, error: "Không tìm thấy lớp học." },
        { status: 404 }
      );
    }

    const newTopic = await prisma.topic.create({
      data: {
        classId: currentClass.id,
        name,
        ageGroup,
        startDate: startDate ? new Date(startDate) : new Date(),
        endDate: endDate ? new Date(endDate) : new Date(Date.now() + 25 * 86400000),
        status: "ACTIVE",
      },
    });

    // Link selected objectives or default all objectives
    let objsToLink = objectiveIds;
    if (!objsToLink || objsToLink.length === 0) {
      const allObjs = await prisma.assessmentObjective.findMany({
        take: 10,
      });
      objsToLink = allObjs.map((o) => o.id);
    }

    for (let i = 0; i < objsToLink.length; i++) {
      await prisma.topicObjective.create({
        data: {
          topicId: newTopic.id,
          objectiveId: objsToLink[i],
          orderIndex: i + 1,
        },
      });
    }

    // Auto-create initial ratings for all current students
    const students = await prisma.student.findMany({
      where: { classId: currentClass.id },
    });

    for (const st of students) {
      for (const objId of objsToLink) {
        await prisma.studentTopicResult.create({
          data: {
            topicId: newTopic.id,
            studentId: st.id,
            objectiveId: objId,
            rating: "+",
          },
        });
      }
    }

    return NextResponse.json({ success: true, topic: newTopic });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
