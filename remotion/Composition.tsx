import React, { useMemo } from "react";
import { AbsoluteFill, Audio, Img, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { TransitionSeries, linearTiming } from "@remotion/transitions";
import { fade } from "@remotion/transitions/fade";

/**
 * Composition Hybrid — v2 "1 ẢNH/CẢNH": mỗi cảnh chỉ có ĐÚNG 1 ảnh do AI vẽ
 * TRỌN VẸN (nhân vật + bối cảnh + vật thể trong 1 lần gọi, xem
 * videoScriptEngine.ts/assetEngine.ts) — KHÔNG còn ghép lớp nền/nhân
 * vật/vật phụ riêng bằng code như bản trước (sprite sheet, xoá nền, vị trí
 * trái/phải/xa/gần). Sau nhiều vòng vá lỗi ghép lớp vẫn liên tục phát sinh
 * lỗi thật MỚI (khung trắng đè nhân vật, ở nhiều dạng khác nhau) — bug thật
 * cho thấy càng nhiều lớp ghép độc lập càng nhiều tổ hợp có thể vỡ, nên bỏ
 * hẳn cách ghép lớp, giữ đồng nhất nhân vật bằng ẢNH THAM CHIẾU gửi kèm lúc
 * sinh ảnh (không phải bằng compositing lúc render).
 *
 * Vẫn giữ nguyên (đã chạy tốt, không đổi): hiệu ứng Ken Burns trên ảnh cảnh
 * (đổi hướng theo từng cảnh cho đỡ lặp), phụ đề TÁCH NHỎ theo từng câu
 * (hiện lần lượt, không dồn cả đoạn dài vào 1 khối), narration audio.
 *
 * 2 lỗi thật đã sửa thêm ở bản này:
 * 1. Phụ đề: "chunkByWords" bản cũ NHỒI ĐẦY từng dòng sát MAX_CAPTION_CHARS
 *    rồi mới xuống dòng mới — hay để lại 1 TỪ MỒ CÔI ở dòng cuối (VD "...và
 *    chạy vào" | "nhà." — dòng cuối chỉ 1 từ, đọc rất cụt, không tự nhiên).
 *    Sửa: tính trước SỐ DÒNG cần rồi CHIA ĐỀU độ dài mục tiêu cho mỗi dòng
 *    (bọc chữ cân bằng) thay vì luôn nhồi tối đa rồi tràn.
 * 2. Chuyển cảnh: bản cũ mỗi cảnh tự fade in/out ĐỘC LẬP trong Sequence của
 *    chính nó — 2 cảnh liền kề không hề chồng lấn thời gian nên nhìn như CẮT
 *    CỨNG (2 lần fade rời rạc, không phải 1 lần chuyển mượt). Sửa: dùng
 *    TransitionSeries + fade() của @remotion/transitions để 2 cảnh liền kề
 *    THẬT SỰ chồng lấn TRANSITION_FRAMES khung hình, mờ dần vào nhau đúng
 *    kiểu crossfade — không còn tự fade riêng trong từng Scene nữa (đã bỏ),
 *    chỉ còn 1 lớp fade-từ-đen/fade-về-đen ở ĐẦU/CUỐI cả video (VideoStory).
 */

export interface RemotionScene {
  /** URL http(s) tới ẢNH DUY NHẤT của cảnh này (phục vụ qua localAssetServer — xem remotionRenderer.ts). */
  imagePath: string;
  /** URL http(s) tới file audio narration (nếu có). */
  audioPath?: string;
  durationInFrames: number;
  narration: string;
}

// Phụ đề: KHÔNG hiện nguyên cả "narration" 1 lần suốt cảnh (dài, chiếm
// nhiều diện tích) — tách thành từng câu/mệnh đề NGẮN, hiện LẦN LƯỢT theo
// đúng đề xuất thật của người dùng (VD "Chào các bạn." rồi mới tới "Mình là
// Thỏ đây."). Ưu tiên tách theo dấu câu (. ! ? …) trước, nếu 1 câu vẫn còn
// dài thì tách tiếp theo dấu phẩy, cuối cùng mới cắt cứng theo từ.
const MAX_CAPTION_CHARS = 42;
// Sàn tối thiểu số frame mỗi đoạn phụ đề được hiện — tránh đoạn quá ngắn
// (VD "Ơ!") bị lướt qua trong tích tắc không kịp đọc.
const MIN_CAPTION_FRAMES = 18;

function chunkByWords(text: string, maxChars: number): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  if (words.length === 0) return [];
  if (words.length === 1) return [words[0]];

  // Bọc CÂN BẰNG: tính trước số dòng cần (dựa tổng độ dài chữ), rồi chia
  // đều độ dài mục tiêu cho mỗi dòng — thay vì nhồi đầy sát maxChars rồi
  // mới tràn dòng mới (cách cũ hay để lại 1 từ mồ côi ở dòng cuối).
  const totalLen = text.length;
  const numChunks = Math.max(1, Math.ceil(totalLen / maxChars));
  const targetLen = Math.ceil(totalLen / numChunks);

  const chunks: string[] = [];
  let current = "";
  for (const word of words) {
    const next = current ? `${current} ${word}` : word;
    const chunksRemainingAfterThis = numChunks - chunks.length - 1;
    if (current && next.length > targetLen && chunksRemainingAfterThis > 0) {
      chunks.push(current);
      current = word;
    } else {
      current = next;
    }
  }
  if (current) chunks.push(current);
  return chunks;
}

function splitNarrationIntoCaptions(narration: string): string[] {
  const text = (narration || "").trim();
  if (!text) return [];

  const sentences = text.match(/[^.!?…]+[.!?…]*/g)?.map((s) => s.trim()).filter(Boolean) ?? [text];
  const captions: string[] = [];
  for (const sentence of sentences) {
    if (sentence.length <= MAX_CAPTION_CHARS) {
      captions.push(sentence);
      continue;
    }
    const commaParts = sentence.split(",").map((s) => s.trim()).filter(Boolean);
    const pieces = commaParts.length > 1 ? commaParts : [sentence];
    for (const piece of pieces) {
      if (piece.length <= MAX_CAPTION_CHARS) {
        captions.push(piece);
      } else {
        captions.push(...chunkByWords(piece, MAX_CAPTION_CHARS));
      }
    }
  }
  return captions.length > 0 ? captions : [text];
}

interface CaptionWindow {
  text: string;
  from: number;
  to: number;
}

/** Chia đều thời lượng cảnh cho từng đoạn phụ đề theo TỈ LỆ độ dài chữ (ước lượng gần đúng tốc độ đọc — không có forced-alignment thật với audio, nhưng đủ tốt vì TTS đọc gần như đều nhịp). */
function computeCaptionWindows(captions: string[], durationInFrames: number): CaptionWindow[] {
  if (captions.length === 0) return [];
  const weights = captions.map((c) => Math.max(c.length, 8));
  const totalWeight = weights.reduce((a, b) => a + b, 0);
  let allocated = weights.map((w) => Math.max(MIN_CAPTION_FRAMES, Math.round((w / totalWeight) * durationInFrames)));

  const sum = allocated.reduce((a, b) => a + b, 0);
  if (sum > durationInFrames) {
    allocated = allocated.map((f) => Math.max(1, Math.floor((f / sum) * durationInFrames)));
  }

  const windows: CaptionWindow[] = [];
  let cursor = 0;
  captions.forEach((text, i) => {
    const isLast = i === captions.length - 1;
    const to = isLast ? durationInFrames : cursor + allocated[i];
    windows.push({ text, from: cursor, to });
    cursor = to;
  });
  return windows;
}

export interface VideoStoryProps {
  scenes: RemotionScene[];
  /** Số khung hình 2 cảnh liền kề CHỒNG LẤN khi crossfade — tính sẵn ở remotionRenderer.ts (dựa độ dài cảnh ngắn nhất) để Root.tsx (calculateMetadata) và VideoStory dưới đây dùng ĐÚNG 1 con số thống nhất, tránh lệch tổng thời lượng. */
  transitionFrames?: number;
  // Index signature — Remotion's Composition/renderMedia typing yêu cầu
  // props tương thích Record<string, unknown>.
  [key: string]: unknown;
}

function Scene({ scene, sceneIndex }: { scene: RemotionScene; sceneIndex: number }) {
  const frame = useCurrentFrame();
  const { durationInFrames } = scene;
  const t = Math.max(durationInFrames, 1);

  // Ken Burns đổi hướng theo từng cảnh (zoom in / zoom out / lia trái / lia
  // phải luân phiên theo sceneIndex) — cùng 1 kiểu zoom-in mỗi cảnh nhìn rất
  // lặp, đổi hướng tạo cảm giác nhiều góc quay hơn dù ảnh tĩnh.
  const kenBurnsVariant = sceneIndex % 4;
  let bgScale = 1;
  let bgTranslateX = 0;
  let bgTranslateY = 0;
  const zoomProgress = interpolate(frame, [0, t], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  if (kenBurnsVariant === 0) {
    bgScale = 1 + zoomProgress * 0.08; // zoom in
  } else if (kenBurnsVariant === 1) {
    bgScale = 1.08 - zoomProgress * 0.08; // zoom out
  } else if (kenBurnsVariant === 2) {
    bgScale = 1.1;
    bgTranslateX = -zoomProgress * 3; // lia trái
  } else {
    bgScale = 1.1;
    bgTranslateX = zoomProgress * 3; // lia phải
  }

  // KHÔNG còn tự fade in/out riêng ở đây nữa — 2 cảnh liền kề giờ crossfade
  // THẬT qua TransitionSeries (xem VideoStory bên dưới), tự fade riêng ở
  // từng Scene nữa sẽ chồng thêm 1 lớp mờ nữa lên đúng lúc TransitionSeries
  // cũng đang mờ, làm đoạn chuyển bị tối/nhoè hơn thay vì mượt.

  const captionWindows = useMemo(
    () => computeCaptionWindows(splitNarrationIntoCaptions(scene.narration), t),
    [scene.narration, t]
  );
  const activeCaption = captionWindows.find((w) => frame >= w.from && frame < w.to) || captionWindows[captionWindows.length - 1];
  const captionFadeInFrames = 6;
  const captionOpacity = activeCaption
    ? interpolate(frame - activeCaption.from, [0, captionFadeInFrames], [0, 1], {
        extrapolateLeft: "clamp",
        extrapolateRight: "clamp",
      })
    : 0;

  return (
    <AbsoluteFill style={{ backgroundColor: "#0f172a" }}>
      {scene.imagePath && (
        <AbsoluteFill style={{ transform: `scale(${bgScale}) translate(${bgTranslateX}%, ${bgTranslateY}%)` }}>
          <Img src={scene.imagePath} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        </AbsoluteFill>
      )}

      {scene.audioPath && <Audio src={scene.audioPath} />}

      {activeCaption && (
        <AbsoluteFill style={{ justifyContent: "flex-end", alignItems: "center", padding: 32 }}>
          <div
            style={{
              background: "rgba(15, 23, 42, 0.68)",
              color: "white",
              fontSize: 26,
              fontWeight: 700,
              lineHeight: 1.3,
              padding: "10px 20px",
              borderRadius: 14,
              maxWidth: "78%",
              textAlign: "center",
              // "Noto Sans" cài trong Docker image (fonts-noto-core) — vẽ
              // ĐÚNG dấu ngã tiếng Việt. Segoe UI/Arial không có trên Linux,
              // để lại phòng khi chạy trên máy có sẵn (VD dev Windows).
              fontFamily: "'Noto Sans', 'Segoe UI', Arial, sans-serif",
              opacity: captionOpacity,
            }}
          >
            {activeCaption.text}
          </div>
        </AbsoluteFill>
      )}
    </AbsoluteFill>
  );
}

// Fade-từ-đen lúc video vừa mở đầu / fade-về-đen lúc video kết thúc — CHỈ ở
// đúng 2 đầu mút cả video (không phải mỗi cảnh), vì chuyển cảnh Ở GIỮA giờ
// đã có crossfade thật qua TransitionSeries bên dưới.
const BOOKEND_FADE_FRAMES = 15;

export function VideoStory({ scenes, transitionFrames = 0 }: VideoStoryProps) {
  const frame = useCurrentFrame();
  const { durationInFrames: totalFrames } = useVideoConfig();
  const list = scenes || [];

  const bookendFadeFrames = Math.min(BOOKEND_FADE_FRAMES, Math.floor(totalFrames / 4));
  const bookendOpacity = interpolate(
    frame,
    [0, bookendFadeFrames, Math.max(totalFrames - bookendFadeFrames, bookendFadeFrames + 1), totalFrames],
    [1, 0, 0, 1],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  return (
    <AbsoluteFill style={{ backgroundColor: "black" }}>
      <TransitionSeries>
        {list.map((scene, i) => (
          <React.Fragment key={i}>
            <TransitionSeries.Sequence durationInFrames={scene.durationInFrames}>
              <Scene scene={scene} sceneIndex={i} />
            </TransitionSeries.Sequence>
            {i < list.length - 1 && transitionFrames > 0 && (
              <TransitionSeries.Transition
                presentation={fade()}
                timing={linearTiming({ durationInFrames: transitionFrames })}
              />
            )}
          </React.Fragment>
        ))}
      </TransitionSeries>

      {/* Lớp phủ đen bookend — nằm TRÊN cả TransitionSeries, chỉ hiện rõ ở 2 đầu mút. */}
      <AbsoluteFill style={{ backgroundColor: "black", opacity: bookendOpacity, pointerEvents: "none" }} />
    </AbsoluteFill>
  );
}
