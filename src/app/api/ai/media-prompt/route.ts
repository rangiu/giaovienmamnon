import { NextResponse } from "next/server";
import { requireFullAccess } from "@/lib/auth";
import { generateMediaPrompt } from "@/lib/ai/aiEngine";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const ctx = await requireFullAccess();
  if (ctx instanceof NextResponse) return ctx;
  const { user, teacher } = ctx;

  try {
    const body = await request.json();
    const { input, mediaType = "image", artStyle = "3d_clay" } = body;

    if (!input || typeof input !== "string" || input.trim() === "") {
      return NextResponse.json(
        { success: false, error: "Cô vui lòng nhập ý tưởng hình ảnh hoặc video nhé!" },
        { status: 400 }
      );
    }

    const result = await generateMediaPrompt(input, mediaType, artStyle, { teacher }, user.id);

    return NextResponse.json({
      success: true,
      englishPrompt: result.englishPrompt,
      vietnameseDesc: result.vietnameseDesc,
      usageTip: result.usageTip,
      error: result.error,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
