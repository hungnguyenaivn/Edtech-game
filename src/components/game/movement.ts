import type { Cell, Theme } from "./mapgen";
import { isSolid } from "./mapgen";
import { CLIMB_SPEED, type TreeHouse, inDeck, isLadderEdge } from "./treehouse";

/** Luật di chuyển trên bản đồ overworld — dùng chung cho tìm đường, va chạm và kiểm tra khả năng đi tới. */

export type MoveMode = "walk" | "swim" | "climb";

export type MoveMap = {
  w: number;
  h: number;
  cells: Cell[][];
  height: number[][];
  stops: { bx: number; by: number }[];
  theme: Theme;
  treeHouse?: TreeHouse;
};

/** Tốc độ theo kiểu di chuyển: ô / giây (riêng leo thang: bậc độ cao / giây). */
export const MOVE_SPEED: Record<MoveMode, number> = { walk: 3.4, swim: 1.8, climb: CLIMB_SPEED };

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

/** Độ cao mặt đứng của ô: ô thuộc sàn nhà cây đứng ở độ cao sàn, còn lại là mặt đất. */
export function surfaceH(map: MoveMap, x: number, y: number) {
  return map.treeHouse && inDeck(map.treeHouse, x, y) ? map.treeHouse.z : (map.height[y]?.[x] ?? 0);
}

/** Đi từ ô a sang ô kề b được không (không vướng vật cản, không chênh quá cao — trừ khi leo thang). */
export function canStep(map: MoveMap, ax: number, ay: number, bx: number, by: number) {
  if (isBlocked(map, bx, by)) return false;
  if (isLadderEdge(map.treeHouse, ax, ay, bx, by)) return true;
  return Math.abs(surfaceH(map, bx, by) - surfaceH(map, ax, ay)) <= MAX_STEP;
}
