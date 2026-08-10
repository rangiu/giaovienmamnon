import { Teacher, Class, Student, Observation } from "@prisma/client";

export interface ContextOptions {
  teacher?: Teacher | null;
  activeClass?: Class | null;
  student?: Student & { observations?: Observation[] } | null;
  extraPrompt?: string;
}

export function buildTeacherContext(teacher?: Teacher | null): string {
  if (!teacher) return "";
  return `
[THÔNG TIN GIÁO VIÊN VÀ LỚP HỌC HẠN ĐỊNH]
- Giáo viên: Cô Lan
- Trường: ${teacher.schoolName || "Trường Mầm Non"}
- Lớp: ${teacher.className || "Mầm 1"}
- Độ tuổi hiện tại của lớp: ${teacher.ageGroup || "4–5 tuổi"}
- Sĩ số lớp: ${teacher.studentCount || 28} trẻ
- Chủ đề đang học: ${teacher.currentTopic || "Chưa xác định"}
- Phong cách dạy: ${teacher.teachingStyle || "Lấy trẻ làm trung tâm, học qua chơi"}
`.trim();
}

export function buildStudentContext(student?: (Student & { observations?: Observation[] }) | null): string {
  if (!student) return "";
  let obsText = "Chưa có ghi chú quan sát gần đây.";
  if (student.observations && student.observations.length > 0) {
    obsText = student.observations
      .slice(0, 5)
      .map(
        (o) =>
          `- Ngày ${new Date(o.date).toLocaleDateString("vi-VN")}: [${o.category || "Quan sát"}] ${o.content}`
      )
      .join("\n");
  }

  return `
[THÔNG TIN HỌC SINH TỰ CHỌN]
- Tên trẻ: ${student.name}
- Giới tính: ${student.gender || "Bé"}
- Ghi chú chung: ${student.notes || "Không có"}
- Lịch sử nhật ký quan sát gần nhất:
${obsText}
`.trim();
}

export function buildFullPromptContext(
  userPrompt: string,
  options: ContextOptions
): string {
  const parts: string[] = [];

  const teacherCtx = buildTeacherContext(options.teacher);
  if (teacherCtx) parts.push(teacherCtx);

  const studentCtx = buildStudentContext(options.student);
  if (studentCtx) parts.push(studentCtx);

  if (options.extraPrompt) {
    parts.push(`[HƯỚNG DẪN BỔ SUNG]\n${options.extraPrompt}`);
  }

  parts.push(`[YÊU CẦU CỦA GIÁO VIÊN]\n${userPrompt}`);

  return parts.join("\n\n");
}
