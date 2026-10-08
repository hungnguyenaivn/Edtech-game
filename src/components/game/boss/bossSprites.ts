import { type Canvas, fromAscii } from "../sprites";

/** Boss "Tường lửa": khối máy chủ có một con mắt, 24×24 điểm ảnh. */
const BOSS = [
  "........kkkkkkkk........",
  "......kkrrrrrrrrkk......",
  ".....krrrrrrrrrrrrk.....",
  "....krrdddddddddddrk....",
  "...krrdkkkkkkkkkkdrrk...",
  "...krdkwwwwwwwwwwkdrk...",
  "..krrdkwwwwkkwwwwkdrrk..",
  "..krddkwwwkeekwwwkddrk..",
  "..krddkwwwkeekwwwkddrk..",
  "..krrdkwwwwkkwwwwkdrrk..",
  "...krdkwwwwwwwwwwkdrk...",
  "...krrdkkkkkkkkkkdrrk...",
  "....krrdddddddddddrk....",
  "...kkrrrrrrrrrrrrrrkk...",
  "..kyykrrggrrggrrggkyyk..",
  ".kyyykrrrrrrrrrrrrkyyyk.",
  ".kyyk.krrggrrggrrk.kyyk.",
  ".kyk..krrrrrrrrrrk..kyk.",
  ".kk...kdddddddddk...kk..",
  "......kddkkkkkkddk......",
  ".....kddk......kddk.....",
  ".....kkk........kkk.....",
  "........................",
  "........................",
];

const PAL = { k: "#1d1b2e", r: "#c2304d", d: "#7a1d33", w: "#f4f6ff", e: "#ff3d6b", g: "#22d3ee", y: "#ffb020" };
const STUNNED = { ...PAL, e: "#94a3b8", w: "#cbd5e1", g: "#475569" };
const FLASH = { k: "#ffffff", r: "#ffffff", d: "#ffd6de", w: "#ffffff", e: "#ffffff", g: "#ffffff", y: "#ffffff" };

export type BossSprites = { normal: Canvas; stunned: Canvas; flash: Canvas };

export function buildBoss(): BossSprites {
  return { normal: fromAscii(BOSS, PAL), stunned: fromAscii(BOSS, STUNNED), flash: fromAscii(BOSS, FLASH) };
}

/** "Mảnh mã" rơi ra khi đánh trúng boss. */
export function buildChip(): Canvas {
  return fromAscii(
    [
      "..k.k.k..",
      ".kkkkkkk.",
      "kkgggggkk",
      ".kgkgkgk.",
      "kkgggggkk",
      ".kgkgkgk.",
      "kkgggggkk",
      ".kkkkkkk.",
      "..k.k.k..",
    ],
    { k: "#1d1b2e", g: "#4ade80" },
  );
}
