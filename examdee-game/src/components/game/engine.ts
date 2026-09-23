import { type GameMap, isSolid, renderMap } from "./mapgen";
import { type CharSprites, type Dir, T, buildCharacter, buildRobot } from "./sprites";

export type NpcState = "open" | "correct" | "wrong";
type Npc = { tx: number; ty: number; state: NpcState; sprite: HTMLCanvasElement };

export type EngineCallbacks = {
  onNear: (npcIndex: number | null) => void;
  onInteract: (npcIndex: number) => void;
};

const SPEED = 72; // px nguồn / giây
const HALF_W = 5;
const BOX_H = 5;
const TALK_DIST = 22;

const NPC_ROBOT_COLORS: [string, string][] = [
  ["#b8c2e8", "#ffcf3d"], ["#9fe0d0", "#ff6b8a"], ["#e8c0f0", "#3dd6ff"], ["#f4d08a", "#7c6cff"], ["#c8e89f", "#ff9a3d"],
];
const HAIRS = ["#3b2a20", "#6b3f22", "#1d1b2e", "#a0522d", "#d9a441"];

export class GameEngine {
  private ctx: CanvasRenderingContext2D;
  private frames: HTMLCanvasElement[];
  private player: { x: number; y: number; dir: Dir; moving: boolean; anim: number };
  private playerSprites: CharSprites;
  private npcs: Npc[];
  private keys = new Set<string>();
  private path: { x: number; y: number }[] = [];
  private pathTargetNpc: number | null = null;
  private paused = false;
  private raf = 0;
  private last = 0;
  private time = 0;
  private near: number | null = null;
  private zoom = 3;
  private cam = { x: 0, y: 0 };
  private clickMark: { x: number; y: number; t: number } | null = null;
  private disposers: (() => void)[] = [];

  constructor(
    private canvas: HTMLCanvasElement,
    private map: GameMap,
    npcTiles: { x: number; y: number }[],
    avatarColor: string,
    private cb: EngineCallbacks,
  ) {
    this.ctx = canvas.getContext("2d")!;
    this.frames = [renderMap(map, 0), renderMap(map, 1)];
    this.player = { x: map.spawn.x * T + T / 2, y: map.spawn.y * T + T - 2, dir: "down", moving: false, anim: 0 };
    this.playerSprites = buildCharacter({ shirt: avatarColor, hair: "#2b1d16" });
    this.npcs = npcTiles.map((p, i) => ({ tx: p.x, ty: p.y, state: "open", sprite: this.npcSprite(i) }));
    this.bind();
    this.resize();
  }

  private npcSprite(i: number): HTMLCanvasElement {
    const kind = this.map.theme.npc;
    if (kind === "robot") {
      const [body, light] = NPC_ROBOT_COLORS[i % NPC_ROBOT_COLORS.length];
      return buildRobot(body, light);
    }
    if (kind === "scientist") return buildCharacter({ shirt: "#f4f6ff", hair: HAIRS[i % HAIRS.length], pants: "#5b6b8c" }).down[0];
    return buildCharacter({ shirt: ["#2f6fdb", "#ef5a5a", "#f59e0b", "#2fbf71", "#a855f7"][i % 5], hair: "#e04848", pants: "#f4f6ff" }).down[0];
  }

  /** Ảnh nhân vật hỏi bài để hiện trên thẻ câu hỏi. */
  getNpcSprite(i: number) {
    return this.npcs[i]?.sprite;
  }

  start() {
    this.last = performance.now();
    const loop = (now: number) => {
      // rAF có thể trả mốc thời gian sớm hơn performance.now() lúc khởi động → chặn dt âm
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
    this.pathTargetNpc = null;
  }

  setNpcState(i: number, s: NpcState) {
    if (this.npcs[i]) this.npcs[i].state = s;
  }

  // ------------------------------------------------------------ input
  private bind() {
    const down = (e: KeyboardEvent) => {
      if (this.paused) return;
      const k = e.key.toLowerCase();
      if (["arrowup", "arrowdown", "arrowleft", "arrowright", "w", "a", "s", "d"].includes(k)) {
        this.keys.add(k);
        this.path = [];
        this.pathTargetNpc = null;
        e.preventDefault();
      } else if (k === "e" || k === " " || k === "enter") {
        if (this.near !== null) {
          e.preventDefault();
          this.cb.onInteract(this.near);
        }
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
    this.disposers.push(() => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
      window.removeEventListener("blur", blur);
      window.removeEventListener("resize", resize);
      this.canvas.removeEventListener("click", click);
    });
  }

  private resize() {
    const dpr = window.devicePixelRatio || 1;
    const w = this.canvas.clientWidth || window.innerWidth;
    const h = this.canvas.clientHeight || window.innerHeight;
    this.canvas.width = Math.round(w * dpr);
    this.canvas.height = Math.round(h * dpr);
    this.zoom = Math.max(2, Math.floor(Math.min(w / (T * 26), h / (T * 15))));
  }

  private viewSize() {
    const dpr = window.devicePixelRatio || 1;
    return { w: this.canvas.width / dpr / this.zoom, h: this.canvas.height / dpr / this.zoom };
  }

  private npcAt(tx: number, ty: number) {
    return this.npcs.findIndex((n) => n.tx === tx && n.ty === ty);
  }

  private solidTile(tx: number, ty: number) {
    if (tx < 0 || ty < 0 || tx >= this.map.w || ty >= this.map.h) return true;
    return isSolid(this.map.cells[ty][tx]) || this.npcAt(tx, ty) >= 0;
  }

  private onClick(e: MouseEvent) {
    if (this.paused) return;
    const rect = this.canvas.getBoundingClientRect();
    const wx = this.cam.x + (e.clientX - rect.left) / this.zoom;
    const wy = this.cam.y + (e.clientY - rect.top) / this.zoom;
    const tx = Math.floor(wx / T);
    const ty = Math.floor(wy / T);
    const npc = this.npcAt(tx, ty);
    if (npc >= 0 && npc === this.near) {
      this.cb.onInteract(npc);
      return;
    }
    this.routeTo(tx, ty, npc);
  }

  /** Đi tới một nhân vật hỏi bài (dùng cho kiểm thử tự động). */
  walkToNpc(i: number) {
    const n = this.npcs[i];
    if (n) this.routeTo(n.tx, n.ty, i);
  }

  private routeTo(tx: number, ty: number, npc: number) {
    const start = { x: Math.floor(this.player.x / T), y: Math.floor((this.player.y - 2) / T) };
    const goals =
      npc >= 0
        ? [[1, 0], [-1, 0], [0, 1], [0, -1]].map(([dx, dy]) => ({ x: tx + dx, y: ty + dy }))
        : [{ x: tx, y: ty }];
    const route = this.bfs(start, goals.filter((g) => !this.solidTile(g.x, g.y)));
    if (!route) return;
    if (route.length === 0 && npc >= 0) {
      this.computeNear();
      if (this.near === npc) this.cb.onInteract(npc);
      return;
    }
    // Về giữa ô hiện tại trước để đi thẳng hàng, không cạ vào góc vật cản
    this.path = [start, ...route];
    this.pathTargetNpc = npc >= 0 ? npc : null;
    this.clickMark = { x: tx, y: ty, t: this.time };
  }

  private bfs(start: { x: number; y: number }, goals: { x: number; y: number }[]) {
    if (goals.length === 0) return null;
    const W = this.map.w;
    const key = (x: number, y: number) => y * W + x;
    const goalSet = new Set(goals.map((g) => key(g.x, g.y)));
    const prev = new Map<number, number>();
    const q = [key(start.x, start.y)];
    prev.set(q[0], -1);
    while (q.length) {
      const cur = q.shift()!;
      if (goalSet.has(cur)) {
        const out: { x: number; y: number }[] = [];
        for (let k = cur; k !== -1; k = prev.get(k)!) out.push({ x: k % W, y: Math.floor(k / W) });
        return out.reverse().slice(1);
      }
      const cx = cur % W;
      const cy = Math.floor(cur / W);
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nx = cx + dx;
        const ny = cy + dy;
        const nk = key(nx, ny);
        if (prev.has(nk) || this.solidTile(nx, ny)) continue;
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
        if (this.path.length === 0 && this.pathTargetNpc !== null) {
          const n = this.npcs[this.pathTargetNpc];
          this.player.dir = this.faceTowards(n.tx * T + T / 2, n.ty * T + T / 2);
          const target = this.pathTargetNpc;
          this.pathTargetNpc = null;
          this.computeNear();
          if (this.near === target) this.cb.onInteract(target);
        }
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

  private faceTowards(x: number, y: number): Dir {
    const dx = x - this.player.x;
    const dy = y - (this.player.y - 6);
    if (Math.abs(dx) > Math.abs(dy)) return dx > 0 ? "right" : "left";
    return dy > 0 ? "down" : "up";
  }

  private computeNear() {
    let best: number | null = null;
    let bestD = TALK_DIST;
    const px = this.player.x;
    const py = this.player.y - 6;
    this.npcs.forEach((n, i) => {
      const d = Math.hypot(n.tx * T + T / 2 - px, n.ty * T + T / 2 - py);
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

    // Dấu chỗ vừa bấm
    if (this.clickMark && this.time - this.clickMark.t < 0.6 && this.path.length) {
      const a = 1 - (this.time - this.clickMark.t) / 0.6;
      g.strokeStyle = `rgba(255,255,255,${a})`;
      g.lineWidth = 1;
      g.strokeRect(this.clickMark.x * T + 1.5, this.clickMark.y * T + 1.5, T - 3, T - 3);
    }

    // Sắp xếp theo chiều sâu
    type Ent = { y: number; draw: () => void };
    const ents: Ent[] = this.npcs.map((n, i) => ({
      y: n.ty * T + T,
      draw: () => this.drawNpc(n, i),
    }));
    ents.push({ y: this.player.y, draw: () => this.drawPlayer() });
    ents.sort((a, b) => a.y - b.y);
    ents.forEach((e) => e.draw());

    // Bong bóng trên đầu vẽ sau cùng
    this.npcs.forEach((n, i) => this.drawBubble(n, i === this.near));

    // Mũi tên chỉ tới bạn đang chờ gần nhất (khi ngoài màn hình)
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.drawPointer(view);
  }

  private drawShadow(x: number, y: number, w: number) {
    const g = this.ctx;
    g.fillStyle = "rgba(0,0,0,0.25)";
    g.beginPath();
    g.ellipse(x, y, w, 2, 0, 0, Math.PI * 2);
    g.fill();
  }

  private drawPlayer() {
    const p = this.player;
    const frames = this.playerSprites[p.dir];
    const f = p.moving ? [1, 0, 2, 0][Math.floor(p.anim * 8) % 4] : 0;
    this.drawShadow(p.x, p.y - 0.5, 5);
    this.ctx.drawImage(frames[f], Math.round(p.x - 8), Math.round(p.y - 16));
  }

  private drawNpc(n: Npc, i: number) {
    const g = this.ctx;
    const bob = n.state === "open" ? Math.round(Math.sin(this.time * 3 + i) * 0.6) : 0;
    this.drawShadow(n.tx * T + 8, n.ty * T + 15, 5);
    g.globalAlpha = n.state === "open" ? 1 : 0.75;
    g.drawImage(n.sprite, n.tx * T, n.ty * T + bob - 1);
    g.globalAlpha = 1;
  }

  private drawBubble(n: Npc, isNear: boolean) {
    const g = this.ctx;
    const x = n.tx * T + T / 2;
    const y = n.ty * T - 5 + (n.state === "open" ? Math.sin(this.time * 4 + n.tx) * 1.2 : 0);
    const fill = n.state === "open" ? "#ffffff" : n.state === "correct" ? "#2fbf71" : "#ef5a5a";
    const text = n.state === "open" ? "?" : n.state === "correct" ? "✓" : "✗";
    g.fillStyle = "#1d1b2e";
    g.beginPath();
    g.arc(x, y, 5.5, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = fill;
    g.beginPath();
    g.arc(x, y, 4.5, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = n.state === "open" ? "#4b3ccc" : "#ffffff";
    g.font = "bold 7px 'Baloo 2', sans-serif";
    g.textAlign = "center";
    g.textBaseline = "middle";
    g.fillText(text, x, y + 0.5);
    if (isNear && n.state === "open") {
      const ky = y - 11;
      g.fillStyle = "#1d1b2e";
      g.fillRect(x - 12, ky - 4, 24, 8);
      g.fillStyle = "#ffb020";
      g.fillRect(x - 11, ky - 3, 22, 6);
      g.fillStyle = "#3a2400";
      g.font = "bold 5px 'Be Vietnam Pro', sans-serif";
      g.fillText("Nhấn E", x, ky + 0.3);
    }
  }

  private drawPointer(view: { w: number; h: number }) {
    const open = this.npcs.filter((n) => n.state === "open");
    if (!open.length) return;
    let best = open[0];
    let bd = Infinity;
    for (const n of open) {
      const d = Math.hypot(n.tx * T - this.player.x, n.ty * T - this.player.y);
      if (d < bd) {
        bd = d;
        best = n;
      }
    }
    const sx = (best.tx * T + T / 2 - this.cam.x) * this.zoom;
    const sy = (best.ty * T + T / 2 - this.cam.y) * this.zoom;
    const W = view.w * this.zoom;
    const H = view.h * this.zoom;
    const m = 44;
    if (sx > m && sy > m && sx < W - m && sy < H - m) return;
    const pcx = (this.player.x - this.cam.x) * this.zoom;
    const pcy = (this.player.y - 8 - this.cam.y) * this.zoom;
    const ang = Math.atan2(sy - pcy, sx - pcx);
    const ex = Math.max(m, Math.min(W - m, sx));
    const ey = Math.max(m + 30, Math.min(H - m - 30, sy));
    const g = this.ctx;
    const pulse = 1 + Math.sin(this.time * 6) * 0.08;
    g.save();
    g.translate(ex, ey);
    g.scale(pulse, pulse);
    g.fillStyle = "#1d1b2ecc";
    g.beginPath();
    g.arc(0, 0, 20, 0, Math.PI * 2);
    g.fill();
    g.rotate(ang);
    g.fillStyle = "#ffb020";
    g.beginPath();
    g.moveTo(13, 0);
    g.lineTo(-7, -9);
    g.lineTo(-3, 0);
    g.lineTo(-7, 9);
    g.closePath();
    g.fill();
    g.restore();
  }
}
