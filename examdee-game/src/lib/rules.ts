/** Luật chơi — dùng chung cho server và giao diện. */
export const QUESTIONS_PER_LEVEL = 10;
export const PASS_RATIO = 0.7; // đúng ≥ 70% thì qua level và mở level sau

export function passMark(total: number): number {
  return Math.ceil(total * PASS_RATIO);
}

/** 10 câu: 7–8 đúng = 1 sao, 9 = 2 sao, 10 = 3 sao, dưới 7 = 0 sao (chưa qua). */
export function starsFor(correct: number, total: number): number {
  if (total <= 0 || correct < passMark(total)) return 0;
  if (correct >= total) return 3;
  if (correct >= total - 1) return 2;
  return 1;
}

export const AVATAR_COLORS = ["#ef5a5a", "#3b82f6", "#2fbf71", "#f59e0b", "#a855f7", "#ec4899"];
