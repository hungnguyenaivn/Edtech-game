import { type Cell, type GameMap, THEMES, isSolid, renderMap } from "./mapgen";
import { type CharSprites, type Dir, T, buildCharacter, hashString, rng } from "./sprites";

/** Màu mái nhà của từng level — bé nhìn màu là nhớ "nhà số mấy". */
export const STOP_COLORS = ["#ff6b6b", "#ffb020", "#2fbf71", "#3b82f6", "#a855f7"];

const MAP_W = 34;
const GAP = 7; // số ô giữa hai ngôi nhà theo chiều dọc
const XS = [14, 24, 6, 22, 8];

/** Một điểm dừng trên bản đồ: nhà level, hoặc kho báu ở cuối đường. Nhà chiếm 2×2 ô, cửa quay xuống dưới. */
export type Stop = { kind: "level" | "finish"; bx: number; by: number };
export type OverworldMap = GameMap & { stops: Stop[] };

export type StationInfo = {
  number: number;
  title: string;
  unlocked: boolean;
  passed: boolean;
  stars: number;
  current: boolean;
};

export function inStop(stops: Stop[], x: number, y: number) {
  return stops.some((s) => x >= s.bx && x <= s.bx + 1 && y >= s.by && y <= s.by + 1);
}

/** Bản đồ cố định cho mỗi thế giới: con đường ngoằn ngoèo từ dưới lên, nhà level 1..n rồi tới kho báu. */
export function buildOverworld(slug: string, levelCount: number): OverworldMap {
  const theme = THEMES[slug] ?? THEMES["toan-ly-hoa"];
  const r = rng(hashString(slug + ":overworld"));
  const W = MAP_W;
  const H = GAP * levelCount + 9;
  const cells: Cell[][] = Array.from({ length: H }, () => Array.from({ length: W }, () => ({ ground: "A" as Cell["ground"], obj: null, decor: null })));
  const inside = (x: number, y: number) => x > 0 && y > 0 && x < W - 1 && y < H - 1;
  const frontRow = (i: number) => H - 5 - GAP * i;

  const lastX = XS[(levelCount - 1) % XS.length];
  const finishX = Math.abs(15 - lastX) >= 4 ? 15 : 24;
  const stops: Stop[] = Array.from({ length: levelCount + 1 }, (_, i) => ({
    kind: i < levelCount ? "level" : "finish",
    bx: i < levelCount ? XS[i % XS.length] : finishX,
    by: frontRow(i) - 2,
  }));

  // Mảng nền B cho đỡ đơn điệu
  for (let i = 0; i < 26; i++) {
    const cx = Math.floor(r() * W);
    const cy = Math.floor(r() * H);
    const rad = 1.5 + r() * 3;
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if ((x - cx) ** 2 + (y - cy) ** 2 < rad * rad) cells[y][x].ground = "B";
  }

  // Đường đi rộng 2 ô
  const road = Array.from({ length: H }, () => Array(W).fill(false) as boolean[]);
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

  // Vùng cần chừa trống: đường + nhà (và 1 ô quanh chúng)
  const dilate = (mask: boolean[][], n: number) =>
    mask.map((row, y) => row.map((_, x) => {
      for (let dy = -n; dy <= n; dy++) for (let dx = -n; dx <= n; dx++) if (mask[y + dy]?.[x + dx]) return true;
      return false;
    }));
  const reserved = road.map((row, y) => row.map((v, x) => v || inStop(stops, x, y)));
  const nearRoad = dilate(reserved, 1);
  const clear2 = dilate(reserved, 2);

  // Ao nước cho giống bản đồ thật (thế giới "phòng lab" không có)
  if (!theme.metal) {
    for (let i = 0; i < 8; i++) {
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
          if (v < 1) cells[y][x].ground = "water";
          else if (v < 1.7 && cells[y][x].ground !== "water") cells[y][x].ground = "sand";
        }
    }
  }

  // Viền bản đồ
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++)
      if (!inside(x, y)) {
        if (theme.border === "wall") cells[y][x].ground = "wall";
        else if (cells[y][x].ground !== "water") cells[y][x].obj = theme.border as Cell["obj"];
      }

  // Cây cối, bụi, đá rải hai bên đường
  const total = theme.obstacles.reduce((s, o) => s + o.w, 0);
  const signLabels = ["ABC", "HI!", "A-Z", "OK", "WOW", "YES"];
  for (let y = 1; y < H - 1; y++)
    for (let x = 1; x < W - 1; x++) {
      const c = cells[y][x];
      if (nearRoad[y][x] || c.ground === "path" || c.ground === "water" || c.ground === "wall" || r() > 0.2) continue;
      let pick = r() * total;
      const kind = theme.obstacles.find((o) => (pick -= o.w) <= 0)!.kind;
      c.obj = kind;
      if (kind === "sign") c.label = signLabels[Math.floor(r() * signLabels.length)];
    }
  for (let y = 1; y < H - 1; y++)
    for (let x = 1; x < W - 1; x++) {
      const c = cells[y][x];
      if (!isSolid(c) && c.ground !== "path" && c.ground !== "sand" && r() < 0.08) c.decor = theme.decor[Math.floor(r() * theme.decor.length)];
    }

  const spawn = { x: stops[0].bx, y: stops[0].by + 3 };
  const reachable = Array.from({ length: H }, () => Array(W).fill(false) as boolean[]);
  const q: [number, number][] = [[spawn.x, spawn.y]];
  reachable[spawn.y][spawn.x] = true;
  while (q.length) {
    const [x, y] = q.shift()!;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = x + dx;
      const ny = y + dy;
      if (nx < 0 || ny < 0 || nx >= W || ny >= H || reachable[ny][nx] || isSolid(cells[ny][nx]) || inStop(stops, nx, ny)) continue;
      reachable[ny][nx] = true;
      q.push([nx, ny]);
    }
  }

  return { w: W, h: H, cells, spawn, reachable, theme, stops };
}

// ---------------------------------------------------------------- engine
const SPEED = 80; // px nguồn / giây
const HALF_W = 5;
const BOX_H = 5;
const ENTER_DIST = 22;
const DIRS: [number, number][] = [[1, 0], [-1, 0], [0, 1], [0, -1]];
const MOVE_KEYS = ["arrowup", "arrowdown", "arrowleft", "arrowright", "w", "a", "s", "d"];

export type OverworldCallbacks = {
  onNear: (stopIndex: number | null) => void;
  onEnter: (stopIndex: number) => void;
};

export class OverworldEngine {
  private ctx: CanvasRenderingContext2D;
  private frames: HTMLCanvasElement[];
  private player: { x: number; y: number; dir: Dir; moving: boolean; anim: number };
  private sprites: CharSprites;
  private keys = new Set<string>();
  private path: { x: number; y: number }[] = [];
  private target: { stop: number; enter: boolean } | null = null;
  private paused = false;
  private raf = 0;
  private last = 0;
  private time = 0;
  private near: number | null = null;
  private zoom = 3;
  private cam = { x: 0, y: 0 };
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
    this.frames = [renderMap(map, 0), renderMap(map, 1)];
    const s = map.stops[startStop];
    this.player = { x: s.bx * T + T, y: (s.by + 3) * T + T - 3, dir: "up", moving: false, anim: 0 };
    this.sprites = buildCharacter({ shirt: avatarColor, hair: "#2b1d16", skin });
    this.bind();
    this.resize();
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
    this.zoom = Math.max(2, Math.floor(Math.min(w / (T * 18), h / (T * 13))));
  }

  private viewSize() {
    const dpr = window.devicePixelRatio || 1;
    return { w: this.canvas.width / dpr / this.zoom, h: this.canvas.height / dpr / this.zoom };
  }

  private solidTile(tx: number, ty: number) {
    if (tx < 0 || ty < 0 || tx >= this.map.w || ty >= this.map.h) return true;
    return isSolid(this.map.cells[ty][tx]) || inStop(this.map.stops, tx, ty);
  }

  private onClick(e: MouseEvent) {
    if (this.paused) return;
    const rect = this.canvas.getBoundingClientRect();
    const tx = Math.floor((this.cam.x + (e.clientX - rect.left) / this.zoom) / T);
    const ty = Math.floor((this.cam.y + (e.clientY - rect.top) / this.zoom) / T);
    const stop = this.map.stops.findIndex((s) => tx >= s.bx - 1 && tx <= s.bx + 2 && ty >= s.by - 2 && ty <= s.by + 1);
    if (stop >= 0) {
      if (this.near === stop) this.cb.onEnter(stop);
      else this.routeToStop(stop, true);
    } else this.routeTo([{ x: tx, y: ty }], null);
  }

  private routeToStop(stop: number, enter: boolean) {
    const s = this.map.stops[stop];
    if (!s) return;
    const front = s.by + 2;
    this.routeTo([{ x: s.bx, y: front }, { x: s.bx + 1, y: front }], { stop, enter });
  }

  private routeTo(goals: { x: number; y: number }[], target: { stop: number; enter: boolean } | null) {
    const start = { x: Math.floor(this.player.x / T), y: Math.floor((this.player.y - 2) / T) };
    const route = this.bfs(start, goals.filter((g) => !this.solidTile(g.x, g.y)));
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

  private bfs(start: { x: number; y: number }, goals: { x: number; y: number }[]) {
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
        const nk = key(cx + dx, cy + dy);
        if (prev.has(nk) || this.solidTile(cx + dx, cy + dy)) continue;
        prev.set(nk, cur);
        q.push(nk);
      }
    }
    return null;
  }

  // ------------------------------------------------------------ update
  private collides(x: number, y: number) {
    const x0 = Math.floor((x - HALF_W) / T);
    const x1 = Math.floor((x + HALF_W - 0.01) / T);
    const y0 = Math.floor((y - BOX_H) / T);
    const y1 = Math.floor((y - 0.01) / T);
    for (let ty = y0; ty <= y1; ty++) for (let tx = x0; tx <= x1; tx++) if (this.solidTile(tx, ty)) return true;
    return false;
  }

  private update(dt: number) {
    let vx = 0;
    let vy = 0;
    const k = this.keys;
    if (k.has("arrowleft") || k.has("a")) vx -= 1;
    if (k.has("arrowright") || k.has("d")) vx += 1;
    if (k.has("arrowup") || k.has("w")) vy -= 1;
    if (k.has("arrowdown") || k.has("s")) vy += 1;

    if (vx === 0 && vy === 0 && this.path.length) {
      const next = this.path[0];
      const gx = next.x * T + T / 2;
      const gy = next.y * T + T - 3;
      const dx = gx - this.player.x;
      const dy = gy - this.player.y;
      const d = Math.hypot(dx, dy);
      if (d < 1.5) {
        this.player.x = gx;
        this.player.y = gy;
        this.path.shift();
        if (this.path.length === 0) this.arrive();
      } else {
        vx = dx / d;
        vy = dy / d;
      }
    }

    const moving = vx !== 0 || vy !== 0;
    if (moving) {
      const len = Math.hypot(vx, vy);
      const sx = (vx / len) * SPEED * dt;
      const sy = (vy / len) * SPEED * dt;
      if (!this.collides(this.player.x + sx, this.player.y)) this.player.x += sx;
      if (!this.collides(this.player.x, this.player.y + sy)) this.player.y += sy;
      if (Math.abs(vx) > Math.abs(vy)) this.player.dir = vx > 0 ? "right" : "left";
      else this.player.dir = vy > 0 ? "down" : "up";
      this.player.anim += dt;
    } else this.player.anim = 0;
    this.player.moving = moving;
    this.computeNear();
  }

  private computeNear() {
    let best: number | null = null;
    let bestD = ENTER_DIST;
    const px = this.player.x;
    const py = this.player.y - 6;
    this.map.stops.forEach((s, i) => {
      const d = Math.hypot(s.bx * T + T - px, (s.by + 2) * T + 6 - py);
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
    const mapW = this.map.w * T;
    const mapH = this.map.h * T;
    const cx = this.player.x - view.w / 2;
    const cy = this.player.y - 8 - view.h / 2;
    this.cam.x = view.w >= mapW ? (mapW - view.w) / 2 : Math.max(0, Math.min(mapW - view.w, cx));
    this.cam.y = view.h >= mapH ? (mapH - view.h) / 2 : Math.max(0, Math.min(mapH - view.h, cy));
    const z = this.zoom * dpr;

    g.setTransform(1, 0, 0, 1, 0, 0);
    g.fillStyle = this.map.theme.bg;
    g.fillRect(0, 0, this.canvas.width, this.canvas.height);
    g.imageSmoothingEnabled = false;
    g.setTransform(z, 0, 0, z, -Math.round(this.cam.x * z), -Math.round(this.cam.y * z));
    g.drawImage(this.frames[Math.abs(Math.floor(this.time * 1.6)) % 2], 0, 0);

    if (this.mark && this.time - this.mark.t < 0.6 && this.path.length) {
      g.strokeStyle = `rgba(255,255,255,${1 - (this.time - this.mark.t) / 0.6})`;
      g.lineWidth = 1;
      g.strokeRect(this.mark.x * T + 1.5, this.mark.y * T + 1.5, T - 3, T - 3);
    }

    type Ent = { y: number; draw: () => void };
    const ents: Ent[] = this.map.stops.map((s, i) => ({ y: (s.by + 2) * T, draw: () => this.drawStop(s, i) }));
    ents.push({ y: this.player.y, draw: () => this.drawPlayer() });
    ents.sort((a, b) => a.y - b.y);
    ents.forEach((e) => e.draw());
    this.map.stops.forEach((s, i) => this.drawLabel(s, i));
  }

  private drawPlayer() {
    const p = this.player;
    const f = p.moving ? [1, 0, 2, 0][Math.floor(p.anim * 8) % 4] : 0;
    const g = this.ctx;
    g.fillStyle = "rgba(0,0,0,0.25)";
    g.beginPath();
    g.ellipse(p.x, p.y - 0.5, 5, 2, 0, 0, Math.PI * 2);
    g.fill();
    g.drawImage(this.sprites[p.dir][f], Math.round(p.x - 8), Math.round(p.y - 16));
  }

  private drawStop(s: Stop, i: number) {
    const g = this.ctx;
    const x = s.bx * T;
    const y = s.by * T;
    g.fillStyle = "rgba(0,0,0,0.28)";
    g.beginPath();
    g.ellipse(x + 16, y + 31, 17, 3, 0, 0, Math.PI * 2);
    g.fill();

    if (s.kind === "finish") {
      g.font = "26px sans-serif";
      g.textAlign = "center";
      g.textBaseline = "alphabetic";
      const bob = Math.sin(this.time * 3) * 1.5;
      g.fillText(this.won ? "🏆" : "🎁", x + 16, y + 28 + bob);
      if (this.won) {
        g.fillStyle = "#ffe27a";
        g.font = "bold 8px sans-serif";
        for (let k = 0; k < 3; k++) g.fillText("✦", x + 4 + k * 12, y + 4 + Math.sin(this.time * 4 + k * 2) * 3);
      }
      return;
    }

    const s2 = this.stations[i];
    const locked = !s2.unlocked;
    const color = STOP_COLORS[i % STOP_COLORS.length];
    const dark = "#1d1b2e";
    const wall = locked ? "#a9adc9" : shade(color, 70);
    const roof = locked ? "#767a9e" : color;

    if (s2.current) {
      g.fillStyle = `rgba(255,200,60,${0.35 + Math.sin(this.time * 5) * 0.15})`;
      g.beginPath();
      g.ellipse(x + 16, y + 32, 22, 5, 0, 0, Math.PI * 2);
      g.fill();
    }
    g.fillStyle = dark;
    g.fillRect(x + 2, y + 13, 28, 18);
    g.fillStyle = wall;
    g.fillRect(x + 3, y + 14, 26, 16);
    g.fillStyle = shade(wall, -24);
    g.fillRect(x + 3, y + 27, 26, 3);
    tri(g, dark, x - 1, y + 15, x + 16, y - 1, x + 33, y + 15);
    tri(g, roof, x + 1, y + 14, x + 16, y + 1, x + 31, y + 14);
    tri(g, shade(roof, 40), x + 1, y + 14, x + 16, y + 1, x + 16, y + 14);
    g.fillStyle = dark;
    g.fillRect(x + 12, y + 19, 8, 12);
    g.fillStyle = locked ? "#6b6f94" : "#8a5a2c";
    g.fillRect(x + 13, y + 20, 6, 11);
    g.fillStyle = locked ? "#8d91b3" : "#bfe9ff";
    g.fillRect(x + 5, y + 18, 5, 5);
    g.fillRect(x + 22, y + 18, 5, 5);
    // biển số
    g.fillStyle = dark;
    g.beginPath();
    g.arc(x + 16, y + 11, 5.5, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = "#fff";
    g.beginPath();
    g.arc(x + 16, y + 11, 4.5, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = dark;
    g.font = "bold 7px 'Baloo 2', sans-serif";
    g.textAlign = "center";
    g.textBaseline = "middle";
    g.fillText(String(s2.number), x + 16, y + 11.5);
    if (locked) {
      g.fillStyle = dark;
      g.fillRect(x + 13, y + 23, 6, 6);
      g.fillStyle = "#ffcf3d";
      g.fillRect(x + 14, y + 24, 4, 4);
      g.strokeStyle = dark;
      g.lineWidth = 1;
      g.beginPath();
      g.arc(x + 16, y + 23, 2, Math.PI, 0);
      g.stroke();
    }
    if (s2.passed) {
      g.fillStyle = dark;
      g.fillRect(x + 27, y - 3, 2, 10);
      g.fillStyle = "#2fbf71";
      g.fillRect(x + 29, y - 3, 6, 4);
    }
  }

  private drawLabel(s: Stop, i: number) {
    const g = this.ctx;
    const x = s.bx * T + T;
    const y = s.by * T;
    const text = s.kind === "finish" ? (this.won ? "Nhà vô địch!" : "Kho báu") : this.stations[i].title;
    const locked = s.kind === "level" && !this.stations[i].unlocked;
    g.font = "bold 6px 'Be Vietnam Pro', sans-serif";
    g.textAlign = "center";
    g.textBaseline = "middle";
    const w = g.measureText(text).width + 8;
    const py = y - 12;
    g.fillStyle = "#1d1b2e";
    roundRect(g, x - w / 2 - 1, py - 5.5, w + 2, 11, 4);
    g.fillStyle = locked ? "#c9cce3" : "#fff8ea";
    roundRect(g, x - w / 2, py - 4.5, w, 9, 3.5);
    g.fillStyle = locked ? "#5b5f82" : "#1f2140";
    g.fillText(text, x, py + 0.5);

    if (s.kind === "level") {
      const info = this.stations[i];
      if (info.unlocked) {
        g.font = "8px sans-serif";
        for (let k = 0; k < 3; k++) {
          g.fillStyle = k < info.stars ? "#ffc93c" : "#00000055";
          g.fillText("★", x - 9 + k * 9, y - 3);
        }
      }
      if (info.current) {
        const bounce = Math.sin(this.time * 6) * 2;
        tri(g, "#1d1b2e", x - 6, y - 29 + bounce, x + 6, y - 29 + bounce, x, y - 20 + bounce);
        tri(g, "#ffb020", x - 4.5, y - 28 + bounce, x + 4.5, y - 28 + bounce, x, y - 22 + bounce);
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

function shade(hex: string, amt: number) {
  const n = parseInt(hex.slice(1), 16);
  const c = (v: number) => Math.max(0, Math.min(255, v + amt));
  return `rgb(${c(n >> 16)},${c((n >> 8) & 255)},${c(n & 255)})`;
}
