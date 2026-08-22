import { spawn } from "node:child_process";
import fs from "node:fs/promises";

/**
 * Thao tác ffmpeg dùng chung cho pipeline video: nối clip Veo (4-8 giây/clip)
 * + ghép narration audio (KHÔNG re-encode video khi có thể — stream copy,
 * hạn chế CPU trên VPS chia sẻ), và trích khung hình đại diện cho
 * videoQualityCheck.ts (Tier Hybrid). Đây là lần đầu tiên repo này gọi
 * child_process — không có tiền lệ nào để tái dùng, nên `runFfmpeg` export
 * ra để các module khác tái dùng thay vì tự viết lại boilerplate spawn.
 */

export function runFfmpeg(args: string[]): Promise<void> {
  return new Promise((resolve, reject) => {
    const proc = spawn("ffmpeg", ["-y", ...args], { stdio: ["ignore", "ignore", "pipe"] });
    let stderrTail = "";
    proc.stderr.on("data", (chunk) => {
      stderrTail = (stderrTail + chunk.toString()).slice(-2000);
    });
    proc.on("error", reject);
    proc.on("close", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`ffmpeg thoát với mã ${code}: ${stderrTail}`));
    });
  });
}

/**
 * Ghép narration audio vào 1 clip Veo — mix với audio gốc của Veo (âm
 * thanh nền/hiệu ứng Veo tự sinh, nếu có) thay vì thay hẳn, video giữ
 * NGUYÊN (-c:v copy, không re-encode — nhanh, ít CPU). Không có audioPath
 * thì chỉ copy nguyên clip.
 */
export async function muxNarrationIntoClip(clipPath: string, audioPath: string | undefined, outputPath: string): Promise<void> {
  if (!audioPath) {
    await fs.copyFile(clipPath, outputPath);
    return;
  }
  await runFfmpeg([
    "-i", clipPath,
    "-i", audioPath,
    "-filter_complex",
    "[0:a]volume=0.35[a0];[1:a]volume=1.0[a1];[a0][a1]amix=inputs=2:duration=longest:dropout_transition=0[aout]",
    "-map", "0:v",
    "-map", "[aout]",
    "-c:v", "copy",
    "-c:a", "aac",
    "-threads", "1",
    outputPath,
  ]);
}

/** Nối nhiều clip CÙNG codec (đều từ Veo, cùng tham số) bằng concat demuxer — stream copy, không re-encode. */
export async function concatClips(clipPaths: string[], outputPath: string): Promise<void> {
  const listPath = `${outputPath}.concat.txt`;
  const listContent = clipPaths.map((p) => `file '${p.replace(/'/g, "'\\''")}'`).join("\n");
  await fs.writeFile(listPath, listContent, "utf8");
  try {
    await runFfmpeg(["-f", "concat", "-safe", "0", "-i", listPath, "-c", "copy", outputPath]);
  } finally {
    await fs.rm(listPath, { force: true });
  }
}
