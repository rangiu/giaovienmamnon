/**
 * Định dạng ngày sinh để hiển thị. Trường "dateOfBirth" lưu ở DB dạng
 * chuỗi tự do — dữ liệu MỚI (nhập qua <input type="date">) sẽ ở dạng ISO
 * "YYYY-MM-DD", tự động đổi sang "DD/MM/YYYY" quen thuộc với giáo viên VN.
 * Dữ liệu CŨ (nhập tay trước đây, có thể không đúng chuẩn ISO) hiển thị
 * nguyên văn, không cố ép định dạng để tránh hiện sai ngày.
 */
export function formatDob(dob?: string | null): string {
  if (!dob) return "";
  const isoMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dob);
  if (isoMatch) {
    const [, y, m, d] = isoMatch;
    return `${d}/${m}/${y}`;
  }
  return dob;
}

/** Chuyển "DD/MM/YYYY" (dữ liệu cũ) sang "YYYY-MM-DD" để đổ vào <input type="date">. */
export function toIsoDateInputValue(dob?: string | null): string {
  if (!dob) return "";
  if (/^\d{4}-\d{2}-\d{2}$/.test(dob)) return dob;
  const match = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(dob);
  if (match) {
    const [, d, m, y] = match;
    return `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
  }
  return "";
}
