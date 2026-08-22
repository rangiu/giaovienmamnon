import { NextResponse } from "next/server";
import { requireActiveUser } from "@/lib/auth";
import { parseDocumentToText } from "@/lib/ai/documentParser";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const ctx = await requireActiveUser();
  if (ctx instanceof NextResponse) return ctx;

  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json(
        { success: false, error: "Vui lòng chọn file cần đính kèm!" },
        { status: 400 }
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const parseRes = await parseDocumentToText(buffer, file.name);

    if (!parseRes.success) {
      return NextResponse.json(
        { success: false, error: parseRes.error || "Không thể trích xuất văn bản từ file." },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      fileName: file.name,
      fileFormat: parseRes.fileFormat,
      text: parseRes.rawText,
    });
  } catch (error: any) {
    console.error("POST /api/chat/parse-file error:", error);
    return NextResponse.json(
      { success: false, error: `Lỗi khi xử lý file: ${error?.message || "Không thể đọc file."}` },
      { status: 400 }
    );
  }
}
