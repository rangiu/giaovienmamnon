import fs from "node:fs/promises";
import path from "node:path";

/**
 * Thư mục gốc lưu file video/asset TRUNG GIAN sinh ra lúc runtime — KHÔNG
 * phải public/ (được đóng gói cứng vào image Docker lúc build, không ghi
 * được ở runtime và không phù hợp để chứa nội dung do người dùng tạo ra).
 * Production trỏ vào named volume mount ở docker-compose.yml
 * (VIDEO_STORAGE_DIR=/app/storage/videos); local dev fallback về thư mục
 * .video-storage trong repo (đã có trong .gitignore).
 */
export function getStorageRoot(): string {
  return process.env.VIDEO_STORAGE_DIR || path.resolve(process.cwd(), ".video-storage");
}

export function getJobDir(jobId: string): string {
  return path.join(getStorageRoot(), "jobs", jobId);
}

export function getJobAssetsDir(jobId: string): string {
  return path.join(getJobDir(jobId), "assets");
}

export function getJobScenesDir(jobId: string): string {
  return path.join(getJobDir(jobId), "scenes");
}

export function getJobFinalPath(jobId: string): string {
  return path.join(getJobDir(jobId), "final.mp4");
}

/** Đường dẫn TƯƠNG ĐỐI (so với storage root) — lưu vào DB thay vì đường dẫn tuyệt đối. */
export function toRelativePath(absolutePath: string): string {
  return path.relative(getStorageRoot(), absolutePath).split(path.sep).join("/");
}

export function toAbsolutePath(relativePath: string): string {
  return path.join(getStorageRoot(), relativePath);
}

export async function ensureDir(dirPath: string): Promise<void> {
  await fs.mkdir(dirPath, { recursive: true });
}

/** Xoá thư mục asset/scene trung gian sau khi job COMPLETED — chỉ giữ final.mp4. */
export async function cleanupIntermediateFiles(jobId: string): Promise<void> {
  await Promise.all([
    fs.rm(getJobAssetsDir(jobId), { recursive: true, force: true }),
    fs.rm(getJobScenesDir(jobId), { recursive: true, force: true }),
  ]);
}

export async function cleanupJobDir(jobId: string): Promise<void> {
  await fs.rm(getJobDir(jobId), { recursive: true, force: true });
}
