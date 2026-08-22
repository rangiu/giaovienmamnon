/** Bộ biểu cảm kiểu Facebook dùng cho bài đăng ở Diễn đàn phản hồi. */
export const REACTION_TYPES = ["like", "love", "haha", "wow", "sad", "angry"] as const;
export type ReactionType = (typeof REACTION_TYPES)[number];

export const REACTION_EMOJI: Record<ReactionType, string> = {
  like: "👍",
  love: "❤️",
  haha: "😂",
  wow: "😮",
  sad: "😢",
  angry: "😠",
};

export const REACTION_LABEL: Record<ReactionType, string> = {
  like: "Thích",
  love: "Yêu thích",
  haha: "Haha",
  wow: "Wow",
  sad: "Buồn",
  angry: "Phẫn nộ",
};

export function isValidReaction(value: any): value is ReactionType {
  return REACTION_TYPES.includes(value);
}
