import { NextResponse } from "next/server";
import { requireActiveUser } from "@/lib/auth";
import { estimateStoryDurationSeconds } from "@/lib/ai/videoScriptEngine";

export const dynamic = "force-dynamic";

/**
 * Ước lượng thời lượng cần thiết cho nội dung yêu cầu — gọi TRƯỚC khi tạo
 * video/trừ token (lớp 1 trong 3 lớp phòng lỗi "thời lượng chọn quá ngắn so
 * với nội dung", xem videoScriptEngine.ts's estimateStoryDurationSeconds).
 * Không tốn token tín dụng video (chỉ tốn 1 lệnh AI rẻ, tính vào AiUsage).
 */
export async function POST(request: Request) {
  const ctx = await requireActiveUser();
  if (ctx instanceof NextResponse) return ctx;
  const { user } = ctx;

  try {
    const body = await request.json();
    const rawRequest = String(body.rawRequest || "").trim();
    if (!rawRequest) {
      return NextResponse.json({ success: false, error: "Cô vui lòng nhập nội dung trước." }, { status: 400 });
    }

    const { estimatedSeconds, error } = await estimateStoryDurationSeconds(rawRequest, user.id);
    if (estimatedSeconds == null) {
      return NextResponse.json({
        success: false,
        error: error === "MISSING_API_KEY" ? "Chưa cấu hình AI trên hệ thống." : "Không ước lượng được — cô tự chọn thời lượng giúp em nhé.",
      });
    }

    return NextResponse.json({ success: true, estimatedSeconds });
  } catch (error: any) {
    console.error("POST /api/video-jobs/estimate-duration error:", error);
    return NextResponse.json({ success: false, error: "Không thể ước lượng thời lượng." }, { status: 500 });
  }
}
