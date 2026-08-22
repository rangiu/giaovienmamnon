import path from "node:path";
import fs from "node:fs/promises";
import { prisma } from "../prisma";
import { generateCharacterReferenceBuffer, generateSceneImageBuffer, type ReferenceImage } from "./assetEngine";
import { validateGeneratedImage } from "./videoQualityCheck";
import { synthesizeNarrationWav } from "./ttsEngine";
import { getWavDurationSeconds } from "./wavUtils";
import { renderHybridVideo } from "./remotionRenderer";
import { getJobAssetsDir, getJobScenesDir, getJobFinalPath, ensureDir, toRelativePath } from "./storage";
import { runVideoQualityCheck, type QaSceneInput } from "./videoQualityCheck";
import type { VideoStoryboard } from "../ai/videoScriptEngine";
import { VIETNAMESE_WORDS_PER_SECOND } from "../ai/videoScriptEngine";

/**
 * Toàn bộ pipeline Tier HYBRID — v2 "1 ẢNH/CẢNH" (xem videoScriptEngine.ts,
 * assetEngine.ts): bỏ hẳn kiến trúc ghép lớp (nền+nhân vật+vật phụ tách
 * rời, xoá nền trắng, sprite sheet) sau nhiều vòng vá lỗi vẫn liên tục phát
 * sinh lỗi thật MỚI. Quy trình mới theo ĐÚNG nguyên tắc đã bàn kỹ với người
 * dùng trước khi xây: "KIỂM TRA RẺ TRƯỚC, CHI TIỀN ĐẮT SAU" —
 *
 *   1. Sinh + KIỂM TRA NGAY (thử lại nếu hỏng) ẢNH THAM CHIẾU mỗi nhân vật
 *      — bug thật đã gặp: nhân vật hỏng chỉ phát hiện được SAU KHI render
 *      xong cả video, quá muộn để sửa rẻ.
 *   2. VỚI TỪNG CẢNH: sinh ảnh (gửi kèm ảnh tham chiếu nhân vật liên quan)
 *      -> KIỂM TRA NGAY -> thử lại nếu hỏng -> CHỈ SAU KHI ảnh đạt mới sinh
 *      giọng đọc cho ĐÚNG cảnh đó (không sinh giọng đọc thừa cho ảnh có thể
 *      còn phải vẽ lại).
 *   3. Dựng video (Remotion) — bước NẶNG TÀI NGUYÊN nhất, để cuối cùng, chỉ
 *      chạy khi ảnh/giọng đọc mọi cảnh đã sạch.
 *   4. QA tổng thể (đã có sẵn) — lưới an toàn CUỐI CÙNG, không phải nơi duy
 *      nhất bắt lỗi như trước.
 *
 * Gọi bởi videoProcessor.ts (poller xử lý VideoJob) — KHÔNG gọi trực tiếp
 * từ API route (route chỉ tạo VideoJob PENDING rồi trả về ngay).
 */

// Số lần thử LẠI tối đa nếu 1 ảnh (tham chiếu nhân vật hoặc ảnh cảnh) không
// đạt kiểm tra nhanh — giới hạn để tránh vòng lặp vẽ-lại-mãi tốn chi phí vô
// hạn nếu 1 phần tử cứ hỏng liên tục; hết hạn mức thì dừng cả job (FAILED +
// hoàn tín dụng, xem videoProcessor.ts), không âm thầm giao video có sạn.
const MAX_IMAGE_ATTEMPTS = 3; // 1 lần đầu + tối đa 2 lần thử lại

// Bug thật đã gặp: "lời thoại nhanh hơn chữ" — durationSeconds mỗi cảnh
// TRƯỚC ĐÂY lấy thẳng từ số AI ĐOÁN trong storyboard, không khớp độ dài
// giọng đọc TTS thật tổng hợp ra (nhanh/chậm hơn tuỳ câu) — khiến phụ đề
// (chia theo durationSeconds đó) chạy lệch nhịp với audio thật. Sửa: đo
// THẬT độ dài file WAV vừa tổng hợp (xem wavUtils.ts), cộng thêm 1 khoảng
// đệm nhỏ (SCENE_PADDING_SECONDS) để ảnh không bị cắt đúng lúc giọng vừa dứt
// (cảm giác giật cụt), rồi dùng số THẬT này cho mọi khâu sau (khung hình
// cảnh, phụ đề, QA) — không dùng số AI đoán nữa.
const SCENE_PADDING_SECONDS = 0.6;
const SCENE_MIN_SECONDS = 2;
const SCENE_MAX_SECONDS = 20;

// Lưới an toàn CUỐI CÙNG chống audio bị cắt cụt giữa câu (bug thật lo ngại:
// thời lượng chọn quá ngắn so với nội dung yêu cầu — dù đã có ngân sách
// từ/cảnh đưa vào đề bài cho AI ở videoScriptEngine.ts, LLM vẫn có thể lệch
// ngân sách). Cắt narration THEO SỐ TỪ, TRƯỚC KHI gọi TTS — rẻ hơn hẳn để
// AI viết xong, tổng hợp giọng đọc dài rồi mới phát hiện vượt SCENE_MAX_SECONDS
// (tốn 1 lần gọi TTS vô ích, và tệ hơn: âm thanh đã tổng hợp bị cắt cụt vì
// khung hình chỉ dài SCENE_MAX_SECONDS — đúng lỗi cần tránh). Trần đặt ở 90%
// của SCENE_MAX_SECONDS để chừa khoảng đệm cho tốc độ đọc THẬT của giọng
// TTS (có thể chậm hơn mức trung bình dùng để ước lượng số từ).
const HARD_MAX_WORDS_PER_SCENE = Math.floor(SCENE_MAX_SECONDS * 0.9 * VIETNAMESE_WORDS_PER_SECOND);

/**
 * Cắt narration nếu vượt ngân sách từ — cắt ở CUỐI CÂU HOÀN CHỈNH gần nhất
 * trong giới hạn (không bao giờ cắt giữa câu/giữa từ). Nếu câu ĐẦU TIÊN đã
 * một mình vượt ngân sách (hiếm) thì vẫn giữ nguyên câu đó — thà video có 1
 * cảnh hơi dài còn hơn cắt nửa câu nghe cụt lủn.
 */
function trimNarrationToWordBudget(narration: string, maxWords: number): { text: string; trimmed: boolean } {
  const wordCount = narration.trim().split(/\s+/).filter(Boolean).length;
  if (wordCount <= maxWords) return { text: narration, trimmed: false };

  // Tách câu theo dấu kết câu tiếng Việt phổ biến (. ! ? …), GIỮ LẠI dấu đó
  // ở cuối mỗi câu để văn bản đọc tự nhiên.
  const sentences = narration.match(/[^.!?…]+[.!?…]+|[^.!?…]+$/g) || [narration];

  let result = "";
  let runningWords = 0;
  for (const sentence of sentences) {
    const sentenceWords = sentence.trim().split(/\s+/).filter(Boolean).length;
    if (result && runningWords + sentenceWords > maxWords) break;
    result += sentence;
    runningWords += sentenceWords;
  }

  const finalText = result.trim() || sentences[0].trim();
  return { text: finalText, trimmed: true };
}

function extFromMimeType(mimeType: string): string {
  if (mimeType.includes("png")) return "png";
  if (mimeType.includes("webp")) return "webp";
  if (mimeType.includes("jpeg") || mimeType.includes("jpg")) return "jpg";
  return "png";
}

async function generateAndValidateImage(
  generate: () => Promise<{ buffer: Buffer; mimeType: string }>,
  contextDescription: string,
  userId: string | undefined,
  failureLabel: string
): Promise<{ buffer: Buffer; mimeType: string }> {
  let lastIssue = "";
  for (let attempt = 1; attempt <= MAX_IMAGE_ATTEMPTS; attempt++) {
    const { buffer, mimeType } = await generate();
    const check = await validateGeneratedImage(buffer, mimeType, contextDescription, userId);
    if (check.ok) return { buffer, mimeType };
    lastIssue = check.issue || "Không rõ lý do";
    console.warn(`[hybridPipeline] ${failureLabel} — lần thử ${attempt}/${MAX_IMAGE_ATTEMPTS} không đạt: ${lastIssue}`);
  }
  throw new Error(`${failureLabel} — vẽ lại ${MAX_IMAGE_ATTEMPTS} lần vẫn không đạt: ${lastIssue}`);
}

export async function runHybridPipeline(
  jobId: string,
  storyboard: VideoStoryboard,
  userId?: string
): Promise<{ finalRelativePath: string; durationSeconds: number; contentWasTrimmed: boolean }> {
  // 1. Sinh + KIỂM TRA NGAY ảnh tham chiếu cho MỖI nhân vật — 1 LẦN cho cả
  // video, các cảnh dùng lại (gửi kèm) để giữ đồng nhất thiết kế.
  await prisma.videoJob.update({ where: { id: jobId }, data: { status: "GENERATING_ASSETS" } });
  const assetsDir = getJobAssetsDir(jobId);
  await ensureDir(assetsDir);

  const characterBuffers = new Map<string, ReferenceImage>();
  for (const asset of storyboard.assets) {
    const { buffer, mimeType } = await generateAndValidateImage(
      () => generateCharacterReferenceBuffer(asset.prompt),
      `Nhân vật: ${asset.prompt}`,
      userId,
      `Ảnh tham chiếu nhân vật "${asset.key}"`
    );
    characterBuffers.set(asset.key, { buffer, mimeType });

    const absPath = path.join(assetsDir, `${asset.key}.${extFromMimeType(mimeType)}`);
    await fs.writeFile(absPath, buffer);
    await prisma.videoJobAsset.create({
      data: { videoJobId: jobId, key: asset.key, kind: asset.kind, imagePath: toRelativePath(absPath) },
    });
  }

  // 2. VỚI TỪNG CẢNH: sinh ảnh (điều kiện hoá theo characterKeys) -> kiểm
  // tra -> thử lại nếu hỏng -> CHỈ SAU KHI ảnh đạt mới sinh giọng đọc.
  const scenesDir = getJobScenesDir(jobId);
  await ensureDir(scenesDir);

  const sceneInputs: {
    imageRelativePath: string;
    audioRelativePath?: string;
    durationSeconds: number;
    narration: string;
  }[] = [];
  // TRUE nếu ÍT NHẤT 1 cảnh bị cắt bớt lời kể — surface cho giáo viên biết
  // (xem VideoJob.contentWasTrimmed), không âm thầm sửa mà không báo.
  let contentWasTrimmed = false;
  for (const scene of storyboard.scenes) {
    try {
      const referenceImages: ReferenceImage[] = (scene.characterKeys || [])
        .map((key) => characterBuffers.get(key))
        .filter((r): r is ReferenceImage => Boolean(r));

      const { buffer: imageBuffer, mimeType } = await generateAndValidateImage(
        () => generateSceneImageBuffer(scene.imagePrompt, referenceImages),
        `Lời kể: "${scene.narration}" — mô tả cảnh: ${scene.imagePrompt}`,
        userId,
        `Cảnh ${scene.sceneIndex}`
      );
      const imageAbsPath = path.join(scenesDir, `${scene.sceneIndex}.${extFromMimeType(mimeType)}`);
      await fs.writeFile(imageAbsPath, imageBuffer);
      const imageRelativePath = toRelativePath(imageAbsPath);

      // Nghỉ ngắn giữa các lần gọi TTS liên tiếp — chủ động tránh dồn dập
      // (burst) đụng trần free-tier theo phút, thay vì chỉ trông chờ retry
      // xử lý sau khi đã lỡ dính 429 (xem synthesizeNarrationWav).
      if (scene.sceneIndex > 0) await new Promise((resolve) => setTimeout(resolve, 3000));

      // Lưới an toàn cuối — cắt TRƯỚC KHI tổng hợp giọng đọc nếu AI vẫn lệch
      // ngân sách từ (xem HARD_MAX_WORDS_PER_SCENE) — tránh audio tổng hợp
      // ra dài hơn khung hình cho phép rồi bị cắt cụt giữa câu lúc ghép video.
      const { text: trimmedNarration, trimmed } = trimNarrationToWordBudget(scene.narration, HARD_MAX_WORDS_PER_SCENE);
      if (trimmed) {
        contentWasTrimmed = true;
        console.warn(
          `[hybridPipeline] Cảnh ${scene.sceneIndex} — lời kể vượt ~${HARD_MAX_WORDS_PER_SCENE} từ, đã tự rút gọn.`
        );
      }
      const narrationForAudio = trimmedNarration;

      const wav = await synthesizeNarrationWav(narrationForAudio);
      const audioAbsPath = path.join(scenesDir, `${scene.sceneIndex}.wav`);
      await fs.writeFile(audioAbsPath, wav);
      const audioRelativePath = toRelativePath(audioAbsPath);

      // Độ dài THẬT của giọng đọc vừa tổng hợp — ưu tiên số này thay vì số
      // AI đoán trong storyboard (xem giải thích ở SCENE_PADDING_SECONDS).
      // Nếu vì lý do gì đó không đọc được header WAV thì fallback về số AI
      // đoán (an toàn hơn crash cả job vì 1 lỗi đo lường không quan trọng).
      const measuredSeconds = getWavDurationSeconds(wav);
      const realDurationSeconds =
        measuredSeconds != null
          ? Math.min(SCENE_MAX_SECONDS, Math.max(SCENE_MIN_SECONDS, measuredSeconds + SCENE_PADDING_SECONDS))
          : scene.durationSeconds;

      await prisma.videoJobScene.create({
        data: {
          videoJobId: jobId,
          sceneIndex: scene.sceneIndex,
          // Lưu ĐÚNG văn bản đã dùng để tổng hợp giọng đọc (có thể đã bị cắt
          // bớt) — không lưu lại bản gốc dài hơn thật, tránh lệch giữa chữ
          // hiển thị và audio thật phát ra.
          narration: narrationForAudio,
          durationSeconds: Math.round(realDurationSeconds),
          imagePath: imageRelativePath,
          audioPath: audioRelativePath,
          status: "DONE",
        },
      });

      sceneInputs.push({
        imageRelativePath,
        audioRelativePath,
        durationSeconds: realDurationSeconds,
        narration: narrationForAudio,
      });
    } catch (err: any) {
      await prisma.videoJobScene.create({
        data: {
          videoJobId: jobId,
          sceneIndex: scene.sceneIndex,
          narration: scene.narration,
          durationSeconds: scene.durationSeconds,
          status: "FAILED",
          errorMessage: err?.message?.slice(0, 500),
        },
      });
      throw err; // dừng cả job — videoProcessor.ts sẽ đánh dấu VideoJob FAILED + hoàn tín dụng
    }
  }

  // 3. Ghép toàn bộ cảnh bằng Remotion — bước NẶNG TÀI NGUYÊN nhất, chỉ
  // chạy khi ảnh/giọng đọc mọi cảnh đã sạch (bước 1-2 ở trên).
  await prisma.videoJob.update({ where: { id: jobId }, data: { status: "RENDERING" } });
  const finalAbsPath = getJobFinalPath(jobId);
  const { transitionSeconds } = await renderHybridVideo({ scenes: sceneInputs, outputAbsolutePath: finalAbsPath });

  // Mốc thời gian mỗi cảnh trong video THẬT — 2 cảnh liền kề CHỒNG LẤN
  // transitionSeconds (crossfade, xem Composition.tsx) nên mốc bắt đầu cảnh
  // sau KHÔNG PHẢI cộng dồn thô, mà phải TRỪ transitionSeconds mỗi lần
  // chuyển cảnh. Bug thật đã gặp: dùng cộng dồn thô khiến mốc giữa cảnh CUỐI
  // vượt quá điểm kết thúc thật của video (lệch càng nhiều nếu càng nhiều
  // cảnh) — ffmpeg trích khung hình ở mốc vượt quá đó thất bại ÂM THẦM
  // (exit 0, không tạo file ảnh), làm sập luôn cả báo cáo QA tổng thể.
  const qaSceneInputs: QaSceneInput[] = [];
  let cumulativeSeconds = 0;
  sceneInputs.forEach((s, idx) => {
    qaSceneInputs.push({
      sceneIndex: idx,
      narration: s.narration,
      startSeconds: cumulativeSeconds,
      durationSeconds: s.durationSeconds,
    });
    cumulativeSeconds += s.durationSeconds - transitionSeconds;
  });

  // 4. QA tổng thể — lưới an toàn CUỐI CÙNG, không phải nơi duy nhất bắt
  // lỗi (bước 1-2 đã bắt hầu hết lỗi hiển thị TRƯỚC khi tốn công render).
  const qaReport = await runVideoQualityCheck(finalAbsPath, qaSceneInputs, userId);
  if (qaReport.hasSevereIssue) {
    console.warn(
      `[hybridPipeline] Job ${jobId} có vấn đề chất lượng qua kiểm tra tự động:`,
      JSON.stringify(qaReport.scenes.filter((s) => !s.ok))
    );
  }
  await prisma.videoJob.update({ where: { id: jobId }, data: { qaReportJson: JSON.stringify(qaReport) } });

  // Độ dài THẬT của video cuối cùng — cộng dồn độ dài từng cảnh (đã đo lúc
  // tổng hợp giọng đọc) rồi TRỪ tổng thời gian chồng lấn crossfade, khớp
  // đúng độ dài file video thật render ra (không phải tổng thô từng cảnh).
  const totalNaiveSeconds = sceneInputs.reduce((sum, s) => sum + s.durationSeconds, 0);
  const totalOverlapSeconds = sceneInputs.length > 1 ? (sceneInputs.length - 1) * transitionSeconds : 0;
  const durationSeconds = Math.round(Math.max(0, totalNaiveSeconds - totalOverlapSeconds));
  return { finalRelativePath: toRelativePath(finalAbsPath), durationSeconds, contentWasTrimmed };
}
