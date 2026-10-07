import { type Cell, type GameMap, THEMES, isSolid } from "./mapgen";
import { MAX_STEP, MOVE_SPEED, type MoveMode, canStep, inStop, isBlocked, tileMode } from "./movement";
import { carveRiver } from "./river";
import * as S from "./sprites";
import { type CharSprites, type Dir, buildCharacter, hashString, makeCanvas, rng } from "./sprites";

/** Màu mái nhà của từng level — bé nhìn màu là nhớ "nhà số mấy". */
export const STOP_COLORS = ["#ff6b6b", "#ffb020", "#2fbf71", "#3b82f6", "#a855f7"];

const MAP_W = 34;
const GAP = 7; // số ô giữa hai ngôi nhà theo chiều dọc
const XS = [14, 24, 6, 22, 8];
const MAX_H = 5; // độ cao lớn nhất (đỉnh đồi)

// Hình chiếu 2.5D (isometric): một ô = hình thoi TW×TH, mỗi bậc cao = ZH điểm ảnh.
const TW = 32;
const TH = 16;
const ZH = 8;

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

// ---------------------------------------------------------------- engine
const WATER_Z = -0.3; // mặt nước thấp hơn nền một chút khi bơi
const RADIUS = 0.22; // nửa bề rộng chân nhân vật (ô)
const ENTER_DIST = 1.4; // ô
const DIRS: [number, number][] = [[1, 0], [-1, 0], [0, 1], [0, -1]];
const MOVE_KEYS = ["arrowup", "arrowdown", "arrowleft", "arrowright", "w", "a", "s", "d"];
const WALL_EXTRA = 2; // tường viền cao hơn nền 2 bậc

export type OverworldCallbacks = {
  onNear: (stopIndex: number | null) => void;
  onEnter: (stopIndex: number) => void;
};

type Pt = [number, number];
type Ent = { key: number; draw: () => void };

export class OverworldEngine {
  private ctx: CanvasRenderingContext2D;
  /** Độ cao hiển thị (tường viền cộng thêm WALL_EXTRA). */
  private dh: number[][];
  private top: string[][];
  private sideL: string[][];
  private sideR: string[][];
  private lip: (string | null)[][];
  private player: { x: number; y: number; z: number; dir: Dir; moving: boolean; anim: number; mode: MoveMode };
  private sprites: CharSprites;
  private spriteCache = new Map<string, HTMLCanvasElement>();
  private keys = new Set<string>();
  private path: { x: number; y: number }[] = [];
  private target: { stop: number; enter: boolean } | null = null;
  private paused = false;
  private raf = 0;
  private last = 0;
  private time = 0;
  private stuck = 0;
  private settling = false;
  private near: number | null = null;
  private zoom = 2;
  private cam = { x: 0, y: 0 };
  private ox: number;
  private oy: number;
  private mark: { x: number; y: number; t: number } | null = null;
  private disposers: (() => void)[] = [];

  constructor(
    private canvas: HTMLCanvasElement,
    private map: OverworldMap,
    private stations: StationInfo[],
    private won: boolean,
    avatarColor: string,
    skin: string,
    startStop: number,
    private cb: OverworldCallbacks,
  ) {
    this.ctx = canvas.getContext("2d")!;
    this.ox = map.h * (TW / 2) + TW;
    this.oy = MAX_H * ZH + 64;
    this.dh = map.height.map((row, y) => row.map((h, x) => h + (map.cells[y][x].ground === "wall" ? WALL_EXTRA : 0)));
    this.top = [];
    this.sideL = [];
    this.sideR = [];
    this.lip = [];
    this.paintTerrain();
    const s = map.stops[startStop];
    const px = s.bx + 1;
    const py = s.by + 3.2;
    this.player = { x: px, y: py, z: this.groundAt(px, py), dir: "up", moving: false, anim: 0, mode: "walk" };
    this.sprites = buildCharacter({ shirt: avatarColor, hair: "#2b1d16", skin });
    this.bind();
    this.resize();
  }

  /** Tính sẵn màu mặt trên + hai vách của từng ô theo loại đất và độ cao. */
  private paintTerrain() {
    const { map } = this;
    const th = map.theme;
    for (let y = 0; y < map.h; y++) {
      const top: string[] = [];
      const sl: string[] = [];
      const sr: string[] = [];
      const lip: (string | null)[] = [];
      for (let x = 0; x < map.w; x++) {
        const cell = map.cells[y][x];
        const h = map.height[y][x];
        const chk = (x + y) & 1 ? 4 : 0;
        let t: string;
        let l: string;
        let rr: string;
        let lp: string | null = null;
        switch (cell.ground) {
          case "path":
            t = shade(th.path, chk + h * 2);
            l = shade(th.path, -48);
            rr = shade(th.path, -70);
            break;
          case "sand":
            t = shade(th.sand, chk);
            l = shade(th.sand, -52);
            rr = shade(th.sand, -74);
            break;
          case "water":
            t = th.water;
            l = shade(th.water, -40);
            rr = shade(th.water, -60);
            break;
          case "wall":
            t = shade(th.wall, 10);
            l = shade(th.wall, -34);
            rr = shade(th.wall, -58);
            break;
          default: {
            const base = cell.ground === "A" ? th.groundA : th.groundB;
            if (th.metal) {
              t = shade(base, chk + h * 5);
              l = "#262d5a";
              rr = "#1b2147";
              lp = shade(t, -16);
            } else if (h >= 5) {
              t = chk ? "#f2f6fc" : "#e6edf8"; // đỉnh núi phủ tuyết
              l = "#aab3c4";
              rr = "#8992a6";
              lp = "#dbe3f0";
            } else if (h === 4) {
              t = mix(base, "#9aa0a6", 0.55); // núi đá
              l = "#8b8f9a";
              rr = "#6f7380";
            } else if (h === 3) {
              t = mix(base, "#c4c466", 0.3); // đồi cỏ khô
              l = "#8a6540";
              rr = "#6f4f31";
              lp = shade(t, -26);
            } else {
              t = shade(base, chk);
              l = "#8a6540";
              rr = "#6f4f31";
              lp = shade(t, -28);
            }
          }
        }
        top.push(t);
        sl.push(l);
        sr.push(rr);
        lip.push(lp);
      }
      this.top.push(top);
      this.sideL.push(sl);
      this.sideR.push(sr);
      this.lip.push(lip);
    }
  }

  start() {
    this.last = performance.now();
    const loop = (now: number) => {
      const dt = Math.max(0, Math.min(0.05, (now - this.last) / 1000));
      this.last = now;
      this.time += dt;
      this.raf = requestAnimationFrame(loop);
      try {
        if (!this.paused) this.update(dt);
        this.render();
      } catch (err) {
        console.error(err);
      }
    };
    this.raf = requestAnimationFrame(loop);
  }

  destroy() {
    cancelAnimationFrame(this.raf);
    this.disposers.forEach((d) => d());
  }

  setPaused(p: boolean) {
    this.paused = p;
    this.keys.clear();
    this.path = [];
    this.target = null;
  }

  /** Nút điều hướng trên màn hình cảm ứng. */
  setKey(k: string, down: boolean) {
    if (down) {
      this.keys.add(k);
      this.path = [];
      this.target = null;
    } else this.keys.delete(k);
  }

  /** Tự đi tới cửa nhà; enter = true thì vào luôn khi tới nơi. */
  walkTo(stop: number, enter = false) {
    this.routeToStop(stop, enter);
  }

  // ------------------------------------------------------------ input
  private bind() {
    const down = (e: KeyboardEvent) => {
      if (this.paused) return;
      const k = e.key.toLowerCase();
      if (MOVE_KEYS.includes(k)) {
        this.keys.add(k);
        this.path = [];
        this.target = null;
        e.preventDefault();
      } else if ((k === "e" || k === " " || k === "enter") && this.near !== null) {
        e.preventDefault();
        this.cb.onEnter(this.near);
      }
    };
    const up = (e: KeyboardEvent) => this.keys.delete(e.key.toLowerCase());
    const blur = () => this.keys.clear();
    const click = (e: MouseEvent) => this.onClick(e);
    const resize = () => this.resize();
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    window.addEventListener("blur", blur);
    window.addEventListener("resize", resize);
    this.canvas.addEventListener("click", click);
    const ro = new ResizeObserver(resize);
    ro.observe(this.canvas);
    this.disposers.push(() => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
      window.removeEventListener("blur", blur);
      window.removeEventListener("resize", resize);
      this.canvas.removeEventListener("click", click);
      ro.disconnect();
    });
  }

  private resize() {
    const dpr = window.devicePixelRatio || 1;
    const w = this.canvas.clientWidth || 600;
    const h = this.canvas.clientHeight || 500;
    this.canvas.width = Math.round(w * dpr);
    this.canvas.height = Math.round(h * dpr);
    this.zoom = Math.max(1.25, Math.min(3, Math.round((w / 600) * 4) / 4));
  }

  private viewSize() {
    const dpr = window.devicePixelRatio || 1;
    return { w: this.canvas.width / dpr / this.zoom, h: this.canvas.height / dpr / this.zoom };
  }

  // ------------------------------------------------------------ projection
  private projX(x: number, y: number) {
    return (x - y) * (TW / 2) + this.ox;
  }

  private projY(x: number, y: number, z: number) {
    return (x + y) * (TH / 2) - z * ZH + this.oy;
  }

  private solidTile(tx: number, ty: number) {
    if (tx < 0 || ty < 0 || tx >= this.map.w || ty >= this.map.h) return true;
    return isBlocked(this.map, tx, ty);
  }

  private tileH(tx: number, ty: number) {
    return this.map.height[ty]?.[tx] ?? 0;
  }

  /** Độ cao mặt đất ngay dưới chân (nội suy giữa các ô, để leo dốc trông mượt). */
  private groundAt(x: number, y: number) {
    const tx = Math.floor(x);
    const ty = Math.floor(y);
    const base = this.tileH(tx, ty);
    const fx = x - 0.5;
    const fy = y - 0.5;
    const ix = Math.floor(fx);
    const iy = Math.floor(fy);
    const ax = fx - ix;
    const ay = fy - iy;
    const g = (cx: number, cy: number) => {
      const v = this.tileH(cx, cy);
      return Math.abs(v - base) <= 1 ? v : base;
    };
    const top = g(ix, iy) * (1 - ax) + g(ix + 1, iy) * ax;
    const bot = g(ix, iy + 1) * (1 - ax) + g(ix + 1, iy + 1) * ax;
    return top * (1 - ay) + bot * ay;
  }

  /** Ô nào đang nằm dưới điểm chạm trên màn hình? (xét từng bậc cao, lấy ô gần camera nhất) */
  private pickTile(wx: number, wy: number) {
    let best: { x: number; y: number } | null = null;
    for (let hh = 0; hh <= MAX_H + WALL_EXTRA; hh++) {
      const a = (wx - this.ox) / (TW / 2);
      const b = (wy - this.oy + hh * ZH) / (TH / 2);
      const tx = Math.floor((a + b) / 2);
      const ty = Math.floor((b - a) / 2);
      if (tx < 0 || ty < 0 || tx >= this.map.w || ty >= this.map.h) continue;
      if (this.map.height[ty][tx] !== hh) continue;
      if (!best || tx + ty > best.x + best.y) best = { x: tx, y: ty };
    }
    return best;
  }

  private stopAnchor(s: Stop): Pt {
    return [this.projX(s.bx, s.by), this.projY(s.bx + 1, s.by + 1, s.h)];
  }

  private onClick(e: MouseEvent) {
    if (this.paused) return;
    const rect = this.canvas.getBoundingClientRect();
    const wx = this.cam.x + (e.clientX - rect.left) / this.zoom;
    const wy = this.cam.y + (e.clientY - rect.top) / this.zoom;
    const stop = this.map.stops.findIndex((s) => {
      const [ax, ay] = this.stopAnchor(s);
      return Math.abs(wx - ax) < 34 && wy > ay - 56 && wy < ay + 6;
    });
    if (stop >= 0) {
      if (this.near === stop) this.cb.onEnter(stop);
      else this.routeToStop(stop, true);
      return;
    }
    const t = this.pickTile(wx, wy);
    if (t) this.routeTo([t], null);
  }

  private routeToStop(stop: number, enter: boolean) {
    const s = this.map.stops[stop];
    if (!s) return;
    const front = s.by + 2;
    this.routeTo([{ x: s.bx, y: front }, { x: s.bx + 1, y: front }], { stop, enter });
  }

  private routeTo(goals: { x: number; y: number }[], target: { stop: number; enter: boolean } | null) {
    const start = { x: Math.floor(this.player.x), y: Math.floor(this.player.y) };
    const open = goals.filter((g) => !this.solidTile(g.x, g.y));
    const route = this.bfs(start, open, false) ?? this.bfs(start, open, true);
    if (!route) return;
    this.path = [start, ...route];
    this.target = target;
    this.mark = { x: goals[0].x, y: goals[0].y, t: this.time };
    if (route.length === 0 && target) this.arrive();
  }

  private arrive() {
    const t = this.target;
    this.target = null;
    this.player.dir = "up";
    this.computeNear();
    if (t?.enter && this.near === t.stop) this.cb.onEnter(t.stop);
  }

  /** Đường đi ngắn nhất theo ô — chỉ bước qua được chỗ chênh cao ≤ 1 bậc (vách cao hơn thì phải đi vòng). Chỉ băng qua nước khi allowSwim. */
  private bfs(start: { x: number; y: number }, goals: { x: number; y: number }[], allowSwim: boolean) {
    if (goals.length === 0) return null;
    const W = this.map.w;
    const key = (x: number, y: number) => y * W + x;
    const goalSet = new Set(goals.map((g) => key(g.x, g.y)));
    const prev = new Map<number, number>([[key(start.x, start.y), -1]]);
    const q = [key(start.x, start.y)];
    for (let i = 0; i < q.length; i++) {
      const cur = q[i];
      if (goalSet.has(cur)) {
        const out: { x: number; y: number }[] = [];
        for (let k = cur; k !== -1; k = prev.get(k)!) out.push({ x: k % W, y: Math.floor(k / W) });
        return out.reverse().slice(1);
      }
      const cx = cur % W;
      const cy = Math.floor(cur / W);
      for (const [dx, dy] of DIRS) {
        const nx = cx + dx;
        const ny = cy + dy;
        const nk = key(nx, ny);
        if (prev.has(nk) || !canStep(this.map, cx, cy, nx, ny)) continue;
        if (!allowSwim && tileMode(this.map, nx, ny) === "swim") continue;
        prev.set(nk, cur);
        q.push(nk);
      }
    }
    return null;
  }

  // ------------------------------------------------------------ update
  /** Đứng ở (x,y) có bị vướng không: chạm vật cản, hoặc chạm vách cao hơn 1 bậc so với ô đang đứng. */
  private collides(x: number, y: number, fromX: number, fromY: number) {
    const base = this.tileH(Math.floor(fromX), Math.floor(fromY));
    const x0 = Math.floor(x - RADIUS);
    const x1 = Math.floor(x + RADIUS);
    const y0 = Math.floor(y - RADIUS);
    const y1 = Math.floor(y + RADIUS);
    for (let ty = y0; ty <= y1; ty++)
      for (let tx = x0; tx <= x1; tx++) {
        if (this.solidTile(tx, ty)) return true;
        if (Math.abs(this.tileH(tx, ty) - base) > MAX_STEP) return true;
      }
    return false;
  }

  private update(dt: number) {
    // Phím mũi tên theo hướng MÀN HÌNH → đổi sang hướng lưới (isometric)
    let vx = 0;
    let vy = 0;
    const k = this.keys;
    if (k.has("arrowup") || k.has("w")) { vx -= 1; vy -= 1; }
    if (k.has("arrowdown") || k.has("s")) { vx += 1; vy += 1; }
    if (k.has("arrowleft") || k.has("a")) { vx -= 1; vy += 1; }
    if (k.has("arrowright") || k.has("d")) { vx += 1; vy -= 1; }
    const manual = vx !== 0 || vy !== 0;
    const speed = MOVE_SPEED[this.player.mode];

    if (!manual && this.path.length) {
      const next = this.path[0];
      const gx = next.x + 0.5;
      const gy = next.y + 0.5;
      const dx = gx - this.player.x;
      const dy = gy - this.player.y;
      const d = Math.hypot(dx, dy);
      if (d < Math.max(0.06, speed * dt)) {
        this.player.x = gx;
        this.player.y = gy;
        this.path.shift();
        this.stuck = 0;
        if (this.path.length === 0) this.arrive();
      } else {
        vx = dx / d;
        vy = dy / d;
      }
    }

    const moving = vx !== 0 || vy !== 0;
    if (moving) {
      const len = Math.hypot(vx, vy);
      const p = this.player;
      const sx = (vx / len) * speed * dt;
      const sy = (vy / len) * speed * dt;
      const ox = p.x;
      const oy = p.y;
      const fx = p.x;
      const fy = p.y;
      if (!this.collides(p.x + sx, p.y, fx, fy)) p.x += sx;
      if (!this.collides(p.x, p.y + sy, fx, fy)) p.y += sy;
      // hướng nhìn theo chuyển động trên MÀN HÌNH
      const scrX = vx - vy;
      const scrY = (vx + vy) / 2;
      if (Math.abs(scrX) > Math.abs(scrY)) p.dir = scrX > 0 ? "right" : "left";
      else p.dir = scrY > 0 ? "down" : "up";
      p.anim += p.mode === "swim" ? dt * 0.5 : dt;
      // đang tự đi mà kẹt (vướng góc) thì bỏ đường đi
      if (!manual && Math.hypot(p.x - ox, p.y - oy) < speed * dt * 0.2) {
        this.stuck += dt;
        if (this.stuck > 0.4) {
          this.path = [];
          this.target = null;
          this.stuck = 0;
        }
      } else this.stuck = 0;
    } else this.player.anim = 0;
    this.player.moving = moving;
    this.updateElevation(dt);
    this.computeNear();
  }

  /** Kiểu di chuyển theo ô đang đứng, và độ cao của chân (xuống nước thì chìm dần, nhấp nhô theo sóng). */
  private updateElevation(dt: number) {
    const p = this.player;
    const mode = tileMode(this.map, Math.floor(p.x), Math.floor(p.y));
    const target = mode === "swim" ? WATER_Z : this.groundAt(p.x, p.y);
    if (mode !== p.mode) this.settling = true;
    p.mode = mode;
    if (this.settling) {
      p.z += (target - p.z) * Math.min(1, dt * 12);
      if (Math.abs(target - p.z) < 0.03) this.settling = false;
    } else p.z = target;
  }

  /** Trạng thái để kiểm thử E2E (engine chỉ được gắn vào window.__vtMap khi URL có ?e2e). */
  debugState() {
    const p = this.player;
    return { x: p.x, y: p.y, z: p.z, mode: p.mode, tx: Math.floor(p.x), ty: Math.floor(p.y), speed: MOVE_SPEED[p.mode], paths: this.path.length };
  }

  /** Đặt nhân vật vào giữa một ô (chỉ dùng cho kiểm thử E2E). */
  debugTeleport(tx: number, ty: number) {
    this.path = [];
    this.target = null;
    this.player.x = tx + 0.5;
    this.player.y = ty + 0.5;
    this.updateElevation(0.1);
  }

  /** Danh sách ô nước (để kiểm thử). */
  debugWater() {
    const out: { x: number; y: number }[] = [];
    this.map.cells.forEach((row, y) => row.forEach((c, x) => c.ground === "water" && out.push({ x, y })));
    return out;
  }

  private computeNear() {
    let best: number | null = null;
    let bestD = ENTER_DIST;
    this.map.stops.forEach((s, i) => {
      const d = Math.hypot(s.bx + 1 - this.player.x, s.by + 2.5 - this.player.y);
      if (d < bestD) {
        bestD = d;
        best = i;
      }
    });
    if (best !== this.near) {
      this.near = best;
      this.cb.onNear(best);
    }
  }

  // ------------------------------------------------------------ render
  private render() {
    const g = this.ctx;
    const dpr = window.devicePixelRatio || 1;
    const view = this.viewSize();
    const { map, player: p } = this;
    const worldW = (map.w + map.h) * (TW / 2) + TW * 2;
    const worldH = (map.w + map.h) * (TH / 2) + this.oy + 48;
    const cx = this.projX(p.x, p.y) - view.w / 2;
    const cy = this.projY(p.x, p.y, p.z) - 14 - view.h / 2;
    this.cam.x = view.w >= worldW ? (worldW - view.w) / 2 : Math.max(0, Math.min(worldW - view.w, cx));
    this.cam.y = view.h >= worldH ? (worldH - view.h) / 2 : Math.max(0, Math.min(worldH - view.h, cy));
    const z = this.zoom * dpr;

    g.setTransform(1, 0, 0, 1, 0, 0);
    g.fillStyle = map.theme.bg;
    g.fillRect(0, 0, this.canvas.width, this.canvas.height);
    g.imageSmoothingEnabled = false;
    g.setTransform(z, 0, 0, z, -Math.round(this.cam.x * z), -Math.round(this.cam.y * z));

    const vx0 = this.cam.x - 48;
    const vx1 = this.cam.x + view.w + 48;
    const vy0 = this.cam.y - 80;
    const vy1 = this.cam.y + view.h + 40 + MAX_H * ZH;
    const ps = Math.floor(p.x) + Math.floor(p.y);
    let playerDrawn = false;
    const frame = Math.floor(this.time * 1.6);

    for (let s = 0; s <= map.w + map.h - 2; s++) {
      const xa = Math.max(0, s - map.h + 1);
      const xb = Math.min(map.w - 1, s);
      for (let x = xa; x <= xb; x++) {
        const y = s - x;
        const sx = this.projX(x, y);
        const sy = this.projY(x, y, this.dh[y][x]);
        if (sx < vx0 || sx > vx1 || sy < vy0 || sy > vy1) continue;
        this.drawTile(x, y, sx, sy, frame);
        const stop = map.stops.findIndex((st) => st.bx + 1 === x && st.by + 1 === y);
        if (stop >= 0) this.drawStop(map.stops[stop], stop);
      }
      if (s === ps) {
        this.drawPlayer();
        playerDrawn = true;
      }
    }
    if (!playerDrawn) this.drawPlayer();
    map.stops.forEach((s, i) => this.drawLabel(s, i));
  }

  private drawTile(x: number, y: number, sx: number, sy: number, frame: number) {
    const g = this.ctx;
    const cell = this.map.cells[y][x];
    const h = this.dh[y][x];
    const water = cell.ground === "water";
    const yy = water ? sy + 2 : sy;

    if (!water) {
      const dl = h - (this.dh[y + 1]?.[x] ?? -2);
      const dr = h - (this.dh[y]?.[x + 1] ?? -2);
      if (dl > 0) this.face(sx - TW / 2, yy + TH / 2, sx, yy + TH, dl * ZH, this.sideL[y][x], this.lip[y][x]);
      if (dr > 0) this.face(sx, yy + TH, sx + TW / 2, yy + TH / 2, dr * ZH, this.sideR[y][x], this.lip[y][x] && shade(this.lip[y][x]!, -22));
    }

    g.fillStyle = this.top[y][x];
    g.beginPath();
    g.moveTo(sx, yy);
    g.lineTo(sx + TW / 2, yy + TH / 2);
    g.lineTo(sx, yy + TH);
    g.lineTo(sx - TW / 2, yy + TH / 2);
    g.closePath();
    g.fill();

    const hash = (Math.imul(x + 1, 73856093) ^ Math.imul(y + 1, 19349663)) >>> 0;
    const spot = (n: number): Pt => {
      const u = 0.2 + (((hash >> (n * 5)) & 15) / 15) * 0.6;
      const v = 0.2 + (((hash >> (n * 5 + 2)) & 15) / 15) * 0.6;
      return [sx + (u - v) * (TW / 2), yy + (u + v) * (TH / 2)];
    };
    const th = this.map.theme;
    switch (cell.ground) {
      case "water": {
        g.strokeStyle = "rgba(255,255,255,0.45)";
        g.lineWidth = 1;
        const ph = Math.sin(this.time * 2 + hash) * 3;
        g.beginPath();
        g.moveTo(sx - 7 + ph, yy + 6);
        g.lineTo(sx - 1 + ph, yy + 6);
        g.moveTo(sx + 1 - ph, yy + 11);
        g.lineTo(sx + 7 - ph, yy + 11);
        g.stroke();
        break;
      }
      case "path":
        if (th.metal) {
          g.strokeStyle = th.pathGlow ?? "#3dd6ff";
          g.globalAlpha = 0.45 + 0.35 * Math.sin(this.time * 3 + x + y);
          g.lineWidth = 1;
          g.beginPath();
          g.moveTo(sx - 8, yy + TH / 2 - 4);
          g.lineTo(sx + 8, yy + TH / 2 + 4);
          g.stroke();
          g.globalAlpha = 1;
        } else {
          g.fillStyle = shade(th.path, -26);
          const [a, b] = spot(0);
          g.fillRect(Math.round(a), Math.round(b), 2, 1);
          const [c, d] = spot(1);
          g.fillRect(Math.round(c), Math.round(d), 1, 1);
        }
        break;
      case "A":
      case "B":
        if (!th.metal) {
          g.fillStyle = shade(this.top[y][x], -22);
          const [a, b] = spot(0);
          g.fillRect(Math.round(a), Math.round(b) - 1, 1, 2);
          const [c, d] = spot(1);
          g.fillRect(Math.round(c), Math.round(d) - 1, 1, 2);
        }
        break;
    }
    if (cell.decor === "flowers") {
      const [a, b] = spot(2);
      g.fillStyle = "#fff";
      g.fillRect(Math.round(a), Math.round(b), 2, 2);
      g.fillStyle = "#ff6f91";
      const [c, d] = spot(0);
      g.fillRect(Math.round(c), Math.round(d), 2, 2);
      g.fillStyle = "#ffd23f";
      const [e, f] = spot(1);
      g.fillRect(Math.round(e), Math.round(f), 1, 2);
    } else if (cell.decor === "cable") {
      g.strokeStyle = "#7d86c9";
      g.lineWidth = 1;
      g.beginPath();
      g.moveTo(sx - 9, yy + TH / 2 + 3);
      g.lineTo(sx + 9, yy + TH / 2 - 3);
      g.stroke();
    } else if (cell.decor === "vent") {
      g.fillStyle = "#1b2147";
      g.fillRect(sx - 4, yy + TH / 2 - 1, 8, 2);
    }

    if (cell.obj) this.drawObj(cell, x, y, sx, yy, frame);
  }

  /** Vách đứng của một ô (bên trái hoặc bên phải), sâu `d` điểm ảnh, kẻ vạch mỗi bậc cho giống bậc đá. */
  private face(x0: number, y0: number, x1: number, y1: number, d: number, color: string, lip: string | null) {
    const g = this.ctx;
    g.fillStyle = color;
    g.beginPath();
    g.moveTo(x0, y0);
    g.lineTo(x1, y1);
    g.lineTo(x1, y1 + d);
    g.lineTo(x0, y0 + d);
    g.closePath();
    g.fill();
    if (lip) {
      g.fillStyle = lip;
      const l = Math.min(d, 3);
      g.beginPath();
      g.moveTo(x0, y0);
      g.lineTo(x1, y1);
      g.lineTo(x1, y1 + l);
      g.lineTo(x0, y0 + l);
      g.closePath();
      g.fill();
    }
    if (d > ZH) {
      g.strokeStyle = "rgba(0,0,0,0.18)";
      g.lineWidth = 1;
      g.beginPath();
      for (let k = ZH; k < d; k += ZH) {
        g.moveTo(x0, y0 + k);
        g.lineTo(x1, y1 + k);
      }
      g.stroke();
    }
  }

  // ------------------------------------------------------------ objects
  private objSprite(cell: Cell, x: number, y: number, frame: number): { img: HTMLCanvasElement; scale: number } {
    const th = this.map.theme;
    let key: string = cell.obj!;
    switch (cell.obj) {
      case "tree": key += (x + y) % 3 === 0 ? ":a" : ":b"; break;
      case "bush": key += (x * 7 + y) % 3 === 0 ? ":berry" : ":plain"; break;
      case "server": key += `:${(frame + x + y) % 2}`; break;
      case "desk": key += `:${frame % 2}`; break;
      case "sign": key += `:${cell.label ?? "ABC"}`; break;
    }
    let img = this.spriteCache.get(key);
    const scale = cell.obj === "tree" || cell.obj === "palm" ? 2.5 : 2;
    if (!img) {
      img = makeCanvas(32, 32);
      const c = img.getContext("2d")!;
      const OX = 8;
      const OY = 12;
      switch (cell.obj) {
        case "tree": S.drawTree(c, OX, OY, (x + y) % 3 === 0 ? "#3a9e4f" : th.leaf); break;
        case "palm": S.drawPalm(c, OX, OY); break;
        case "bush": S.drawBush(c, OX, OY, "#3f9d4a", (x * 7 + y) % 3 === 0 ? "#ff5c7a" : undefined); break;
        case "rock": S.drawRock(c, OX, OY); break;
        case "crate": S.drawCrate(c, OX, OY); break;
        case "server": S.drawServer(c, OX, OY, (frame + x + y) % 2); break;
        case "desk": S.drawDesk(c, OX, OY, frame % 2 === 0 ? "#3dd6ff" : "#7ff5c8"); break;
        case "plant": S.drawPlantPot(c, OX, OY); break;
        case "sign": S.drawSign(c, OX, OY, cell.label ?? "ABC"); break;
      }
      this.spriteCache.set(key, img);
    }
    return { img, scale };
  }

  private drawObj(cell: Cell, x: number, y: number, sx: number, sy: number, frame: number) {
    const { img, scale } = this.objSprite(cell, x, y, frame);
    const ax = sx;
    const ay = sy + TH / 2 + 3;
    this.ctx.drawImage(img, Math.round(ax - 16 * scale), Math.round(ay - 26 * scale), 32 * scale, 32 * scale);
  }

  private drawPlayer() {
    const p = this.player;
    const f = p.moving ? [1, 0, 2, 0][Math.floor(p.anim * 8) % 4] : 0;
    const g = this.ctx;
    const sx = this.projX(p.x, p.y);
    const sy = this.projY(p.x, p.y, p.z);
    if (p.mode === "swim") this.drawSwimmer(sx, this.projY(p.x, p.y, 0) + 2, (p.z - WATER_Z) * ZH, this.sprites[p.dir][f]);
    else {
      g.fillStyle = "rgba(0,0,0,0.3)";
      g.beginPath();
      g.ellipse(sx, sy, 8, 4, 0, 0, Math.PI * 2);
      g.fill();
      g.drawImage(this.sprites[p.dir][f], Math.round(sx - 16), Math.round(sy - 30), 32, 32);
    }

    if (this.mark && this.time - this.mark.t < 0.6 && this.path.length) {
      const m = this.mark;
      const mx = this.projX(m.x, m.y);
      const my = this.projY(m.x, m.y, this.map.height[m.y][m.x]);
      g.strokeStyle = `rgba(255,255,255,${1 - (this.time - this.mark.t) / 0.6})`;
      g.lineWidth = 1.5;
      g.beginPath();
      g.moveTo(mx, my + 1);
      g.lineTo(mx + TW / 2 - 2, my + TH / 2);
      g.lineTo(mx, my + TH - 1);
      g.lineTo(mx - TW / 2 + 2, my + TH / 2);
      g.closePath();
      g.stroke();
    }
  }

  /** Đang bơi: chỉ thấy nửa trên người nhô khỏi mặt nước, có vòng sóng quanh người. lift = số điểm ảnh người còn cao hơn mặt nước (lúc vừa nhảy xuống thì chìm dần). */
  private drawSwimmer(sx: number, waterY: number, lift: number, sprite: HTMLCanvasElement) {
    const g = this.ctx;
    const cut = 22; // số hàng điểm ảnh phía trên của sprite còn nhìn thấy
    const bob = Math.sin(this.time * 4) * 1;
    g.drawImage(sprite, 0, 0, 32, cut, Math.round(sx - 16), Math.round(waterY - cut + 2 + bob - lift), 32, cut);
    g.strokeStyle = "rgba(255,255,255,0.7)";
    g.lineWidth = 1.5;
    for (const k of [0, 1]) {
      const t = (this.time * 1.5 + k * 0.5) % 1;
      g.globalAlpha = 1 - t;
      g.beginPath();
      g.ellipse(sx, waterY, 7 + t * 8, 3 + t * 3.5, 0, 0, Math.PI * 2);
      g.stroke();
    }
    g.globalAlpha = 1;
  }

  // ------------------------------------------------------------ houses
  private drawStop(s: Stop, i: number) {
    const g = this.ctx;
    const x0 = this.projX(s.bx, s.by);
    const y0 = this.projY(s.bx, s.by, s.h);
    /** (u,v) = ô trong sân 2×2, z = độ cao điểm ảnh so với mặt sân */
    const P = (u: number, v: number, z: number): Pt => [x0 + (u - v) * (TW / 2), y0 + (u + v) * (TH / 2) - z];
    const poly = (fill: string | null, pts: Pt[], stroke?: string) => {
      g.beginPath();
      pts.forEach(([x, y], k) => (k ? g.lineTo(x, y) : g.moveTo(x, y)));
      g.closePath();
      if (fill) {
        g.fillStyle = fill;
        g.fill();
      }
      if (stroke) {
        g.strokeStyle = stroke;
        g.lineWidth = 1;
        g.lineJoin = "round";
        g.stroke();
      }
    };
    const dark = "#1d1b2e";

    // bóng đổ + vòng sáng nếu là level hiện tại
    poly("rgba(0,0,0,0.22)", [P(0.15, 0.15, 0), P(1.95, 0.15, 0), P(1.95, 1.95, 0), P(0.15, 1.95, 0)]);

    if (s.kind === "finish") {
      poly("#ffd86b", [P(0.35, 0.35, 1), P(1.65, 0.35, 1), P(1.65, 1.65, 1), P(0.35, 1.65, 1)], dark);
      const [ex, ey] = P(1, 1, 8);
      g.font = "30px sans-serif";
      g.textAlign = "center";
      g.textBaseline = "alphabetic";
      const bob = Math.sin(this.time * 3) * 2;
      g.fillStyle = "#000";
      g.fillText(this.won ? "🏆" : "🎁", ex, ey + bob);
      if (this.won) {
        g.fillStyle = "#ffe27a";
        g.font = "bold 10px sans-serif";
        for (let k = 0; k < 3; k++) g.fillText("✦", ex - 14 + k * 14, ey - 30 + Math.sin(this.time * 4 + k * 2) * 3);
      }
      return;
    }

    const info = this.stations[i];
    const locked = !info.unlocked;
    const color = STOP_COLORS[i % STOP_COLORS.length];
    const wall = locked ? "#a9adc9" : shade(color, 70);
    const wallR = shade(wall, -34);
    const roof = locked ? "#767a9e" : color;

    if (info.current) {
      const a = 0.35 + Math.sin(this.time * 5) * 0.15;
      poly(`rgba(255,200,60,${a})`, [P(-0.4, -0.4, 0), P(2.4, -0.4, 0), P(2.4, 2.4, 0), P(-0.4, 2.4, 0)]);
    }

    const a = 0.12;
    const b = 1.88;
    const WH = 26;
    const RH = 20;
    // tường: mặt trái quay về +y (có cửa), mặt phải quay về +x
    poly(wall, [P(a, b, 0), P(b, b, 0), P(b, b, WH), P(a, b, WH)], dark);
    poly(wallR, [P(b, a, 0), P(b, b, 0), P(b, b, WH), P(b, a, WH)], dark);
    // cửa
    poly(locked ? "#6b6f94" : "#8a5a2c", [P(0.78, b, 0), P(1.22, b, 0), P(1.22, b, 13), P(0.78, b, 13)], dark);
    // cửa sổ
    const win = locked ? "#8d91b3" : "#bfe9ff";
    poly(win, [P(0.38, b, 9), P(0.6, b, 9), P(0.6, b, 17), P(0.38, b, 17)], dark);
    poly(win, [P(1.4, b, 9), P(1.62, b, 9), P(1.62, b, 17), P(1.4, b, 17)], dark);
    poly(shade(win, -30), [P(b, 0.7, 9), P(b, 1.3, 9), P(b, 1.3, 17), P(b, 0.7, 17)], dark);
    // mái nhà hình chóp
    const e0 = -0.1;
    const e1 = 2.1;
    const apex = P(1, 1, WH + RH);
    poly(shade(roof, -50), [P(e0, e0, WH), P(e1, e0, WH), apex], dark);
    poly(shade(roof, -60), [P(e0, e0, WH), P(e0, e1, WH), apex], dark);
    poly(shade(roof, 12), [P(e0, e1, WH), P(e1, e1, WH), apex], dark);
    poly(shade(roof, -34), [P(e1, e0, WH), P(e1, e1, WH), apex], dark);
    // biển số trên cửa
    const [bx, by] = P(1, b, WH - 4.5);
    g.fillStyle = dark;
    g.beginPath();
    g.arc(bx, by, 5.5, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = "#fff";
    g.beginPath();
    g.arc(bx, by, 4.5, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = dark;
    g.font = "bold 8px 'Baloo 2', sans-serif";
    g.textAlign = "center";
    g.textBaseline = "middle";
    g.fillText(String(info.number), bx, by + 0.5);
    if (locked) {
      const [lx, ly] = P(1.1, b, 5);
      g.fillStyle = dark;
      g.fillRect(lx - 3.5, ly - 2, 7, 6);
      g.fillStyle = "#ffcf3d";
      g.fillRect(lx - 2.5, ly - 1, 5, 4);
      g.strokeStyle = dark;
      g.lineWidth = 1;
      g.beginPath();
      g.arc(lx, ly - 2, 2.2, Math.PI, 0);
      g.stroke();
    }
    if (info.passed) {
      g.fillStyle = dark;
      g.fillRect(apex[0] - 1, apex[1] - 13, 2, 14);
      g.fillStyle = "#2fbf71";
      g.fillRect(apex[0] + 1, apex[1] - 13, 8, 5);
    }
  }

  private drawLabel(s: Stop, i: number) {
    const g = this.ctx;
    const [ax, ay] = this.stopAnchor(s);
    const apexY = ay - (s.kind === "finish" ? 36 : 46);
    const text = s.kind === "finish" ? (this.won ? "Nhà vô địch!" : "Kho báu") : this.stations[i].title;
    const locked = s.kind === "level" && !this.stations[i].unlocked;
    g.font = "bold 8px 'Be Vietnam Pro', sans-serif";
    g.textAlign = "center";
    g.textBaseline = "middle";
    const w = g.measureText(text).width + 10;
    const py = apexY - 18;
    g.fillStyle = "#1d1b2e";
    roundRect(g, ax - w / 2 - 1, py - 7, w + 2, 14, 5);
    g.fillStyle = locked ? "#c9cce3" : "#fff8ea";
    roundRect(g, ax - w / 2, py - 6, w, 12, 4.5);
    g.fillStyle = locked ? "#5b5f82" : "#1f2140";
    g.fillText(text, ax, py + 0.5);

    if (s.kind === "level") {
      const info = this.stations[i];
      if (info.unlocked) {
        g.font = "10px sans-serif";
        for (let k = 0; k < 3; k++) {
          g.fillStyle = k < info.stars ? "#ffc93c" : "#00000055";
          g.fillText("★", ax - 11 + k * 11, py + 14);
        }
      }
      if (info.current) {
        const bounce = Math.sin(this.time * 6) * 2;
        tri(g, "#1d1b2e", ax - 6, py - 22 + bounce, ax + 6, py - 22 + bounce, ax, py - 13 + bounce);
        tri(g, "#ffb020", ax - 4.5, py - 21 + bounce, ax + 4.5, py - 21 + bounce, ax, py - 15 + bounce);
      }
    }
  }
}

function tri(g: CanvasRenderingContext2D, fill: string, x1: number, y1: number, x2: number, y2: number, x3: number, y3: number) {
  g.fillStyle = fill;
  g.beginPath();
  g.moveTo(x1, y1);
  g.lineTo(x2, y2);
  g.lineTo(x3, y3);
  g.closePath();
  g.fill();
}

function roundRect(g: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  g.beginPath();
  g.roundRect(x, y, w, h, r);
  g.fill();
}

function rgb(c: string): [number, number, number] {
  if (c.startsWith("#")) {
    const n = parseInt(c.slice(1), 16);
    return [n >> 16, (n >> 8) & 255, n & 255];
  }
  const m = c.match(/\d+/g)!.map(Number);
  return [m[0], m[1], m[2]];
}

function shade(color: string, amt: number) {
  const clamp = (v: number) => Math.max(0, Math.min(255, Math.round(v + amt)));
  const [r, g, b] = rgb(color);
  return `rgb(${clamp(r)},${clamp(g)},${clamp(b)})`;
}

function mix(a: string, b: string, t: number) {
  const x = rgb(a);
  const y = rgb(b);
  const c = (i: number) => Math.round(x[i] + (y[i] - x[i]) * t);
  return `rgb(${c(0)},${c(1)},${c(2)})`;
}
