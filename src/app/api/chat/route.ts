import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireActiveUser } from "@/lib/auth";
import { chatWithCoAi } from "@/lib/ai/aiEngine";
import type { AiTier } from "@/lib/ai/aiProvider";
import { getFreeChatLimitPerDay } from "@/lib/settings";

export const dynamic = "force-dynamic";

// Chỉ lưu tối đa 10 cuộc trò chuyện gần nhất/giáo viên — mỗi khi tạo cuộc
// trò chuyện MỚI thứ 11 trở lên, tự xoá cuộc cũ nhất (ít hoạt động gần đây
// nhất) để tối ưu dung lượng DB, cô không cần tự dọn tay.
const MAX_CONVERSATIONS_PER_TEACHER = 10;

async function pruneOldConversations(teacherId: string) {
  const conversations = await prisma.conversation.findMany({
    where: { teacherId },
    orderBy: { updatedAt: "desc" },
    select: { id: true },
  });
  if (conversations.length > MAX_CONVERSATIONS_PER_TEACHER) {
    const idsToDelete = conversations.slice(MAX_CONVERSATIONS_PER_TEACHER).map((c) => c.id);
    await prisma.conversation.deleteMany({ where: { id: { in: idsToDelete } } });
  }
}

export async function POST(request: Request) {
  const ctx = await requireActiveUser();
  if (ctx instanceof NextResponse) return ctx;
  const { teacher, user, access } = ctx;

  try {
    // Tài khoản FREE/EXPIRED (chưa/không còn trả phí) vẫn được dùng Chat cơ
    // bản, nhưng giới hạn số lượt/NGÀY (chỉnh được ở trang Admin) để khuyến
    // khích nâng cấp gói. TRIALING/ACTIVE/ADMIN (tier FULL) không giới hạn.
    if (access.tier !== "FULL") {
      const dailyLimit = await getFreeChatLimitPerDay();
      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const usedToday = await prisma.aiUsage.count({
        where: { userId: user.id, feature: "chat", createdAt: { gte: oneDayAgo } },
      });
      if (usedToday >= dailyLimit) {
        return NextResponse.json(
          {
            success: false,
            code: "CHAT_LIMIT_REACHED",
            error: `Cô đã dùng hết ${dailyLimit} lượt chat miễn phí trong ngày hôm nay. Vui lòng thử lại vào ngày mai hoặc nâng cấp gói để chat không giới hạn nhé!`,
          },
          { status: 429 }
        );
      }
    }

    const body = await request.json();
    const { prompt, conversationId, studentId } = body;

    if (!prompt || typeof prompt !== "string" || prompt.trim() === "") {
      return NextResponse.json(
        { success: false, error: "Cô vui lòng nhập câu hỏi hoặc yêu cầu nhé!" },
        { status: 400 }
      );
    }

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
      // Vừa thêm 1 cuộc trò chuyện mới — dọn bớt cuộc cũ nhất nếu vượt quá
      // giới hạn 10. Chỉ cần chạy ở đây (lúc TẠO MỚI), vì tiếp tục chat
      // trong 1 cuộc trò chuyện có sẵn không làm tăng tổng số cuộc.
      await pruneOldConversations(teacher.id);
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
      teacher?.userId,
      // FREE/hết hạn -> Gemini free; đã trả phí -> DeepSeek (xem aiProvider.ts).
      // requireActiveUser() đã chặn access.allowed=false (BLOCKED) ở trên
      // trước khi trả ctx, nên ở đây tier chỉ còn có thể là FULL/LIMITED.
      access.tier as AiTier
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
  const ctx = await requireActiveUser();
  if (ctx instanceof NextResponse) return ctx;
  const { teacher } = ctx;

  try {
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
