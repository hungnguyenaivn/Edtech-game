import type { Cell } from "./mapgen";
import { rng } from "./sprites";

/**
 * Nhà trên cây: sàn gỗ 3×3 ô ở độ cao DECK_Z, có thang ở mặt +y.
 * Mỗi ô chỉ có một mặt đứng: ô thuộc sàn đứng ở độ cao DECK_Z, đất bên dưới chỉ để vẽ.
 * Chân thang (foot) là ô đất ngay trước mặt +y của sàn, đầu thang (top) là ô sàn mép trước.
 */
export type TreeHouse = {
  x: number;
  y: number;
  z: number;
  /** độ cao đất đã san phẳng quanh gốc cây */
  g: number;
  foot: { x: number; y: number };
  top: { x: number; y: number };
};

export const DECK_Z = 7;
/** bậc độ cao / giây khi leo */
export const CLIMB_SPEED = 2.2;
/** tán lá cao hơn mặt sàn chừng này bậc */
export const CANOPY_H = 5;

export function inDeck(th: TreeHouse | undefined, x: number, y: number) {
  return !!th && x >= th.x && x <= th.x + 2 && y >= th.y && y <= th.y + 2;
}

/** Bước giữa chân thang và đầu thang (theo cả hai chiều). */
export function isLadderEdge(th: TreeHouse | undefined, ax: number, ay: number, bx: number, by: number) {
  if (!th) return false;
  const isFoot = (x: number, y: number) => x === th.foot.x && y === th.foot.y;
  const isTop = (x: number, y: number) => x === th.top.x && y === th.top.y;
  return (isFoot(ax, ay) && isTop(bx, by)) || (isTop(ax, ay) && isFoot(bx, by));
}

// ---------------------------------------------------------------- leo thang

export type Pos = { x: number; y: number };

/** Một lần leo: t = 0 ở chân thang, 1 ở đầu thang. bottom/top là điểm đứng khi rời thang ở mỗi đầu. */
export type Climb = { t: number; dir: -1 | 0 | 1; auto: boolean; bottom: Pos; topPos: Pos };

/** Mép trước của sàn (đường y = th.y + 3) — người leo bám sát mặt này. */
const HUG = 0.12;

export function defaultEnds(th: TreeHouse): { bottom: Pos; topPos: Pos } {
  const cx = th.foot.x + 0.5;
  const edge = th.y + 3;
  return { bottom: { x: cx, y: edge + 0.45 }, topPos: { x: cx, y: edge - 0.45 } };
}

/** Vị trí và độ cao của người leo theo tiến độ t (liên tục ở cả hai đầu, không dịch chuyển tức thời). */
export function climbPose(th: TreeHouse, c: Climb): { x: number; y: number; z: number } {
  const cx = th.foot.x + 0.5;
  const hugY = th.y + 3 + HUG;
  const t = Math.max(0, Math.min(1, c.t));
  const z = th.g + (th.z - th.g) * Math.min(1, t / 0.9);
  const lerp = (a: number, b: number, k: number) => a + (b - a) * k;
  if (t < 0.1) return { x: lerp(c.bottom.x, cx, t / 0.1), y: lerp(c.bottom.y, hugY, t / 0.1), z };
  if (t <= 0.9) return { x: cx, y: hugY, z };
  const k = (t - 0.9) / 0.1;
  return { x: lerp(cx, c.topPos.x, k), y: lerp(hugY, c.topPos.y, k), z };
}

/** Tiến độ leo sau dt giây. */
export function stepClimb(th: TreeHouse, c: Climb, dt: number) {
  const rate = CLIMB_SPEED / Math.max(1, th.z - th.g);
  c.t = Math.max(0, Math.min(1, c.t + c.dir * rate * dt));
}

// ---------------------------------------------------------------- đặt nhà cây khi sinh bản đồ

type PlaceOpts = {
  seed: number;
  w: number;
  h: number;
  cells: Cell[][];
  height: number[][];
  /** ô không được đụng tới (đường, sân nhà) */
  locked: boolean[][];
  /** đường + nhà và 1 ô quanh chúng */
  nearRoad: boolean[][];
  stops: { bx: number; by: number; h: number }[];
  spawn: Pos;
  /** đi từ ô a sang ô kề b được không (luật của movement.ts, lúc này chưa có vật cản) */
  canStep: (ax: number, ay: number, bx: number, by: number) => boolean;
};

const PAD = 2; // sàn nới rộng chừng này ô là vùng san phẳng + dọn sạch

/** Tìm chỗ đặt nhà cây; san phẳng đất quanh gốc. Trả về nhà cây và lối mòn từ chỗ xuất phát tới chân thang. */
export function placeTreeHouse(o: PlaceOpts): { th: TreeHouse; trail: Pos[] } | undefined {
  const { w, h, height } = o;
  const r = rng(o.seed);
  const cands: { x: number; y: number; score: number }[] = [];
  for (let y = 1; y < h; y++)
    for (let x = 1; x < w; x++) {
      const c = scoreSpot(o, x, y);
      if (c !== null) cands.push({ x, y, score: c + r() * 0.5 });
    }
  cands.sort((a, b) => b.score - a.score);

  for (const c of cands) {
    const backup = height.map((row) => row.slice());
    const g = flatten(o, c.x, c.y);
    const th: TreeHouse = { x: c.x, y: c.y, z: DECK_Z, g, foot: { x: c.x + 1, y: c.y + 3 }, top: { x: c.x + 1, y: c.y + 2 } };
    const trail = findTrail(o, th.foot);
    if (trail) return { th, trail };
    for (let y = 0; y < h; y++) height[y] = backup[y];
  }
  return undefined;
}

/** Điểm của một góc sàn (x,y), null nếu không đặt được. */
function scoreSpot(o: PlaceOpts, x: number, y: number): number | null {
  const x0 = x - PAD - 1;
  const y0 = y - PAD - 1;
  const x1 = x + 2 + PAD + 1;
  const y1 = y + 2 + PAD + 1;
  if (x0 < 1 || y0 < 1 || x1 > o.w - 2 || y1 > o.h - 2) return null;
  let lo = Infinity;
  let hi = -Infinity;
  const hs: number[] = [];
  for (let yy = y0; yy <= y1; yy++)
    for (let xx = x0; xx <= x1; xx++) {
      const ground = o.cells[yy][xx].ground;
      if (ground === "water" || ground === "sand" || ground === "wall") return null;
      const inner = xx > x0 && xx < x1 && yy > y0 && yy < y1;
      if (!inner) continue;
      if (o.locked[yy][xx] || o.nearRoad[yy][xx]) return null;
      const v = o.height[yy][xx];
      lo = Math.min(lo, v);
      hi = Math.max(hi, v);
      hs.push(v);
    }
  if (hi - lo > 2) return null;
  hs.sort((a, b) => a - b);
  if (hs[hs.length >> 1] > 3) return null;

  // gần đường vừa phải để dễ thấy; tránh để tán lá che nhà phía sau; ưu tiên phía tây sông
  let roadD = Infinity;
  for (let yy = 0; yy < o.h; yy++)
    for (let xx = 0; xx < o.w; xx++)
      if (o.locked[yy][xx]) roadD = Math.min(roadD, Math.max(Math.abs(xx - (x + 1)), Math.abs(yy - (y + 1))));
  let score = -Math.abs(roadD - 5);
  for (const s of o.stops) {
    const ds = x + y + 4 - (s.bx + s.by + 2); // số đường chéo từ mép trước sàn lùi về nhà
    const side = Math.abs(s.bx - s.by - (x - y));
    if (ds >= 0 && side <= 5 && ds + s.h < DECK_Z + CANOPY_H + 3) score -= 6;
  }
  if (x + 2 + PAD > 25) score -= 3;
  return score;
}

/** San phẳng vùng sàn + PAD về độ cao g, vành ngoài thoải dần (mỗi bước chênh ≤ 1). Trả về g. */
function flatten(o: PlaceOpts, x: number, y: number): number {
  const { height } = o;
  const hs: number[] = [];
  for (let yy = y - PAD; yy <= y + 2 + PAD; yy++) for (let xx = x - PAD; xx <= x + 2 + PAD; xx++) hs.push(height[yy][xx]);
  hs.sort((a, b) => a - b);
  const g = Math.max(0, Math.min(3, hs[hs.length >> 1]));
  const dist = (xx: number, yy: number) =>
    Math.max(Math.max(x - PAD - xx, xx - (x + 2 + PAD), 0), Math.max(y - PAD - yy, yy - (y + 2 + PAD), 0));
  for (let ring = 0; ring <= 2; ring++)
    for (let yy = y - PAD - ring; yy <= y + 2 + PAD + ring; yy++)
      for (let xx = x - PAD - ring; xx <= x + 2 + PAD + ring; xx++) {
        if (yy < 0 || xx < 0 || yy >= o.h || xx >= o.w || o.locked[yy][xx] || dist(xx, yy) !== ring) continue;
        height[yy][xx] = Math.max(g - ring, Math.min(g + ring, height[yy][xx]));
      }
  return g;
}

/** Đường đi bộ (BFS) từ chỗ xuất phát tới chân thang, null nếu không tới được. */
function findTrail(o: PlaceOpts, foot: Pos): Pos[] | null {
  const key = (x: number, y: number) => y * o.w + x;
  const prev = new Map<number, number>([[key(o.spawn.x, o.spawn.y), -1]]);
  const q = [key(o.spawn.x, o.spawn.y)];
  for (let i = 0; i < q.length; i++) {
    const cur = q[i];
    const cx = cur % o.w;
    const cy = Math.floor(cur / o.w);
    if (cx === foot.x && cy === foot.y) {
      const out: Pos[] = [];
      for (let k = cur; k !== -1; k = prev.get(k)!) out.push({ x: k % o.w, y: Math.floor(k / o.w) });
      return out.reverse();
    }
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = cx + dx;
      const ny = cy + dy;
      const nk = key(nx, ny);
      if (prev.has(nk) || !o.canStep(cx, cy, nx, ny)) continue;
      prev.set(nk, cur);
      q.push(nk);
    }
  }
  return null;
}

/** Sau khi rải cây cối: dọn sạch vùng quanh nhà cây và lối mòn tới chân thang. */
export function clearTreeHouseArea(cells: Cell[][], th: TreeHouse, trail: Pos[]) {
  const clear = (x: number, y: number) => {
    const c = cells[y]?.[x];
    if (!c || c.ground === "wall") return;
    c.obj = null;
    c.decor = null;
    c.label = undefined;
  };
  for (let y = th.y - PAD; y <= th.y + 2 + PAD; y++) for (let x = th.x - PAD; x <= th.x + 2 + PAD; x++) clear(x, y);
  for (const p of trail) clear(p.x, p.y);
}
