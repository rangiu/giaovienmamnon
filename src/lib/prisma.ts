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
 * Đảm bảo user đã đăng nhập có sẵn hồ sơ Teacher & Class riêng (tạo mới nếu
 * đây là lần đầu vào hệ thống sau khi đăng ký). Mỗi tài khoản có dữ liệu
 * độc lập — KHÔNG dùng chung 1 teacher mặc định giữa mọi người dùng nữa.
 */
export async function getOrCreateTeacherAndClassForUser(userId: string) {
  // QUAN TRỌNG: luôn sắp `classes` theo createdAt tăng dần (lớp tạo sớm
  // nhất luôn đứng đầu) — trước đây không có orderBy, Postgres không đảm
  // bảo thứ tự trả về ổn định giữa các lần query khác nhau. Nhiều request
  // tải trang cùng lúc (Navbar/Sidebar/trang chủ đều tự gọi API riêng) có
  // thể khiến `classes[0]` đổi giữa các lần gọi nếu thứ tự không cố định,
  // khiến "Sổ đánh giá sau chủ đề" (Topic) đang lọc theo classId có lúc
  // trỏ nhầm lớp khác → nhìn như dữ liệu/sổ cũ "biến mất" dù vẫn còn nguyên
  // trong DB.
  let teacher = await prisma.teacher.findUnique({
    where: { userId },
    include: { classes: { orderBy: { createdAt: "asc" } } },
  });

  if (!teacher) {
    // Tài khoản mới bắt đầu với dữ liệu TRỐNG THẬT (sĩ số 0, chưa có chủ
    // đề) — không gán số/tên lớp mẫu giả vờ như đã có sẵn 28 học sinh.
    // Giáo viên tự điền thông tin thật ở trang Cài đặt.
    teacher = await prisma.teacher.create({
      data: {
        userId,
        schoolName: "",
        className: "Lớp của tôi",
        ageGroup: "4–5 tuổi",
        studentCount: 0,
        currentTopic: "",
        teachingStyle: "",
      },
      include: { classes: { orderBy: { createdAt: "asc" } } },
    });
  }

  let currentClass = teacher.classes && teacher.classes.length > 0 ? teacher.classes[0] : null;

  if (!currentClass) {
    // Nhiều request đầu tiên (Navbar, Sidebar, trang chủ...) có thể cùng
    // lúc thấy "chưa có lớp" và cùng tạo — dùng create() bọc try/catch,
    // nếu đụng race thì đọc lại lớp đã có thay vì tạo trùng thêm 1 lớp rác.
    try {
      currentClass = await prisma.class.create({
        data: {
          teacherId: teacher.id,
          name: teacher.className || "Lớp Mầm 1",
          ageGroup: teacher.ageGroup || "4–5 tuổi",
          schoolYear: "2025-2026",
        },
      });
    } catch (err) {
      currentClass = await prisma.class.findFirst({
        where: { teacherId: teacher.id },
        orderBy: { createdAt: "asc" },
      });
      if (!currentClass) throw err;
    }
  }

  return { teacher, currentClass };
}
