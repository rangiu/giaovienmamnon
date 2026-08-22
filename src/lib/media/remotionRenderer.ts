import path from "node:path";
import { bundle } from "@remotion/bundler";
import { renderMedia, selectComposition } from "@remotion/renderer";
import type { RemotionScene, VideoStoryProps } from "../../../remotion/Composition";
import { startLocalAssetServer } from "./localAssetServer";
import { getStorageRoot } from "./storage";

export const REMOTION_FPS = 30;
const COMPOSITION_ID = "VideoStory";
// Số khung hình 2 cảnh liền kề chồng lấn khi crossfade (xem Composition.tsx)
// — cố định 0.4s, nhưng KẸP lại theo cảnh NGẮN NHẤT/3 để cảnh rất ngắn (VD
// lời thoại chỉ 2 giây) không bị transition nuốt mất phần lớn thời lượng
// hiển thị của chính nó.
const MAX_TRANSITION_FRAMES = 12;

// Bundle webpack cho project remotion/ chỉ cần làm 1 LẦN cho cả process
// (giống cách videoProcessor.ts đăng ký poller 1 lần) — bundling tốn vài
// giây, cache lại tránh làm lại mỗi job.
let cachedBundleUrl: string | null = null;
async function getBundleUrl(): Promise<string> {
  if (cachedBundleUrl) return cachedBundleUrl;
  cachedBundleUrl = await bundle({
    entryPoint: path.resolve(process.cwd(), "remotion/index.ts"),
  });
  return cachedBundleUrl;
}

export interface HybridSceneInput {
  /** Đường dẫn TƯƠNG ĐỐI (so với storage root) tới ẢNH DUY NHẤT của cảnh — AI vẽ trọn vẹn nhân vật+bối cảnh+vật thể trong 1 ảnh (xem videoScriptEngine.ts, assetEngine.ts). */
  imageRelativePath: string;
  audioRelativePath?: string;
  durationSeconds: number;
  narration: string;
}

/**
 * Render video Tier Hybrid bằng Remotion (Node API, server-side) — ghép
 * ẢNH DUY NHẤT/cảnh + Ken Burns + audio narration + phụ đề thành 1 file
 * MP4. KHÔNG còn ghép lớp nền/nhân vật/vật phụ riêng (xem Composition.tsx
 * v2) — mỗi cảnh chỉ có 1 ảnh AI vẽ trọn vẹn.
 *
 * QUAN TRỌNG: Chromium headless của Remotion CHẶN `file://` (đã xác nhận
 * qua test thật) — asset phải phục vụ qua HTTP, nên mở 1 static server cục
 * bộ tạm thời (127.0.0.1, đóng lại ngay sau khi render xong) trỏ vào cả
 * storage root, KHÔNG chỉ thư mục của 1 job — vì audio (nếu tái dùng asset
 * chung) có thể nằm ở thư mục job khác trong tương lai; hiện tại mỗi job
 * tự chứa asset của mình nên phạm vi storage root vẫn an toàn/đơn giản
 * nhất, không phải tính toán path tương đối phức tạp giữa nhiều thư mục.
 */
export async function renderHybridVideo(params: {
  scenes: HybridSceneInput[];
  outputAbsolutePath: string;
}): Promise<{ transitionSeconds: number }> {
  const { scenes, outputAbsolutePath } = params;
  const bundleUrl = await getBundleUrl();
  const assetServer = await startLocalAssetServer(getStorageRoot());

  try {
    const remotionScenes: RemotionScene[] = scenes.map((s) => ({
      imagePath: `${assetServer.baseUrl}/${s.imageRelativePath}`,
      audioPath: s.audioRelativePath ? `${assetServer.baseUrl}/${s.audioRelativePath}` : undefined,
      durationInFrames: Math.max(1, Math.round(s.durationSeconds * REMOTION_FPS)),
      narration: s.narration,
    }));

    // Kẹp transitionFrames theo cảnh NGẮN NHẤT/3 — tránh crossfade ăn mất
    // gần hết 1 cảnh rất ngắn (VD lời thoại chỉ 2s ~ 60 khung hình).
    const shortestSceneFrames = remotionScenes.length > 0 ? Math.min(...remotionScenes.map((s) => s.durationInFrames)) : 0;
    const transitionFrames =
      remotionScenes.length > 1 ? Math.max(0, Math.min(MAX_TRANSITION_FRAMES, Math.floor(shortestSceneFrames / 3))) : 0;

    const inputProps: VideoStoryProps = { scenes: remotionScenes, transitionFrames };

    const composition = await selectComposition({
      serveUrl: bundleUrl,
      id: COMPOSITION_ID,
      inputProps,
    });

    await renderMedia({
      composition,
      serveUrl: bundleUrl,
      codec: "h264",
      outputLocation: outputAbsolutePath,
      inputProps,
      concurrency: 1,
      jpegQuality: 80,
    });

    return { transitionSeconds: transitionFrames / REMOTION_FPS };
  } finally {
    await assetServer.close();
  }
}
