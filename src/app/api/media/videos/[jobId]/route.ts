import { NextResponse } from "next/server";
import fs from "node:fs";
import { Readable } from "node:stream";
import { prisma } from "@/lib/prisma";
import { requireActiveUser } from "@/lib/auth";
import { toAbsolutePath } from "@/lib/media/storage";

export const dynamic = "force-dynamic";

/**
 * Phát video AI đã tạo xong — route xác thực RIÊNG (KHÔNG phải static file
 * qua public/, vì public/ bị đóng cứng vào image Docker lúc build, không
 * chứa được nội dung sinh ra lúc runtime). Hỗ trợ HTTP Range (206 partial
 * content) — bắt buộc để thẻ <video> tua/phát được trên nhiều trình duyệt
 * di động, không chỉ để tua mượt trên desktop.
 */
export async function GET(request: Request, { params }: { params: Promise<{ jobId: string }> }) {
  const ctx = await requireActiveUser();
  if (ctx instanceof NextResponse) return ctx;
  const { user } = ctx;
  const { jobId } = await params;

  const job = await prisma.videoJob.findUnique({ where: { id: jobId } });
  if (!job || job.userId !== user.id) {
    return NextResponse.json({ success: false, error: "Không tìm thấy video." }, { status: 404 });
  }
  if (job.status !== "COMPLETED" || !job.finalVideoPath) {
    return NextResponse.json({ success: false, error: "Video chưa sẵn sàng." }, { status: 404 });
  }

  const absPath = toAbsolutePath(job.finalVideoPath);
  let stat: fs.Stats;
  try {
    stat = await fs.promises.stat(absPath);
  } catch {
    return NextResponse.json({ success: false, error: "Không tìm thấy file video trên máy chủ." }, { status: 404 });
  }

  const fileSize = stat.size;
  const range = request.headers.get("range");

  if (range) {
    const match = /^bytes=(\d*)-(\d*)$/.exec(range);
    if (!match || (!match[1] && !match[2])) {
      return new NextResponse(null, { status: 416, headers: { "Content-Range": `bytes */${fileSize}` } });
    }
    const start = match[1] ? parseInt(match[1], 10) : 0;
    const end = match[2] ? parseInt(match[2], 10) : fileSize - 1;
    if (Number.isNaN(start) || Number.isNaN(end) || start > end || start >= fileSize) {
      return new NextResponse(null, { status: 416, headers: { "Content-Range": `bytes */${fileSize}` } });
    }
    const clampedEnd = Math.min(end, fileSize - 1);

    const nodeStream = fs.createReadStream(absPath, { start, end: clampedEnd });
    const webStream = Readable.toWeb(nodeStream) as unknown as ReadableStream;

    return new NextResponse(webStream, {
      status: 206,
      headers: {
        "Content-Type": "video/mp4",
        "Content-Length": String(clampedEnd - start + 1),
        "Content-Range": `bytes ${start}-${clampedEnd}/${fileSize}`,
        "Accept-Ranges": "bytes",
        "Cache-Control": "private, max-age=3600",
      },
    });
  }

  const nodeStream = fs.createReadStream(absPath);
  const webStream = Readable.toWeb(nodeStream) as unknown as ReadableStream;

  return new NextResponse(webStream, {
    status: 200,
    headers: {
      "Content-Type": "video/mp4",
      "Content-Length": String(fileSize),
      "Accept-Ranges": "bytes",
      "Cache-Control": "private, max-age=3600",
    },
  });
}
