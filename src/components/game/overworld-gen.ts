import { type Cell, type GameMap, THEMES, isSolid } from "./mapgen";
import { canStep, inStop } from "./movement";
import { carveRiver } from "./river";
import { hashString, rng } from "./sprites";

/** Màu mái nhà của từng level — bé nhìn màu là nhớ "nhà số mấy". */
export const STOP_COLORS = ["#ff6b6b", "#ffb020", "#2fbf71", "#3b82f6", "#a855f7"];

const MAP_W = 34;
const GAP = 7; // số ô giữa hai ngôi nhà theo chiều dọc
const XS = [14, 24, 6, 22, 8];
export const MAX_H = 5; // độ cao lớn nhất (đỉnh đồi)

/** Một điểm dừng trên bản đồ: nhà level, hoặc kho báu ở cuối đường. Nhà chiếm 2×2 ô, cửa quay về phía +y. */
export type Stop = { kind: "level" | "finish"; bx: number; by: number; h: number };
export type OverworldMap = GameMap & { stops: Stop[]; height: number[][] };

export type StationInfo = {
  number: number;
  title: string;
  unlocked: boolean;
  passed: boolean;
  stars: number;
  current: boolean;
};

/** Độ cao của sân nhà: lên xuống nhấp nhô nhưng nhìn chung cao dần, kho báu nằm trên đỉnh. */
function stopHeights(levelCount: number): number[] {
  const hs: number[] = [0];
  for (let i = 1; i <= levelCount; i++) {
    const prev = hs[i - 1];
    let h = Math.round(i * 0.9 + Math.sin(i * 1.9) * 1.6);
    h = Math.max(0, Math.min(MAX_H - 1, h));
    hs.push(Math.max(prev - 3, Math.min(prev + 3, h)));
  }
  if (levelCount > 0) hs[levelCount] = Math.min(MAX_H, hs[levelCount - 1] + 3);
  return hs;
}

/** Nhiễu mượt 2 tầng để nặn đồi núi hai bên đường. */
function makeNoise(r: () => number, w: number, h: number) {
  const layer = (cell: number) => {
    const gw = Math.ceil(w / cell) + 2;
    const gh = Math.ceil(h / cell) + 2;
    const g = Array.from({ length: gh }, () => Array.from({ length: gw }, () => r()));
    return (x: number, y: number) => {
      const fx = x / cell;
      const fy = y / cell;
      const ix = Math.floor(fx);
      const iy = Math.floor(fy);
      const sm = (t: number) => t * t * (3 - 2 * t);
      const tx = sm(fx - ix);
      const ty = sm(fy - iy);
      const a = g[iy][ix] + (g[iy][ix + 1] - g[iy][ix]) * tx;
      const b = g[iy + 1][ix] + (g[iy + 1][ix + 1] - g[iy + 1][ix]) * tx;
      return a + (b - a) * ty;
    };
  };
  const big = layer(8);
  const small = layer(3.5);
  return (x: number, y: number) => big(x, y) * 0.75 + small(x, y) * 0.25;
}

/** Bản đồ cố định cho mỗi thế giới: con đường ngoằn ngoèo leo đồi từ dưới lên, nhà level 1..n rồi tới kho báu trên đỉnh. */
export function buildOverworld(slug: string, levelCount: number): OverworldMap {
  const theme = THEMES[slug] ?? THEMES["toan-ly-hoa"];
  const r = rng(hashString(slug + ":overworld"));
  const W = MAP_W;
  const H = GAP * levelCount + 9;
  const cells: Cell[][] = Array.from({ length: H }, () => Array.from({ length: W }, () => ({ ground: "A" as Cell["ground"], obj: null, decor: null })));
  const inside = (x: number, y: number) => x > 0 && y > 0 && x < W - 1 && y < H - 1;
  const frontRow = (i: number) => H - 5 - GAP * i;
  const grid = <V>(v: V) => Array.from({ length: H }, () => Array<V>(W).fill(v));

  const hs = stopHeights(levelCount);
  const lastX = XS[(levelCount - 1) % XS.length];
  const finishX = Math.abs(15 - lastX) >= 4 ? 15 : 24;
  const stops: Stop[] = Array.from({ length: levelCount + 1 }, (_, i) => ({
    kind: i < levelCount ? "level" : "finish",
    bx: i < levelCount ? XS[i % XS.length] : finishX,
    by: frontRow(i) - 2,
    h: hs[i],
  }));

  // Mảng nền B cho đỡ đơn điệu
  for (let i = 0; i < 26; i++) {
    const cx = Math.floor(r() * W);
    const cy = Math.floor(r() * H);
    const rad = 1.5 + r() * 3;
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if ((x - cx) ** 2 + (y - cy) ** 2 < rad * rad) cells[y][x].ground = "B";
  }

  // Đường đi rộng 2 ô
  const road = grid(false);
  const carve = (x0: number, y0: number, x1: number, y1: number) => {
    for (let y = Math.min(y0, y1); y <= Math.max(y0, y1); y++)
      for (let x = Math.min(x0, x1); x <= Math.max(x0, x1); x++)
        if (inside(x, y)) {
          cells[y][x].ground = "path";
          road[y][x] = true;
        }
  };
  carve(stops[0].bx - 2, frontRow(0), stops[0].bx + 3, frontRow(0) + 2); // quảng trường xuất phát
  for (let i = 0; i < levelCount; i++) {
    const a = stops[i];
    const b = stops[i + 1];
    carve(a.bx, frontRow(i), b.bx + 1, frontRow(i) + 1);
    carve(b.bx, frontRow(i + 1), b.bx + 1, frontRow(i) + 1);
  }

  // ---- Địa hình: đường là các bậc thang dốc, sân nhà phẳng; xa đường thì thành đồi/thung lũng theo nhiễu
  const rowRamp = (y: number) => {
    for (let i = 0; i <= levelCount; i++) {
      if (y >= frontRow(i)) return hs[i];
      if (i < levelCount && y > frontRow(i + 1)) {
        const t = (frontRow(i) - y) / (frontRow(i) - frontRow(i + 1));
        return Math.round(hs[i] + (hs[i + 1] - hs[i]) * t);
      }
    }
    return hs[levelCount];
  };
  const height = grid(0);
  const locked = grid(false);
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++)
      if (road[y][x]) {
        locked[y][x] = true;
        height[y][x] = rowRamp(y);
      }
  for (const s of stops)
    for (let y = s.by - 1; y <= s.by + 2; y++)
      for (let x = s.bx - 1; x <= s.bx + 2; x++)
        if (inside(x, y)) {
          locked[y][x] = true;
          height[y][x] = s.h;
        }

  // lan độ cao từ các ô cố định ra xung quanh
  const dist = grid(-1);
  const src = grid(0);
  const q: [number, number][] = [];
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++)
      if (locked[y][x]) {
        dist[y][x] = 0;
        src[y][x] = height[y][x];
        q.push([x, y]);
      }
  for (let i = 0; i < q.length; i++) {
    const [x, y] = q[i];
    for (let dy = -1; dy <= 1; dy++)
      for (let dx = -1; dx <= 1; dx++) {
        const nx = x + dx;
        const ny = y + dy;
        if (nx < 0 || ny < 0 || nx >= W || ny >= H || dist[ny][nx] >= 0) continue;
        dist[ny][nx] = dist[y][x] + 1;
        src[ny][nx] = src[y][x];
        q.push([nx, ny]);
      }
  }
  const noise = makeNoise(r, W, H);
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) {
      if (locked[y][x]) continue;
      const t = Math.max(0, Math.min(1, (dist[y][x] - 1) / 4));
      const n = Math.max(0, Math.min(MAX_H, Math.floor(Math.max(0, noise(x, y) - 0.12) ** 1.6 * 8)));
      height[y][x] = Math.round(src[y][x] + (n - src[y][x]) * t);
    }

  // Vùng cần chừa trống: đường + nhà (và 1–2 ô quanh chúng)
  const dilate = (mask: boolean[][], n: number) =>
    mask.map((row, y) => row.map((_, x) => {
      for (let dy = -n; dy <= n; dy++) for (let dx = -n; dx <= n; dx++) if (mask[y + dy]?.[x + dx]) return true;
      return false;
    }));
  const reserved = road.map((row, y) => row.map((v, x) => v || inStop(stops, x, y)));
  const nearRoad = dilate(reserved, 1);
  const clear2 = dilate(locked, 3);

  // Ao nước nằm dưới thung lũng (độ cao 0) — thế giới "phòng lab" không có
  const pond = grid(false);
  if (!theme.metal && !theme.swimmable) {
    for (let i = 0; i < 24; i++) {
      const cx = 4 + Math.floor(r() * (W - 8));
      const cy = 4 + Math.floor(r() * (H - 8));
      const rx = 2 + r() * 1.6;
      const ry = 1.5 + r() * 1.1;
      const shape = (x: number, y: number) => ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2;
      let ok = true;
      for (let y = 1; y < H - 1 && ok; y++) for (let x = 1; x < W - 1; x++) if (shape(x, y) < 2 && clear2[y][x]) ok = false;
      if (!ok) continue;
      for (let y = 1; y < H - 1; y++)
        for (let x = 1; x < W - 1; x++) {
          const v = shape(x, y);
          if (v < 1) {
            cells[y][x].ground = "water";
            pond[y][x] = true;
            height[y][x] = 0;
          } else if (v < 1.7 && cells[y][x].ground !== "water") cells[y][x].ground = "sand";
        }
    }
  }

  // Làm mượt: ô kề nhau lệch tối đa 2 bậc (vách đá thấp), quanh ao thì dốc xuống bờ
  for (let pass = 0; pass < 6; pass++)
    for (let y = 0; y < H; y++)
      for (let x = 0; x < W; x++) {
        if (locked[y][x] || pond[y][x]) continue;
        let lo = Infinity;
        let hi = -Infinity;
        for (let dy = -1; dy <= 1; dy++)
          for (let dx = -1; dx <= 1; dx++) {
            const v = height[y + dy]?.[x + dx];
            if (v === undefined || (dx === 0 && dy === 0)) continue;
            lo = Math.min(lo, v);
            hi = Math.max(hi, v);
          }
        if (hi - 2 <= lo + 2) height[y][x] = Math.max(hi - 2, Math.min(lo + 2, height[y][x]));
      }

  if (theme.swimmable) carveRiver({ seed: hashString(slug + ":river"), cells, height, locked, w: W, h: H });

  // Viền bản đồ
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++)
      if (!inside(x, y)) {
        if (theme.border === "wall") cells[y][x].ground = "wall";
        else if (cells[y][x].ground !== "water") cells[y][x].obj = theme.border as Cell["obj"];
      }

  // Cây cối, bụi, đá rải hai bên đường — trên núi cao chỉ còn đá
  const total = theme.obstacles.reduce((s, o) => s + o.w, 0);
  const signLabels = ["ABC", "HI!", "A-Z", "OK", "WOW", "YES"];
  for (let y = 1; y < H - 1; y++)
    for (let x = 1; x < W - 1; x++) {
      const c = cells[y][x];
      if (nearRoad[y][x] || c.ground === "path" || c.ground === "water" || c.ground === "wall" || r() > 0.2) continue;
      let pick = r() * total;
      let kind = theme.obstacles.find((o) => (pick -= o.w) <= 0)!.kind;
      if (!theme.metal && height[y][x] >= 4 && (kind === "tree" || kind === "palm" || kind === "bush")) kind = "rock";
      c.obj = kind;
      if (kind === "sign") c.label = signLabels[Math.floor(r() * signLabels.length)];
    }
  for (let y = 1; y < H - 1; y++)
    for (let x = 1; x < W - 1; x++) {
      const c = cells[y][x];
      if (!isSolid(c) && c.ground !== "path" && c.ground !== "sand" && r() < 0.08) c.decor = theme.decor[Math.floor(r() * theme.decor.length)];
    }

  const spawn = { x: stops[0].bx, y: stops[0].by + 3 };
  const moveMap = { w: W, h: H, cells, height, stops, theme };
  const reachable = grid(false);
  const bq: [number, number][] = [[spawn.x, spawn.y]];
  reachable[spawn.y][spawn.x] = true;
  for (let i = 0; i < bq.length; i++) {
    const [x, y] = bq[i];
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = x + dx;
      const ny = y + dy;
      if (nx < 0 || ny < 0 || nx >= W || ny >= H || reachable[ny][nx] || !canStep(moveMap, x, y, nx, ny)) continue;
      reachable[ny][nx] = true;
      bq.push([nx, ny]);
    }
  }

  return { w: W, h: H, cells, spawn, reachable, theme, stops, height };
}
