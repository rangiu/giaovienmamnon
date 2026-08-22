import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireActiveUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET() {
  const ctx = await requireActiveUser();
  if (ctx instanceof NextResponse) return ctx;
  const { currentClass } = ctx;

  try {
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
    console.error("GET /api/topics DB Error:", error);
    return NextResponse.json({ success: false, error: "Không thể tải danh sách chủ đề." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const ctx = await requireActiveUser();
  if (ctx instanceof NextResponse) return ctx;
  const { currentClass } = ctx;

  try {
    const body = await request.json();
    const { name, ageGroup = "4–5 tuổi", startDate, endDate, objectiveIds } = body;

    if (!name) {
      return NextResponse.json(
        { success: false, error: "Cô vui lòng nhập tên chủ đề nhé!" },
        { status: 400 }
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

    // Liên kết mục tiêu đánh giá đã chọn vào chủ đề — trước đây body nhận
    // objectiveIds nhưng không hề dùng, khiến chủ đề luôn tạo ra không có
    // cột mục tiêu nào để chấm.
    if (Array.isArray(objectiveIds) && objectiveIds.length > 0) {
      const validObjectives = await prisma.assessmentObjective.findMany({
        where: { id: { in: objectiveIds }, isActive: true },
        select: { id: true },
      });
      await prisma.topicObjective.createMany({
        data: validObjectives.map((o, idx) => ({
          topicId: newTopic.id,
          objectiveId: o.id,
          orderIndex: idx + 1,
        })),
      });
    }

    return NextResponse.json({ success: true, topic: newTopic });
  } catch (error: any) {
    console.error("POST /api/topics DB Error:", error);
    return NextResponse.json({ success: false, error: "Không thể tạo chủ đề mới." }, { status: 500 });
  }
}
