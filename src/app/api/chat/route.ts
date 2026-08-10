import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { chatWithCoAi } from "@/lib/ai/aiEngine";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { prompt, conversationId, studentId } = body;

    if (!prompt || typeof prompt !== "string" || prompt.trim() === "") {
      return NextResponse.json(
        { success: false, error: "Cô vui lòng nhập câu hỏi hoặc yêu cầu nhé!" },
        { status: 400 }
      );
    }

    // Get default teacher demo
    const teacher = await prisma.teacher.findFirst({
      include: { classes: true },
    });

    let currentConversation = null;
    let history: { role: "user" | "assistant"; content: string }[] = [];

    if (conversationId) {
      currentConversation = await prisma.conversation.findUnique({
        where: { id: conversationId },
        include: {
          messages: {
            orderBy: { createdAt: "asc" },
            take: 20, // Keep context window efficient
          },
        },
      });

      if (currentConversation) {
        history = currentConversation.messages.map((m) => ({
          role: m.role as "user" | "assistant",
          content: m.content,
        }));
      }
    }

    // If no conversation yet, create new conversation
    if (!currentConversation && teacher) {
      const firstLine = prompt.slice(0, 30) + (prompt.length > 30 ? "..." : "");
      currentConversation = await prisma.conversation.create({
        data: {
          teacherId: teacher.id,
          title: firstLine,
        },
      });
    }

    // Optional student context if studentId is passed
    let studentWithObs = null;
    if (studentId) {
      studentWithObs = await prisma.student.findUnique({
        where: { id: studentId },
        include: {
          observations: {
            orderBy: { date: "desc" },
            take: 5,
          },
        },
      });
    }

    // Call AI Engine
    const result = await chatWithCoAi(
      prompt,
      history,
      {
        teacher,
        activeClass: teacher?.classes[0] || null,
        student: studentWithObs,
      },
      teacher?.userId
    );

    // Save messages in Database
    if (currentConversation) {
      await prisma.message.create({
        data: {
          conversationId: currentConversation.id,
          role: "user",
          content: prompt,
        },
      });

      await prisma.message.create({
        data: {
          conversationId: currentConversation.id,
          role: "assistant",
          content: result.text,
          structuredData: result.structuredData
            ? JSON.stringify(result.structuredData)
            : null,
        },
      });

      // Update conversation timestamp
      await prisma.conversation.update({
        where: { id: currentConversation.id },
        data: { updatedAt: new Date() },
      });
    }

    return NextResponse.json({
      success: true,
      conversationId: currentConversation?.id,
      text: result.text,
      structuredData: result.structuredData,
      error: result.error,
    });
  } catch (error: any) {
    console.error("Chat API error:", error);
    return NextResponse.json(
      {
        success: false,
        text: "Cô ơi, AI gặp sự cố kết nối nhỏ. Cô bấm thử lại giúp em nhé!",
        error: error.message,
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const teacher = await prisma.teacher.findFirst();
    if (!teacher) {
      return NextResponse.json({ success: true, conversations: [] });
    }

    const conversations = await prisma.conversation.findMany({
      where: { teacherId: teacher.id },
      include: {
        messages: {
          orderBy: { createdAt: "asc" },
        },
      },
      orderBy: { updatedAt: "desc" },
    });

    return NextResponse.json({ success: true, conversations });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
