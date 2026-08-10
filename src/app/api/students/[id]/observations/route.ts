import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const { content, category } = body;

    if (!content || typeof content !== "string" || content.trim() === "") {
      return NextResponse.json(
        { success: false, error: "Cô vui lòng nhập nội dung quan sát bé nhé!" },
        { status: 400 }
      );
    }

    const observation = await prisma.observation.create({
      data: {
        studentId: params.id,
        content: content.trim(),
        category: category || "Chung",
        createdBy: "Cô Lan",
        date: new Date(),
      },
    });

    return NextResponse.json({ success: true, observation });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
