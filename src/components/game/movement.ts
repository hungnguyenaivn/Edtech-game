import type { Cell, Theme } from "./mapgen";
import { isSolid } from "./mapgen";

/** Luật di chuyển trên bản đồ overworld — dùng chung cho tìm đường, va chạm và kiểm tra khả năng đi tới. */

export type MoveMode = "walk" | "swim";

export type MoveMap = {
  w: number;
  h: number;
  cells: Cell[][];
  height: number[][];
  stops: { bx: number; by: number }[];
  theme: Theme;
};

/** Tốc độ (ô / giây) theo kiểu di chuyển. */
export const MOVE_SPEED: Record<MoveMode, number> = { walk: 3.4, swim: 1.8 };

/** Mỗi bước giữa hai ô kề nhau chỉ được chênh tối đa chừng này bậc cao. */
export const MAX_STEP = 1;

/** Nhà chiếm 2×2 ô. */
export function inStop(stops: { bx: number; by: number }[], x: number, y: number) {
  return stops.some((s) => x >= s.bx && x <= s.bx + 1 && y >= s.by && y <= s.by + 1);
}

/** Ô có chặn đường không? Nước chỉ chặn ở thế giới không cho bơi. */
export function isBlocked(map: MoveMap, tx: number, ty: number) {
  if (tx < 0 || ty < 0 || tx >= map.w || ty >= map.h) return true;
  const c = map.cells[ty][tx];
  if (c.ground === "water" && c.obj === null) return !map.theme.swimmable;
  return isSolid(c) || inStop(map.stops, tx, ty);
}

export function tileMode(map: MoveMap, tx: number, ty: number): MoveMode {
  return map.theme.swimmable && map.cells[ty]?.[tx]?.ground === "water" ? "swim" : "walk";
}

/** Đi từ ô a sang ô kề b được không (không vướng vật cản, không chênh quá cao). */
export function canStep(map: MoveMap, ax: number, ay: number, bx: number, by: number) {
  if (isBlocked(map, bx, by)) return false;
  return Math.abs((map.height[by]?.[bx] ?? 0) - (map.height[ay]?.[ax] ?? 0)) <= MAX_STEP;
}
