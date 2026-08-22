import path from "node:path";
import fs from "node:fs/promises";
import { prisma } from "../prisma";
import { generateCharacterReferenceBuffer } from "./assetEngine";
import { synthesizeNarrationWav } from "./ttsEngine";
import { generateVeoClip } from "./veoEngine";
import { muxNarrationIntoClip, concatClips } from "./ffmpegConcat";
import { getJobAssetsDir, getJobScenesDir, getJobFinalPath, ensureDir, toRelativePath } from "./storage";
import type { VideoStoryboard } from "../ai/videoScriptEngine";

function extFromMimeType(mimeType: string): string {
  if (mimeType.includes("png")) return "png";
  if (mimeType.includes("webp")) return "webp";
  if (mimeType.includes("jpeg") || mimeType.includes("jpg")) return "jpg";
  return "png";
}

/**
 * Pipeline Tier VEO: sinh ảnh nhân vật tham chiếu (1 ảnh đơn/nhân vật, tái
 * dùng assetEngine.ts của Tier Hybrid — xem videoScriptEngine.ts v2) ->
 * mỗi cảnh gọi Veo (cảnh đầu dùng referenceImages, cảnh sau nối bằng
 * video_to_extend để liền mạch chuyển động) -> ghép narration TTS vào từng
 * clip -> nối toàn bộ bằng ffmpeg.
 *
 * ⚠️ Chưa live-test được (billing Veo chưa bật trên project hiện tại — xem
 * ghi chú trong veoEngine.ts). Code hoàn chỉnh, chờ bạn bật billing.
 */
export async function runVeoPipeline(
  jobId: string,
  storyboard: VideoStoryboard
): Promise<{ finalRelativePath: string; durationSeconds: number }> {
  await prisma.videoJob.update({ where: { id: jobId }, data: { status: "GENERATING_ASSETS" } });

  const assetsDir = getJobAssetsDir(jobId);
  await ensureDir(assetsDir);

  const referenceImages: { base64: string; mimeType: string }[] = [];
  for (const asset of storyboard.assets.slice(0, 3)) {
    const { buffer, mimeType } = await generateCharacterReferenceBuffer(asset.prompt);
    const absPath = path.join(assetsDir, `${asset.key}.${extFromMimeType(mimeType)}`);
    await fs.writeFile(absPath, buffer);
    await prisma.videoJobAsset.create({
      data: { videoJobId: jobId, key: asset.key, kind: asset.kind, imagePath: toRelativePath(absPath) },
    });
    referenceImages.push({ base64: buffer.toString("base64"), mimeType });
  }

  await prisma.videoJob.update({ where: { id: jobId }, data: { status: "RENDERING" } });
  const scenesDir = getJobScenesDir(jobId);
  await ensureDir(scenesDir);

  let previousClipUri: string | undefined;
  const finalClipAbsPaths: string[] = [];

  for (const scene of storyboard.scenes) {
    try {
      const { buffer, uri } = await generateVeoClip({
        prompt: scene.visualPrompt || scene.narration,
        durationSeconds: scene.durationSeconds,
        // Cảnh ĐẦU TIÊN dùng referenceImages để "giới thiệu" nhân vật; các
        // cảnh SAU nối tiếp bằng video_to_extend (liền mạch chuyển động
        // thật, không chỉ đồng nhất phong cách).
        referenceImages: previousClipUri ? undefined : referenceImages,
        extendFromVideoUri: previousClipUri,
      });
      previousClipUri = uri;

      const rawClipPath = path.join(scenesDir, `${scene.sceneIndex}.raw.mp4`);
      await fs.writeFile(rawClipPath, buffer);

      const wav = await synthesizeNarrationWav(scene.narration);
      const audioAbsPath = path.join(scenesDir, `${scene.sceneIndex}.wav`);
      await fs.writeFile(audioAbsPath, wav);

      const finalClipPath = path.join(scenesDir, `${scene.sceneIndex}.final.mp4`);
      await muxNarrationIntoClip(rawClipPath, audioAbsPath, finalClipPath);
      finalClipAbsPaths.push(finalClipPath);

      await prisma.videoJobScene.create({
        data: {
          videoJobId: jobId,
          sceneIndex: scene.sceneIndex,
          narration: scene.narration,
          durationSeconds: scene.durationSeconds,
          visualPrompt: scene.visualPrompt,
          clipPath: toRelativePath(rawClipPath),
          audioPath: toRelativePath(audioAbsPath),
          status: "DONE",
        },
      });
    } catch (err: any) {
      await prisma.videoJobScene.create({
        data: {
          videoJobId: jobId,
          sceneIndex: scene.sceneIndex,
          narration: scene.narration,
          durationSeconds: scene.durationSeconds,
          visualPrompt: scene.visualPrompt,
          status: "FAILED",
          errorMessage: err?.message?.slice(0, 500),
        },
      });
      throw err; // dừng cả job — videoProcessor.ts đánh dấu VideoJob FAILED + hoàn tín dụng
    }
  }

  const finalAbsPath = getJobFinalPath(jobId);
  await concatClips(finalClipAbsPaths, finalAbsPath);

  const durationSeconds = storyboard.scenes.reduce((sum, s) => sum + s.durationSeconds, 0);
  return { finalRelativePath: toRelativePath(finalAbsPath), durationSeconds };
}
