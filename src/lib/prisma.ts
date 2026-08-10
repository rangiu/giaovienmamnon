import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

/**
 * Auto-ensures default Teacher & Class exist in database
 */
export async function getOrCreateDefaultTeacherAndClass() {
  let teacher = await prisma.teacher.findFirst({
    include: { classes: true },
  });

  if (!teacher) {
    let user = await prisma.user.findFirst({
      where: { email: "colan@mamnon.edu.vn" },
    });

    if (!user) {
      user = await prisma.user.create({
        data: {
          email: "colan@mamnon.edu.vn",
          name: "Cô Nguyễn Thị Lan",
          role: "teacher",
        },
      });
    }

    teacher = await prisma.teacher.create({
      data: {
        userId: user.id,
        schoolName: "Trường Mầm Non Họa Mi",
        className: "Lớp Mầm 1",
        ageGroup: "4–5 tuổi",
        studentCount: 28,
        currentTopic: "Cây – Hoa – Quả – Mùa xuân",
        teachingStyle: "Học qua chơi, lấy trẻ làm trung tâm",
      },
      include: { classes: true },
    });
  }

  let currentClass = teacher.classes && teacher.classes.length > 0 ? teacher.classes[0] : null;

  if (!currentClass) {
    currentClass = await prisma.class.create({
      data: {
        teacherId: teacher.id,
        name: teacher.className || "Lớp Mầm 1",
        ageGroup: teacher.ageGroup || "4–5 tuổi",
        schoolYear: "2025-2026",
      },
    });
  }

  return { teacher, currentClass };
}
