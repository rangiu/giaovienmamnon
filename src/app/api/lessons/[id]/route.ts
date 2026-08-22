import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireActiveUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await requireActiveUser();
  if (ctx instanceof NextResponse) return ctx;
  const { teacher } = ctx;
  const { id } = await params;

  try {
    const lesson = await prisma.lesson.findFirst({ where: { id, teacherId: teacher.id } });
    if (!lesson) {
      return NextResponse.json({ success: false, error: "Không tìm thấy giáo án" }, { status: 404 });
    }
    return NextResponse.json({ success: true, lesson });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await requireActiveUser();
  if (ctx instanceof NextResponse) return ctx;
  const { teacher } = ctx;
  const { id } = await params;

  try {
    const existing = await prisma.lesson.findFirst({ where: { id, teacherId: teacher.id } });
    if (!existing) {
      return NextResponse.json({ success: false, error: "Không tìm thấy giáo án" }, { status: 404 });
    }

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
      where: { id },
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
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await requireActiveUser();
  if (ctx instanceof NextResponse) return ctx;
  const { teacher } = ctx;
  const { id } = await params;

  try {
    const existing = await prisma.lesson.findFirst({ where: { id, teacherId: teacher.id } });
    if (!existing) {
      return NextResponse.json({ success: false, error: "Không tìm thấy giáo án" }, { status: 404 });
    }
    await prisma.lesson.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
