import { NextResponse } from "next/server";
import { requireActiveUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { parseDocumentToText } from "@/lib/ai/documentParser";
import { analyzeTemplateStructure, reviewTemplateQualityWithAI } from "@/lib/ai/templateAnalyzer";
import { isTemplateCollectionEnabled } from "@/lib/settings";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const ctx = await requireActiveUser();
  if (ctx instanceof NextResponse) return ctx;
  const { teacher, access } = ctx;

  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const customTitle = (formData.get("title") as string) || "";
    const customDesc = (formData.get("description") as string) || "";
    const sharePublic = formData.get("sharePublic") === "true";

    if (!file) {
      return NextResponse.json({ success: false, error: "Vui lòng chọn file mẫu cần tải lên!" }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // 1. Trích xuất văn bản thô từ file (.docx, .pdf, .txt, .md, .doc)
    const parseRes = await parseDocumentToText(buffer, file.name);
    if (!parseRes.success) {
      return NextResponse.json({ success: false, error: parseRes.error }, { status: 400 });
    }

    const aiTier = access.tier === "FULL" ? "FULL" : "LIMITED";

    // 2. Phân tích cấu trúc tiêu đề & các mục bằng LLM
    const structure = await analyzeTemplateStructure(parseRes.rawText, file.name, aiTier);
    const finalTitle = customTitle.trim() || structure.title || file.name.replace(/\.[^/.]+$/, "");
    const finalDesc = customDesc.trim() || structure.description || "Mẫu giáo án tải lên từ file.";

    // 3. Kiểm soát thu thập & Đánh giá bằng AI (Kiểm duyệt Vòng 1)
    const isCollectionAllowed = await isTemplateCollectionEnabled();
    let status = "PRIVATE";
    let aiScore: number | null = null;
    let aiNotes: string | null = null;
    let feedbackMsg = "Mẫu giáo án đã được lưu vào danh sách mẫu cá nhân của cô thành công!";

    if (sharePublic && isCollectionAllowed) {
      const review = await reviewTemplateQualityWithAI(parseRes.rawText, JSON.stringify(structure), aiTier);
      aiScore = review.score;
      aiNotes = review.notes;

      if (review.isApprovedByAi) {
        status = "PENDING_REVIEW";
        feedbackMsg = "Mẫu giáo án đã được lưu và gửi tới ban quản trị để xét duyệt đưa vào Kho Mẫu Tham Khảo Public!";
      } else {
        status = "PRIVATE";
        feedbackMsg = `Mẫu giáo án đã được lưu dưới dạng Mẫu Cá Nhân. (Lưu ý: Mẫu chưa thể chia sẻ công khai do AI nhận xét: ${review.notes})`;
      }
    }

    // 4. Lưu vào Database
    const template = await prisma.lessonTemplate.create({
      data: {
        teacherId: teacher.id,
        title: finalTitle,
        description: finalDesc,
        fileFormat: parseRes.fileFormat,
        originalFileName: file.name,
        structureJson: JSON.stringify(structure),
        sampleText: parseRes.rawText.slice(0, 5000), // Lưu tối đa 5000 ký tự xem trước
        status,
        aiReviewScore: aiScore,
        aiReviewNotes: aiNotes,
        isSystem: false,
      },
    });

    return NextResponse.json({
      success: true,
      message: feedbackMsg,
      template,
      structure,
    });
  } catch (error: any) {
    console.error("POST /api/lessons/templates/upload error:", error);
    return NextResponse.json(
      { success: false, error: `Lỗi khi xử lý file: ${error?.message || "Không thể xử lý và lưu file mẫu."}` },
      { status: 400 }
    );
  }
}
