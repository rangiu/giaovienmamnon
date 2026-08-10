import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const lesson = await prisma.lesson.findUnique({
      where: { id: params.id },
    });

    if (!lesson) {
      return NextResponse.json(
        { success: false, error: "Không tìm thấy giáo án" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, lesson });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const {
      title,
      ageGroup,
      duration,
      topic,
      objectives,
      preparation,
      teacherActivities,
      childActivities,
      openQuestions,
      reinforcementGame,
      conclusion,
      assessment,
      extension,
      isFavorite,
    } = body;

    const updated = await prisma.lesson.update({
      where: { id: params.id },
      data: {
        title,
        ageGroup,
        duration,
        topic,
        objectives: typeof objectives === "string" ? objectives : JSON.stringify(objectives),
        preparation: typeof preparation === "string" ? preparation : JSON.stringify(preparation),
        teacherActivities: typeof teacherActivities === "string" ? teacherActivities : JSON.stringify(teacherActivities),
        childActivities: typeof childActivities === "string" ? childActivities : JSON.stringify(childActivities),
        openQuestions: typeof openQuestions === "string" ? openQuestions : JSON.stringify(openQuestions),
        reinforcementGame: typeof reinforcementGame === "string" ? reinforcementGame : JSON.stringify(reinforcementGame),
        conclusion,
        assessment,
        extension,
        isFavorite: isFavorite !== undefined ? Boolean(isFavorite) : undefined,
      },
    });

    return NextResponse.json({ success: true, lesson: updated });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    await prisma.lesson.delete({
      where: { id: params.id },
    });
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
