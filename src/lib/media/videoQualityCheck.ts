import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { withGeminiKeyRotation, hasGeminiKeys } from "../ai/geminiKeyPool";
import { extractJsonFromText } from "../ai/jsonValidator";
import { trackAiUsage } from "../ai/aiEngine";
import { PRESCHOOL_SAFETY_SETTINGS } from "../ai/safetySettings";
import { runFfmpeg } from "./ffmpegConcat";

/**
 * Kiểm tra chất lượng video Tier Hybrid TỰ ĐỘNG sau khi render xong — bằng
 * cách trích 1 khung hình đại diện MỖI cảnh từ video CUỐI CÙNG (đã ghép
 * đầy đủ), gửi kèm lời kể của đúng cảnh đó cho Gemini (model có khả năng
 * nhìn ảnh — cùng key pool đang dùng để viết kịch bản, KHÔNG cần thêm nhà
 * cung cấp AI nào khác) hỏi: "nhân vật trên hình có khớp lời kể không? có
 * lỗi hiển thị rõ rệt không?".
 *
 * Động lực xây tính năng này: bug thật đã gặp — video "Thỏ và Rùa chạy đua"
 * render "thành công" (status COMPLETED, không lỗi kỹ thuật nào) nhưng nội
 * dung sai be bét (dồn cả 2 nhân vật thành 1, vẽ sai loài) mà hệ thống
 * không hề biết để cảnh báo — phải nhờ người xem thủ công mới phát hiện ra.
 * Đây chính là bước tự động hoá việc "xem thủ công" đó.
 *
 * v1: CHỈ ghi log/gắn cờ vào VideoJob.qaReportJson để theo dõi (bao nhiêu %
 * video có vấn đề, lỗi kiểu gì hay lặp lại) — KHÔNG tự động chặn/hoàn tín
 * dụng/render lại. Lý do chưa làm tự động chặn ngay: (a) bản thân LLM giám
 * định cũng có thể sai (false positive) — chặn nhầm video tốt còn tệ hơn
 * giao 1 video có sạn nhỏ; (b) render lại tốn gấp đôi chi phí (sinh ảnh +
 * TTS + render lại từ đầu) — nên cân nhắc kỹ khi đã có dữ liệu thật về tần
 * suất lỗi trước khi quyết định đầu tư thêm.
 */

const VISION_MODEL = "gemini-flash-lite-latest";

export interface QaSceneInput {
  sceneIndex: number;
  narration: string;
  /** Giây bắt đầu cảnh này tính từ đầu video (cộng dồn durationSeconds các cảnh trước). */
  startSeconds: number;
  durationSeconds: number;
}

export interface QaSceneVerdict {
  sceneIndex: number;
  ok: boolean;
  issue?: string;
}

export interface QaReport {
  /** false nếu bị bỏ qua hoàn toàn (không có key Gemini, lỗi gọi AI, không trích được khung hình nào...). */
  checked: boolean;
  scenes: QaSceneVerdict[];
  hasSevereIssue: boolean;
  ranAt: string;
}

async function extractFrameAt(videoAbsPath: string, atSeconds: number, outPath: string): Promise<void> {
  // "-ss" TRƯỚC "-i": seek nhanh (input seeking), đủ chính xác cho mục đích
  // lấy 1 khung đại diện, không cần khung chính xác tuyệt đối.
  await runFfmpeg(["-ss", Math.max(0, atSeconds).toFixed(2), "-i", videoAbsPath, "-frames:v", "1", "-q:v", "4", outPath]);
}

/**
 * Chạy kiểm tra chất lượng — KHÔNG BAO GIỜ throw ra ngoài (lỗi ở bước này
 * không được phép làm hỏng cả job video đã render thành công, chỉ đơn
 * thuần là bỏ qua/ghi lại việc chưa kiểm tra được).
 */
export async function runVideoQualityCheck(
  finalVideoAbsPath: string,
  scenes: QaSceneInput[],
  userId?: string
): Promise<QaReport> {
  const skip = (): QaReport => ({ checked: false, scenes: [], hasSevereIssue: false, ranAt: new Date().toISOString() });

  if (!hasGeminiKeys() || scenes.length === 0) return skip();

  let tmpDir: string | null = null;
  try {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "coai-qa-"));

    // Bug thật đã gặp: ffmpeg "-ss" seek QUÁ điểm kết thúc video thật (VD
    // cảnh cuối cùng sau khi crossfade làm video ngắn hơn tổng cộng dồn danh
    // nghĩa — xem SCENE_PADDING_SECONDS/transitionFrames ở hybridPipeline.ts
    // và remotionRenderer.ts) không báo lỗi (exit code 0) mà chỉ ÂM THẦM
    // không tạo ra file ảnh nào — trước đây bước đọc file (fs.readFile) nằm
    // NGOÀI try/catch của từng cảnh nên 1 cảnh lỗi kiểu này làm ENOENT văng
    // ra ngoài, sập LUÔN toàn bộ báo cáo QA (kể cả các cảnh khác đã trích
    // thành công). Sửa: đọc file NGAY trong try/catch của từng cảnh — 1 cảnh
    // lỗi chỉ bỏ sót đúng cảnh đó, các cảnh còn lại vẫn được chấm bình thường.
    const frames: { sceneIndex: number; narration: string; base64: string }[] = [];
    for (const scene of scenes) {
      const midpoint = scene.startSeconds + scene.durationSeconds / 2;
      const framePath = path.join(tmpDir, `scene_${scene.sceneIndex}.jpg`);
      try {
        await extractFrameAt(finalVideoAbsPath, midpoint, framePath);
        const base64 = (await fs.readFile(framePath)).toString("base64");
        frames.push({ sceneIndex: scene.sceneIndex, narration: scene.narration, base64 });
      } catch (err: any) {
        console.error(`[videoQualityCheck] Không trích được khung hình cảnh ${scene.sceneIndex}:`, err?.message || err);
      }
    }
    if (frames.length === 0) return skip();

    const imageParts = frames.map((f) => ({
      inlineData: { data: f.base64, mimeType: "image/jpeg" },
    }));

    const sceneList = frames.map((f) => `- Cảnh ${f.sceneIndex}: "${f.narration}"`).join("\n");
    const prompt = `Bạn đang kiểm duyệt chất lượng 1 video hoạt hình mầm non do AI tự động tạo ra. Dưới đây là ${frames.length} khung hình đại diện, MỖI ảnh ứng với ĐÚNG 1 cảnh theo ĐÚNG THỨ TỰ ảnh được gửi lên, kèm lời kể của chính cảnh đó:
${sceneList}

Với MỖI khung hình, đánh giá 2 tiêu chí:
1. Nhân vật xuất hiện trên hình có KHỚP với nhân vật/loài mà lời kể CỦA CHÍNH CẢNH ĐÓ nhắc tới không? (VD lời kể đang nói về "Rùa" thì trên hình phải là con rùa — KHÔNG phải con vật khác hay người).
2. Có lỗi hiển thị RÕ RỆT không (nhân vật bị mất/thiếu hẳn 1 phần cơ thể, còn sót khung/mảng nền trắng hình chữ nhật lộ liễu quanh nhân vật, hình bị vỡ/nhoè bất thường)?

Trả về ĐÚNG 1 khối JSON, không thêm chữ nào khác:
{
  "scenes": [
    { "sceneIndex": 0, "ok": true, "issue": null }
  ]
}
"ok": false CHỈ khi vi phạm RÕ RỆT 1 trong 2 tiêu chí trên (không bắt lỗi vặt về phong cách vẽ/thẩm mỹ). "issue": mô tả ngắn gọn bằng tiếng Việt lỗi cụ thể nếu "ok" là false, để null nếu true.`;

    const { text, inputTokens, outputTokens } = await withGeminiKeyRotation(async (ai: GoogleGenerativeAI) => {
      const model = ai.getGenerativeModel({
        model: VISION_MODEL,
        safetySettings: PRESCHOOL_SAFETY_SETTINGS,
        generationConfig: { responseMimeType: "application/json" },
      });
      const result = await model.generateContent([{ text: prompt }, ...imageParts]);
      const usage = result.response.usageMetadata;
      return {
        text: result.response.text(),
        inputTokens: usage?.promptTokenCount || 0,
        outputTokens: usage?.candidatesTokenCount || 0,
      };
    });

    await trackAiUsage(userId, "video_quality_check", VISION_MODEL, inputTokens, outputTokens);

    const parsed = extractJsonFromText(text);
    const rawScenes: any[] = Array.isArray(parsed?.scenes) ? parsed.scenes : [];
    const scenesVerdict: QaSceneVerdict[] = frames.map((f) => {
      const match = rawScenes.find((s) => Number(s?.sceneIndex) === f.sceneIndex);
      // Không tìm thấy verdict cho cảnh này (AI bỏ sót) -> coi như "ok" —
      // thà bỏ sót còn hơn tự bịa ra cảnh báo sai cho cảnh chưa được chấm.
      const ok = match ? match.ok !== false : true;
      return {
        sceneIndex: f.sceneIndex,
        ok,
        issue: !ok ? String(match?.issue || "Không rõ lý do").slice(0, 300) : undefined,
      };
    });

    return {
      checked: true,
      scenes: scenesVerdict,
      hasSevereIssue: scenesVerdict.some((v) => !v.ok),
      ranAt: new Date().toISOString(),
    };
  } catch (err: any) {
    console.error("[videoQualityCheck] Lỗi khi kiểm tra chất lượng video:", err?.message || err);
    return skip();
  } finally {
    if (tmpDir) await fs.rm(tmpDir, { recursive: true, force: true }).catch(() => {});
  }
}

export interface SingleImageCheck {
  ok: boolean;
  issue?: string;
}

/**
 * Kiểm tra NHANH 1 ảnh vừa sinh (ảnh tham chiếu nhân vật, hoặc ảnh 1 cảnh)
 * NGAY trong lúc sinh — TRƯỚC KHI tốn thêm chi phí ở bước sau (TTS, render).
 * Đúng nguyên tắc "kiểm tra rẻ trước, chi tiền đắt sau" của quy trình mới —
 * bug thật đã gặp trước đây: lỗi chỉ phát hiện được SAU KHI đã render xong
 * cả video (tốn hết ảnh+giọng đọc+render), quá muộn để sửa rẻ.
 *
 * KHÔNG BAO GIỜ throw ra ngoài — lỗi ở bản thân bước kiểm tra (hết hạn mức,
 * mất mạng...) thì coi như "ok", thà bỏ sót còn hơn chặn oan 1 ảnh tốt chỉ
 * vì bước kiểm tra bị lỗi.
 */
export async function validateGeneratedImage(
  imageBuffer: Buffer,
  mimeType: string,
  contextDescription: string,
  userId?: string
): Promise<SingleImageCheck> {
  if (!hasGeminiKeys()) return { ok: true };

  try {
    const prompt = `Đây là 1 ảnh minh hoạ AI vừa sinh cho video hoạt hình mầm non. Bối cảnh cần vẽ: "${contextDescription}"

Đánh giá: ảnh có vẽ ĐÚNG/ĐẦY ĐỦ nội dung mô tả trên không, và có lỗi hiển thị RÕ RỆT không (nhân vật/vật thể chính bị mất hẳn hoặc thiếu 1 phần lớn cơ thể, hình bị vỡ/nhoè bất thường, còn sót khung/mảng nền trắng hình chữ nhật lộ liễu, ảnh gần như trống trơn không có nội dung)?

Trả về ĐÚNG 1 khối JSON, không thêm chữ nào khác: { "ok": true, "issue": null } hoặc { "ok": false, "issue": "mô tả ngắn gọn tiếng Việt" }. "ok": false CHỈ khi vi phạm RÕ RỆT, không bắt lỗi vặt về phong cách/thẩm mỹ.`;

    const { text, inputTokens, outputTokens } = await withGeminiKeyRotation(async (ai: GoogleGenerativeAI) => {
      const model = ai.getGenerativeModel({
        model: VISION_MODEL,
        safetySettings: PRESCHOOL_SAFETY_SETTINGS,
        generationConfig: { responseMimeType: "application/json" },
      });
      const result = await model.generateContent([
        { text: prompt },
        { inlineData: { data: imageBuffer.toString("base64"), mimeType } },
      ]);
      const usage = result.response.usageMetadata;
      return {
        text: result.response.text(),
        inputTokens: usage?.promptTokenCount || 0,
        outputTokens: usage?.candidatesTokenCount || 0,
      };
    });

    await trackAiUsage(userId, "video_image_check", VISION_MODEL, inputTokens, outputTokens);

    const parsed = extractJsonFromText(text);
    if (!parsed) return { ok: true };
    const ok = parsed.ok !== false;
    return { ok, issue: !ok ? String(parsed.issue || "Không rõ lý do").slice(0, 300) : undefined };
  } catch (err: any) {
    console.error("[videoQualityCheck] Lỗi khi kiểm tra nhanh 1 ảnh:", err?.message || err);
    return { ok: true };
  }
}
