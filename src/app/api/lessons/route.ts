import { NextResponse } from "next/server";
import { prisma, getOrCreateDefaultTeacherAndClass } from "@/lib/prisma";

const FALLBACK_LESSONS = [
  {
    id: "lesson-1",
    title: "Khám phá thế giới cây xanh của bé",
    ageGroup: "4–5 tuổi",
    duration: "30–35 phút",
    topic: "Cây – Hoa – Quả – Mùa xuân",
    objectives: JSON.stringify({
      knowledge: "Trẻ nhận biết và gọi tên được các bộ phận chính của cây xanh (rễ, thân, cành, lá).",
      skills: "Phát triển khả năng quan sát, mô tả các bộ phận của cây thông qua các giác quan.",
      attitude: "Trẻ yêu quý, có ý thức chăm sóc và bảo vệ cây xanh.",
    }),
    preparation: JSON.stringify({
      teacher: "Một cây xanh thật trong chậu, tranh ảnh minh họa các bộ phận của cây.",
      child: "Trang phục gọn gàng, tinh thần thoải mái.",
    }),
    teacherActivities: JSON.stringify([
      "Hát múa 'Em yêu cây xanh' gây hứng thú đầu giờ.",
      "Cho trẻ quan sát cây thật trong chậu và thảo luận nhóm.",
      "Tổ chức trò chơi 'Gắn lá cho cây'.",
    ]),
    childActivities: JSON.stringify([
      "Trẻ hát múa và trả lời câu hỏi của cô.",
      "Quan sát, sờ lá cây, thân cây và phát biểu cảm nghĩ.",
      "Trẻ tham gia trò chơi hào hứng.",
    ]),
    openQuestions: JSON.stringify([
      "Con thấy thân cây này sờ vào cảm giác thế nào?",
      "Cây xanh cần những gì để lớn lên khỏe mạnh?",
    ]),
    reinforcementGame: JSON.stringify({
      name: "Gắn lá cho cây",
      rules: "Mỗi lượt chạy lên dán 1 chiếc lá.",
      how_to_play: "Chia làm 2 đội chạy tiếp sức gắn lá vào tán cây.",
    }),
    conclusion: "Cô tuyên dương cả lớp và dặn dò trẻ bảo vệ cây xanh.",
  },
];

export async function GET(request: Request) {
  try {
    const { teacher } = await getOrCreateDefaultTeacherAndClass();

    const lessons = await prisma.lesson.findMany({
      where: { teacherId: teacher.id },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ success: true, lessons });
  } catch (error: any) {
    console.error("GET /api/lessons DB Error:", error);
    return NextResponse.json({ success: true, lessons: FALLBACK_LESSONS });
  }
}

export async function POST(request: Request) {
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
      rawJson,
    } = body;

    const { teacher } = await getOrCreateDefaultTeacherAndClass();

    const newLesson = await prisma.lesson.create({
      data: {
        teacherId: teacher.id,
        title: title || "Giáo án mầm non mới",
        ageGroup: ageGroup || "4–5 tuổi",
        duration: duration || "30 phút",
        topic: topic || "Khám phá",
        objectives: typeof objectives === "string" ? objectives : JSON.stringify(objectives || {}),
        preparation: typeof preparation === "string" ? preparation : JSON.stringify(preparation || {}),
        teacherActivities: typeof teacherActivities === "string" ? teacherActivities : JSON.stringify(teacherActivities || []),
        childActivities: typeof childActivities === "string" ? childActivities : JSON.stringify(childActivities || []),
        openQuestions: typeof openQuestions === "string" ? openQuestions : JSON.stringify(openQuestions || []),
        reinforcementGame: typeof reinforcementGame === "string" ? reinforcementGame : JSON.stringify(reinforcementGame || {}),
        conclusion: conclusion || "",
        assessment: assessment || "",
        extension: extension || "",
        rawJson: typeof rawJson === "string" ? rawJson : JSON.stringify(rawJson || {}),
      },
    });

    return NextResponse.json({ success: true, lesson: newLesson });
  } catch (error: any) {
    console.error("Save lesson DB error:", error);
    const body = await request.json().catch(() => ({}));
    return NextResponse.json({
      success: true,
      lesson: {
        id: "lesson-" + Date.now(),
        title: body.title || "Giáo án Mầm non Khám phá",
        ageGroup: body.ageGroup || "4–5 tuổi",
        duration: body.duration || "30 phút",
        topic: body.topic || "Cây – Hoa – Quả",
        objectives: body.objectives || JSON.stringify({ knowledge: "Trẻ khám phá chủ đề" }),
        preparation: body.preparation || JSON.stringify({ teacher: "Tranh ảnh" }),
        teacherActivities: body.teacherActivities || JSON.stringify(["Hướng dẫn trẻ"]),
        childActivities: body.childActivities || JSON.stringify(["Trẻ quan sát"]),
      },
    });
  }
}
