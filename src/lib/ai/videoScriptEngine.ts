import { PRESCHOOL_SYSTEM_INSTRUCTION } from "./systemInstruction";
import { buildFullPromptContext, ContextOptions } from "./contextBuilder";
import { hasGeminiKeys } from "./geminiKeyPool";
import { hasDeepSeekKey } from "./deepseek";
import { runAiJson, AiTier } from "./aiProvider";
import { trackAiUsage } from "./aiEngine";
import { MIN_VIDEO_DURATION_SECONDS, MAX_VIDEO_DURATION_SECONDS } from "../videoCredits";

/**
 * Sinh kịch bản/storyboard cho tính năng tạo video AI — tách riêng khỏi
 * aiEngine.ts (đã khá dài) vì đây là 1 mảng tính năng lớn riêng (video
 * credits). Theo ĐÚNG khuôn mẫu các hàm trong aiEngine.ts: guard
 * hasNoProvider() -> prompt tiếng Việt yêu cầu JSON -> runAiJson() ->
 * trackAiUsage() -> validate/default, không bao giờ throw ra ngoài.
 *
 * v2 — KIẾN TRÚC "1 ẢNH/CẢNH" (bỏ ghép lớp nền+nhân vật+vật phụ bằng code):
 * sau nhiều vòng vá lỗi ghép lớp (xoá nền trắng, cắt sprite sheet, né chồng
 * lấn vị trí...) vẫn liên tục phát sinh lỗi thật MỚI (khung trắng đè nhân
 * vật, ở NHIỀU dạng khác nhau qua từng lần vá) — bug thật đã gặp cho thấy
 * càng nhiều lớp ghép độc lập càng nhiều tổ hợp có thể vỡ. Bỏ hẳn cách ghép
 * lớp: để AI vẽ TRỌN VẸN 1 ảnh cho MỖI cảnh (nhân vật + bối cảnh + vật thể
 * trong 1 lần gọi duy nhất, giống 1 trang sách tranh thật) — giữ đồng nhất
 * nhân vật xuyên suốt bằng cách gửi kèm ẢNH THAM CHIẾU nhân vật (sinh 1 lần
 * cho cả video, xem assetEngine.ts) làm điều kiện hoá cho MỌI cảnh nhân vật
 * đó xuất hiện — đã XÁC MINH THẬT kỹ thuật này qua đúng proxy đang dùng
 * (gemini-2.5-flash-image giữ đúng màu lông/hoạ tiết/phong cách khi gửi
 * kèm ảnh tham chiếu, khác hẳn hẳn so với chỉ mô tả lại bằng chữ) trước khi
 * xây. Không còn sprite sheet (spriteSheet.ts), không còn xoá nền
 * (backgroundRemoval.ts), không còn vị trí trái/phải/xa/gần — AI tự bố cục
 * cả cảnh, đơn giản hơn hẳn và loại bỏ toàn bộ lớp lỗi ghép ảnh cũ.
 */

export type VideoAssetKind = "CHARACTER";

export interface VideoStoryboardAsset {
  key: string;
  kind: VideoAssetKind;
  /** Prompt tiếng Anh mô tả chi tiết nhân vật — dùng để vẽ 1 ẢNH THAM CHIẾU đơn (không phải sprite sheet), dùng chung cho Hybrid (điều kiện hoá từng cảnh) và Veo (referenceImages). */
  prompt: string;
}

export interface VideoStoryboardScene {
  sceneIndex: number;
  narration: string; // Lời thoại/kể chuyện tiếng Việt cho cảnh này
  durationSeconds: number;
  /**
   * Prompt tiếng Anh mô tả TOÀN BỘ cảnh (nhân vật + hành động + bối cảnh +
   * vật thể) — AI vẽ TRỌN 1 ảnh cho cảnh này trong 1 lần gọi (Tier Hybrid).
   */
  imagePrompt: string;
  /**
   * (Các) "key" CHARACTER dùng làm ẢNH THAM CHIẾU điều kiện hoá khi vẽ cảnh
   * này — 1 phần tử cho cảnh thường, tối đa 2 cho cảnh 2 nhân vật cùng
   * tương tác (VD truyện "Thỏ và Rùa"). Tier Hybrid dùng để gửi kèm ảnh khi
   * gọi sinh ảnh cảnh; Tier Veo không dùng field này (Veo ghép
   * referenceImages ở tầm cả video, xem veoPipeline.ts).
   */
  characterKeys?: string[];
  /** Prompt tiếng Anh mô tả hành động/góc quay của cảnh — dùng cho Tier Veo. */
  visualPrompt?: string;
}

export interface VideoStoryboard {
  title: string;
  assets: VideoStoryboardAsset[];
  scenes: VideoStoryboardScene[];
}

function hasNoProvider(): boolean {
  return !hasGeminiKeys() && !hasDeepSeekKey();
}

// Hybrid (ảnh tĩnh + Remotion): cảnh có thể dài/ngắn tự do trong khoảng hợp lý.
const HYBRID_SCENE_MIN_SECONDS = 3;
const HYBRID_SCENE_MAX_SECONDS = 12;
// Veo: giới hạn CỨNG của Google, mỗi lần gọi API chỉ nhận 4-8 giây — storyboard
// đề xuất trong khoảng này ngay từ đầu để hạn chế phải cắt/gộp lại sau.
const VEO_SCENE_MIN_SECONDS = 4;
const VEO_SCENE_MAX_SECONDS = 8;

// Tốc độ đọc tiếng Việt tự nhiên trung bình — quy đổi giây <-> số từ để ra
// "ngân sách từ" cho mỗi cảnh, đưa THẲNG vào đề bài cho AI (thay vì chỉ nói
// số giây rồi hy vọng AI tự đoán đúng độ dài lời kể). Theo tham khảo chuẩn
// ngành (130-150 từ/phút cho lời kể/thuyết minh) — dùng mốc giữa quy tròn
// đơn giản. Export để hybridPipeline.ts dùng CHUNG hằng số này cho lưới an
// toàn cắt bớt sau cùng — không để 2 nơi tự đoán tốc độ đọc khác nhau.
export const VIETNAMESE_WORDS_PER_SECOND = 140 / 60; // ≈ 2.33 từ/giây

function clampDuration(value: any, tier: "HYBRID" | "VEO"): number {
  const [min, max] = tier === "VEO" ? [VEO_SCENE_MIN_SECONDS, VEO_SCENE_MAX_SECONDS] : [HYBRID_SCENE_MIN_SECONDS, HYBRID_SCENE_MAX_SECONDS];
  const num = Number(value);
  if (!Number.isFinite(num)) return min;
  return Math.min(max, Math.max(min, Math.round(num)));
}

// Giới hạn tổng số NHÂN VẬT KHÁC NHAU cho cả video (mỗi nhân vật = 1 ảnh
// tham chiếu = 1 lần gọi sinh ảnh) — không cần biến thể hành động nữa (ảnh
// tham chiếu + prompt mô tả hành động trong TỪNG cảnh là đủ để đổi tư thế
// mà vẫn giữ đồng nhất, đã xác minh thật), nên trần thấp hơn hẳn bản cũ.
const MAX_CHARACTER_ASSETS_TOTAL = 3;
// Trần số nhân vật dùng làm ảnh tham chiếu ĐỒNG THỜI cho 1 cảnh — cảnh có
// NHIỀU hơn 1 ảnh tham chiếu (nhân vật tương tác) khó giữ đúng cả 2 hơn hẳn
// so với 1 ảnh tham chiếu (ghi nhận thật từ thực tế sử dụng mô hình này),
// nên KHÔNG cho vượt quá 2 dù kỹ thuật có thể gửi nhiều hơn.
const MAX_CHARACTER_KEYS_PER_SCENE = 2;

/** Validate + làm sạch JSON AI trả về — không tin tưởng mù quáng cấu trúc/giới hạn AI tự đề xuất. */
function validateStoryboard(parsed: any, tier: "HYBRID" | "VEO", targetSceneCount?: number): VideoStoryboard | null {
  if (!parsed || typeof parsed !== "object") return null;
  const rawAssets = Array.isArray(parsed.assets) ? parsed.assets : [];
  let rawScenes = Array.isArray(parsed.scenes) ? parsed.scenes : [];
  if (rawScenes.length === 0) return null;

  // Số token đã trừ lúc submit tính THEO ĐÚNG targetSceneCount (xem
  // videoCredits.ts) — nếu AI trả về NHIỀU cảnh hơn mục tiêu, cắt bớt để
  // chi phí thật KHÔNG BAO GIỜ vượt quá số đã trừ (ít cảnh hơn mục tiêu thì
  // chấp nhận được, giáo viên chỉ nhận video hơi ngắn hơn dự kiến, không bị
  // tính thiếu — an toàn hơn hẳn chiều ngược lại).
  if (targetSceneCount && rawScenes.length > targetSceneCount) {
    rawScenes = rawScenes.slice(0, targetSceneCount);
  }

  const assets: VideoStoryboardAsset[] = rawAssets
    .filter((a: any) => a && typeof a.key === "string" && a.key.trim())
    .slice(0, MAX_CHARACTER_ASSETS_TOTAL)
    .map((a: any) => ({
      key: String(a.key).trim(),
      kind: "CHARACTER" as const,
      prompt: String(a.prompt || "").trim() || "A cute, friendly preschool cartoon character, full body, simple clean background",
    }));

  // Fallback nếu AI không đề xuất nhân vật nào — vẫn cần ít nhất 1 để pipeline
  // có ảnh tham chiếu dùng cho mọi cảnh.
  if (assets.length === 0) {
    assets.push({
      key: "character_main",
      kind: "CHARACTER",
      prompt: "A cute, friendly preschool cartoon character, full body, simple clean background",
    });
  }
  const assetKeys = new Set(assets.map((a) => a.key));
  const firstCharacterKey = assets[0].key;

  const scenes: VideoStoryboardScene[] = rawScenes
    .filter((s: any) => s && typeof s.narration === "string" && s.narration.trim())
    .map((s: any, idx: number) => {
      const rawKeys = Array.isArray(s.characterKeys) ? s.characterKeys : [];
      const characterKeys = rawKeys
        .filter((k: any) => typeof k === "string" && assetKeys.has(k))
        .slice(0, MAX_CHARACTER_KEYS_PER_SCENE);

      const narration = String(s.narration).trim();
      return {
        sceneIndex: idx,
        narration,
        durationSeconds: clampDuration(s.durationSeconds, tier),
        imagePrompt: String(s.imagePrompt || "").trim() || `A children's book illustration depicting: ${narration}`,
        characterKeys: characterKeys.length > 0 ? characterKeys : [firstCharacterKey],
        visualPrompt: String(s.visualPrompt || "").trim() || undefined,
      };
    });

  if (scenes.length === 0) return null;

  return {
    title: String(parsed.title || "").trim() || "Video mầm non",
    assets,
    scenes,
  };
}

export async function generateVideoStoryboard(
  rawRequest: string,
  tier: "HYBRID" | "VEO",
  contextOptions: ContextOptions = {},
  userId?: string,
  aiTier: AiTier = "FULL",
  /** Số cảnh MỤC TIÊU quy đổi từ thời lượng giáo viên chọn lúc tạo (xem estimateSceneCount() ở videoCredits.ts) — số token đã trừ tính theo đúng số này, storyboard PHẢI khớp (xem validateStoryboard's targetSceneCount). */
  targetSceneCount?: number,
  /** Thời lượng giáo viên đã chọn (giây) — dùng CHUNG với targetSceneCount để tính ngân sách từ/cảnh (xem maxWordsPerScene bên dưới), giúp AI viết lời kể vừa khít ngay từ đầu thay vì viết tự do rồi phải cắt sau. */
  requestedDurationSeconds?: number
): Promise<{ storyboard: VideoStoryboard | null; rawText: string; error?: string }> {
  if (hasNoProvider()) {
    return { storyboard: null, rawText: "", error: "MISSING_API_KEY" };
  }
  if (!rawRequest || !rawRequest.trim()) {
    return { storyboard: null, rawText: "", error: "EMPTY_REQUEST" };
  }

  const isVeo = tier === "VEO";
  // Giáo viên có thể yêu cầu phong cách ẢNH THẬT (chân thực) ngay trong ô
  // yêu cầu (VD "...dùng ảnh thật") thay vì mặc định hoạt hình dễ thương —
  // chỉ đổi PHONG CÁCH prompt sinh ảnh (vẫn do AI tự vẽ), KHÔNG phải upload
  // ảnh thật của giáo viên (việc đó cần giao diện/kiểm duyệt riêng, thuộc
  // phạm vi "chế độ nâng cao" chưa làm).
  const wantsRealisticStyle = /ảnh thật|hình thật|chân thực|như ảnh chụp|ảnh chụp thật|photorealistic|realistic/i.test(rawRequest);
  // Ngân sách từ/cảnh — quy đổi TRỰC TIẾP từ thời lượng đã chọn, đưa thẳng
  // vào đề bài để AI viết lời kể VỪA KHÍT ngay từ đầu (chuẩn ngành: đặt
  // "ngân sách từ" TRƯỚC khi viết, không phải cắt/sửa SAU khi viết xong —
  // xem thảo luận đã chốt). Bug thật lo ngại: chọn thời lượng ngắn (VD 15s)
  // cho nội dung dài (VD "kể chuyện Rùa và Thỏ" đủ tình tiết) khiến AI dồn
  // lời kể quá dài vào mỗi cảnh (không giới hạn) — audio TTS tổng hợp ra dài
  // hơn hẳn khung hình cho phép, có thể bị cắt cụt giữa câu lúc ghép video
  // (xem SCENE_MAX_SECONDS ở hybridPipeline.ts). Có ngân sách rõ ràng ngay
  // từ đầu giúp giảm hẳn khả năng này xảy ra (lưới an toàn cắt bớt vẫn giữ
  // lại ở hybridPipeline.ts cho phần AI lệch khỏi ngân sách).
  const avgSecondsPerScene =
    requestedDurationSeconds && targetSceneCount ? requestedDurationSeconds / targetSceneCount : isVeo ? 6 : 7;
  const maxWordsPerScene = Math.max(15, Math.round(avgSecondsPerScene * VIETNAMESE_WORDS_PER_SECOND));

  const styleDirective = wantsRealisticStyle
    ? "photorealistic style, natural lighting, realistic textures and fur/skin detail, like a real photograph — NOT cartoon, NOT anime, NOT flat illustration"
    : "cute preschool-friendly cartoon/flat illustration style, simple, vibrant colors";

  // Ảnh tham chiếu nhân vật — CHỈ 1 ảnh đơn (không phải sprite sheet nữa):
  // đây là điều kiện hoá gửi kèm mỗi lần vẽ 1 cảnh có nhân vật đó xuất hiện,
  // KHÔNG phải ghép lớp — nên chỉ cần 1 tư thế trung tính, rõ ràng, đủ để
  // mô hình "nhận ra đúng nhân vật này" khi vẽ cảnh mới với hành động khác.
  const characterPrompt =
    `Detailed English prompt to draw this EXACT character/species named or clearly implied in the teacher's request (VD nếu yêu cầu nhắc 'Thỏ' thì đây PHẢI là 1 con thỏ thật, KHÔNG vẽ người) — mô tả rõ màu sắc/hoạ tiết/trang phục CỐ ĐỊNH (để giữ đúng khi dùng làm ảnh tham chiếu cho các cảnh sau), ${styleDirective}, full body, standing neutral pose, simple plain background, no scenery, no other characters`;

  const characterGuidance = `
- Nhân vật (kind CHARACTER): PHẢI vẽ ĐÚNG loài/nhân vật được nêu tên hoặc ngụ ý rõ trong yêu cầu của giáo viên (VD yêu cầu nhắc "Thỏ" → PHẢI mô tả rõ 1 CON THỎ thật (tai dài, lông...), "Rùa" → 1 CON RÙA thật (mai, đi chậm...) — TUYỆT ĐỐI KHÔNG vẽ người/trẻ em chung chung thay thế cho con vật được nhắc tới). Nếu yêu cầu không nêu loài cụ thể thì được tự chọn nhân vật phù hợp nội dung.
- NẾU câu chuyện xoay quanh TỪ 2 NHÂN VẬT CHÍNH RIÊNG BIỆT trở lên (VD Thỏ VÀ Rùa, Sói VÀ Cừu — khác hẳn nhau, không phải cùng 1 nhân vật đổi cảm xúc) → BẮT BUỘC tạo asset CHARACTER RIÊNG cho MỖI nhân vật đó (VD "character_tho", "character_rua") — mỗi nhân vật mô tả CỐ ĐỊNH màu sắc/hoạ tiết/trang phục riêng, không trộn lẫn. Tối đa ${MAX_CHARACTER_ASSETS_TOTAL} nhân vật cho cả video — không cần tạo thêm asset cho biến thể hành động/cảm xúc (1 ảnh tham chiếu + mô tả hành động trong TỪNG CẢNH ở "imagePrompt" là đủ để đổi tư thế mà vẫn giữ đúng nhân vật).`;

  const imagePromptGuidance = isVeo
    ? ""
    : `
- "imagePrompt" (tiếng Anh) PHẢI mô tả TOÀN BỘ cảnh trong 1 đoạn văn duy nhất — bối cảnh/nơi chốn, nhân vật đang làm gì/cảm xúc gì, MỌI vật thể/con vật/đồ vật được NHẮC TỚI RÕ trong lời kể của CHÍNH cảnh đó (cây, hoa, đồ vật khác...) — như đang mô tả cho hoạ sĩ vẽ 1 trang sách tranh hoàn chỉnh, không chỉ mỗi nhân vật đứng trên nền trống.
- LUÔN nhắc lại NGẮN GỌN đặc điểm cố định của (các) nhân vật xuất hiện trong cảnh đó (màu sắc/hoạ tiết/trang phục — đúng như đã mô tả ở asset CHARACTER) ngay trong "imagePrompt", VÍ DỤ: "...featuring the same white rabbit with a blue polka-dot bow tie (as shown in the reference image)..." — việc nhắc lại này giúp mô hình giữ đúng nhân vật khi có ảnh tham chiếu gửi kèm, KHÔNG chỉ dựa vào ảnh.
- "characterKeys" (mảng 1-2 phần tử) là (các) nhân vật xuất hiện/được nhắc tới trong CHÍNH cảnh đó — CHỈ liệt kê nhân vật ĐANG THỰC SỰ có trong cảnh (KHÔNG hiện nhân vật A trong khi lời kể đang nói riêng về nhân vật B). Cảnh có 2 nhân vật tương tác thì liệt kê CẢ HAI và mô tả rõ trong "imagePrompt" vị trí/tương tác giữa 2 nhân vật (VD "the rabbit standing on the left, the turtle on the right, both looking at the finish line ahead").
- NẾU lời kể của cảnh mang tính GIẢI THÍCH/GIỚI THIỆU đặc điểm cụ thể (VD "Thỏ có đôi tai dài để nghe rất thính") — mô tả thêm trong "imagePrompt" 1 chi tiết trực quan chỉ RÕ vào đặc điểm đó (VD "a simple circular highlight or a small arrow shape pointing at the rabbit's long ears") — TUYỆT ĐỐI KHÔNG yêu cầu vẽ CHỮ/NHÃN/TEXT trong ảnh (mô hình vẽ chữ không chính xác, đặc biệt tiếng Việt có dấu — phần chữ nhãn sẽ do hệ thống tự đè lên sau bằng công nghệ khác, không phải AI vẽ).
- Bối cảnh mỗi cảnh chọn theo ĐÚNG nội dung lời kể của CHÍNH cảnh đó (không lặp lại y hệt bối cảnh cảnh trước nếu nội dung đã chuyển sang tình huống/nơi chốn khác).`;

  const prompt = `
Bạn là biên kịch & đạo diễn video hoạt hình cho trẻ mầm non Việt Nam.
Yêu cầu của giáo viên: "${rawRequest.trim()}".

Hãy viết kịch bản video ngắn (dạng storyboard nhiều cảnh) theo ĐÚNG định dạng JSON sau (không thêm văn bản ngoài khối JSON):

{
  "title": "Tên video ngắn gọn",
  "assets": [
    { "key": "character_main", "kind": "CHARACTER", "prompt": "${characterPrompt.replace(/"/g, '\\"')}" }
  ],
  "scenes": [
    {
      "sceneIndex": 0,
      "narration": "Lời kể/thoại tiếng Việt cho cảnh này, tự nhiên, phù hợp trẻ mầm non",
      "durationSeconds": ${isVeo ? 6 : 5}${
        isVeo
          ? ""
          : `,
      "imagePrompt": "Detailed English prompt describing the FULL scene — setting, character action/mood, all objects mentioned in the narration",
      "characterKeys": ["character_main"]`
      },
      "visualPrompt": "English description of the action/camera angle in this scene, for AI video generation"
    }
  ]
}

QUAN TRỌNG:
- Thiết kế nhân dạng của MỖI nhân vật (khuôn mặt/màu sắc/hình dáng loài) PHẢI đồng nhất xuyên suốt mọi cảnh nhân vật đó xuất hiện — chỉ hành động/tư thế đổi theo từng cảnh, KHÔNG đổi thiết kế/loài.${characterGuidance}${imagePromptGuidance}
- Mỗi cảnh "characterKeys[]" PHẢI trùng đúng 1 "key" đã khai báo trong "assets".
- durationSeconds mỗi cảnh trong khoảng ${isVeo ? "4-8 giây (giới hạn cứng của công cụ tạo video)" : "3-12 giây"}.
- "narration" mỗi cảnh TỐI ĐA khoảng ${maxWordsPerScene} từ tiếng Việt (khớp ~${Math.round(avgSecondsPerScene)} giây đọc/cảnh, tốc độ đọc tự nhiên ~140 từ/phút) — nếu nội dung yêu cầu nhiều tình tiết hơn mức ngân sách này cho phép, ƯU TIÊN kể súc tích/giữ đúng mạch chính hơn là viết dài rồi vượt ngân sách, KHÔNG dồn nhiều câu dài vào 1 cảnh.
- Số lượng cảnh: ${
    targetSceneCount
      ? `PHẢI dùng ĐÚNG ${targetSceneCount} cảnh (khớp thời lượng giáo viên đã chọn lúc tạo, đã tính sẵn số token tương ứng) — không ít hơn, không nhiều hơn.`
      : `vừa đủ kể trọn câu chuyện/nội dung yêu cầu, không quá dài dòng (khuyến nghị ${isVeo ? "4-8" : "5-14"} cảnh — có thể dùng nhiều cảnh hơn khi nội dung nhiều chi tiết/tình tiết để kể mượt mà, tự nhiên hơn, không dồn quá nhiều ý vào 1 cảnh).`
  }
- Lời thoại "narration" bằng tiếng Việt, các prompt hình ảnh ("prompt"/"imagePrompt"/"visualPrompt") bằng tiếng Anh (để tương thích công cụ tạo hình/video AI).
`;

  try {
    const fullPrompt = buildFullPromptContext(prompt, contextOptions);
    const result = await runAiJson(aiTier, { systemInstruction: PRESCHOOL_SYSTEM_INSTRUCTION, prompt: fullPrompt });

    await trackAiUsage(userId, "video_storyboard", result.modelUsed, result.inputTokens, result.outputTokens);

    const storyboard = validateStoryboard(result.parsed, tier, targetSceneCount);
    if (!storyboard) {
      return { storyboard: null, rawText: result.rawText, error: "INVALID_STORYBOARD" };
    }
    return { storyboard, rawText: result.rawText };
  } catch (err: any) {
    return { storyboard: null, rawText: "", error: err?.message };
  }
}

/**
 * Ước lượng thời lượng CẦN THIẾT để kể trọn nội dung yêu cầu — gọi TRƯỚC
 * khi giáo viên xác nhận tạo video (chưa trừ token), để cảnh báo sớm nếu
 * thời lượng đang chọn quá ngắn/quá dài so với nội dung thật (lớp 1 trong 3
 * lớp đã bàn: cảnh báo TRƯỚC khi tính tiền, thay vì chỉ xử lý SAU khi lỗi
 * xảy ra). Trả về số giây CHÍNH XÁC AI ước lượng (VD 32, 47 — không làm
 * tròn về mốc 5/10 gần nhất) vì giáo viên có thể áp dụng thẳng số này làm
 * thời lượng thật (ô nhập số tự do ở VideoStudioClient.tsx, không còn bị ép
 * theo các mốc preset cố định).
 */
export async function estimateStoryDurationSeconds(
  rawRequest: string,
  userId?: string
): Promise<{ estimatedSeconds: number | null; error?: string }> {
  if (hasNoProvider()) return { estimatedSeconds: null, error: "MISSING_API_KEY" };
  if (!rawRequest || !rawRequest.trim()) return { estimatedSeconds: null, error: "EMPTY_REQUEST" };

  const prompt = `
Bạn là biên kịch video hoạt hình cho trẻ mầm non Việt Nam.
Yêu cầu của giáo viên: "${rawRequest.trim()}".

Ước lượng: nếu kể TRỌN VẸN nội dung này (đủ mở đầu — diễn biến chính — kết thúc/bài học, không lược bớt tình tiết chính, không kể lan man) bằng giọng đọc tự nhiên (~140 từ/phút), cần khoảng BAO NHIÊU GIÂY audio?

Trả về ĐÚNG định dạng JSON sau, không thêm văn bản ngoài khối JSON:
{ "estimatedSeconds": <số nguyên, giây> }

Lưu ý: số giây phải nằm trong khoảng ${MIN_VIDEO_DURATION_SECONDS}-${MAX_VIDEO_DURATION_SECONDS}. Nếu yêu cầu quá ngắn/chung chung (VD chỉ 1 câu, không có cốt truyện rõ) thì ước lượng ở mức tối thiểu hợp lý (khoảng ${MIN_VIDEO_DURATION_SECONDS}-30 giây), không cần cố kéo dài.
`;

  try {
    // "LIMITED" — lệnh ước lượng chỉ cần model rẻ/nhanh, không cần chất
    // lượng ngang lúc viết kịch bản thật (aiTier "FULL" ở generateVideoStoryboard).
    const result = await runAiJson("LIMITED", { systemInstruction: PRESCHOOL_SYSTEM_INSTRUCTION, prompt });
    await trackAiUsage(userId, "video_duration_estimate", result.modelUsed, result.inputTokens, result.outputTokens);

    const raw = Number(result.parsed?.estimatedSeconds);
    if (!Number.isFinite(raw)) return { estimatedSeconds: null, error: "INVALID_RESPONSE" };

    const clamped = Math.min(MAX_VIDEO_DURATION_SECONDS, Math.max(MIN_VIDEO_DURATION_SECONDS, Math.round(raw)));
    return { estimatedSeconds: clamped };
  } catch (err: any) {
    return { estimatedSeconds: null, error: err?.message };
  }
}
