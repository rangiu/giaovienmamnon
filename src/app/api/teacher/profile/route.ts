import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireActiveUser } from "@/lib/auth";

// Route này đọc/ghi dữ liệu từ database — bắt buộc phải chạy động (dynamic)
// mỗi request, nếu không Next.js sẽ coi là route tĩnh và chỉ chạy đúng 1 lần
// lúc build, "đóng băng" vĩnh viễn dữ liệu hồ sơ giáo viên ở bản build đó.
export const dynamic = "force-dynamic";

export async function GET() {
  const ctx = await requireActiveUser();
  if (ctx instanceof NextResponse) return ctx;
  const { teacher, user } = ctx;

  return NextResponse.json({
    success: true,
    teacher: { ...teacher, user: { name: user.name, email: user.email } },
  });
}

export async function PUT(request: Request) {
  const ctx = await requireActiveUser();
  if (ctx instanceof NextResponse) return ctx;
  const { teacher } = ctx;

  try {
    const body = await request.json();
    const { schoolName, className, ageGroup, studentCount, currentTopic, teachingStyle, phone } = body;

    // Dùng Number.isFinite thay vì `|| fallback` — nếu giáo viên cố tình
    // nhập 0, phải LƯU ĐÚNG 0, không được âm thầm đổi lại thành số giả.
    const parsedStudentCount = Number(studentCount);
    const safeStudentCount = Number.isFinite(parsedStudentCount) ? parsedStudentCount : 0;

    // Luôn cập nhật đúng hồ sơ của CHÍNH user đang đăng nhập (teacher.id lấy
    // từ session, không tin id do client gửi lên) — tránh user A sửa được
    // hồ sơ của user B bằng cách tự đổi id trong request.
    const updated = await prisma.teacher.update({
      where: { id: teacher.id },
      data: {
        schoolName,
        className,
        ageGroup,
        studentCount: safeStudentCount,
        currentTopic,
        teachingStyle,
        phone: typeof phone === "string" ? phone.trim() : undefined,
      },
    });

    return NextResponse.json({ success: true, teacher: updated });
  } catch (error: any) {
    console.error("PUT /api/teacher/profile DB Error:", error);
    return NextResponse.json({ success: false, error: "Không thể cập nhật hồ sơ." }, { status: 500 });
  }
}
