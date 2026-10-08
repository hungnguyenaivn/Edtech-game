import { MAX_STEP, MOVE_SPEED, type MoveMode, canStep, isBlocked, surfaceH, tileMode } from "./movement";
import { MAX_H, type OverworldMap, type StationInfo, type Stop } from "./overworld-gen";
import { type DrawEnv, type Pt, TH, TW, ZH, drawLabel, drawStop } from "./overworld-draw";
import { type TerrainEnv, WALL_EXTRA, drawTile, paintTerrain } from "./overworld-terrain";
import { CANOPY_H, type Climb, climbPose, defaultEnds, inDeck, isLadderEdge, stepClimb } from "./treehouse";
import { type TreeDrawEnv, canopyBox, drawTreeHouse, drawTreeHouseLabel } from "./treehouse-draw";
import { type CharSprites, type Dir, buildCharacter } from "./sprites";

export { STOP_COLORS, buildOverworld } from "./overworld-gen";
export type { OverworldMap, StationInfo, Stop } from "./overworld-gen";

// ---------------------------------------------------------------- engine
const WATER_Z = -0.3; // mặt nước thấp hơn nền một chút khi bơi
const RADIUS = 0.22; // nửa bề rộng chân nhân vật (ô)
const ENTER_DIST = 1.4; // ô
const DIRS: [number, number][] = [[1, 0], [-1, 0], [0, 1], [0, -1]];
const MOVE_KEYS = ["arrowup", "arrowdown", "arrowleft", "arrowright", "w", "a", "s", "d"];

export type OverworldCallbacks = {
  onNear: (stopIndex: number | null) => void;
  onEnter: (stopIndex: number) => void;
};


export class OverworldEngine {
  private ctx: CanvasRenderingContext2D;
  /** Độ cao hiển thị (tường viền cộng thêm WALL_EXTRA). */
  private dh: number[][];
  private tenv: TerrainEnv;
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
  /** Đang leo thang nhà cây (null khi không leo). */
  private climb: Climb | null = null;
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
    this.oy = Math.max(MAX_H, map.treeHouse ? map.treeHouse.z + CANOPY_H + 2 : 0) * ZH + 64;
    this.dh = map.height.map((row, y) => row.map((h, x) => h + (map.cells[y][x].ground === "wall" ? WALL_EXTRA : 0)));
    const colors = paintTerrain(map);
    this.tenv = { ...colors, g: this.ctx, map, dh: this.dh, time: 0, spriteCache: this.spriteCache };
    const s = map.stops[startStop];
    const px = s.bx + 1;
    const py = s.by + 3.2;
    this.player = { x: px, y: py, z: this.groundAt(px, py), dir: "up", moving: false, anim: 0, mode: "walk" };
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
    if (this.climb) {
      this.climb.dir = 0;
      this.climb.auto = false;
    }
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

  /** Độ cao mặt đứng (sàn nhà cây hoặc mặt đất) — dùng cho đi lại; vẽ địa hình thì dùng dh. */
  private tileH(tx: number, ty: number) {
    return surfaceH(this.map, tx, ty);
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
    const maxH = Math.max(MAX_H + WALL_EXTRA, this.map.treeHouse?.z ?? 0);
    for (let hh = 0; hh <= maxH; hh++) {
      const a = (wx - this.ox) / (TW / 2);
      const b = (wy - this.oy + hh * ZH) / (TH / 2);
      const tx = Math.floor((a + b) / 2);
      const ty = Math.floor((b - a) / 2);
      if (tx < 0 || ty < 0 || tx >= this.map.w || ty >= this.map.h) continue;
      if (this.tileH(tx, ty) !== hh) continue;
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
    const th = this.map.treeHouse;
    // đang leo dở: tìm đường từ chân thang, rồi leo tiếp lên hoặc xuống tuỳ đường đi
    const start = this.climb && th ? { ...th.foot } : { x: Math.floor(this.player.x), y: Math.floor(this.player.y) };
    const open = goals.filter((g) => !this.solidTile(g.x, g.y));
    const route = this.bfs(start, open, false) ?? this.bfs(start, open, true);
    if (!route) return;
    if (this.climb && th) {
      const up = route.length > 0 && route[0].x === th.top.x && route[0].y === th.top.y;
      this.climb.dir = up ? 1 : -1;
      this.climb.auto = true;
      this.path = up ? route : [start, ...route];
    } else this.path = [start, ...route];
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

    if (this.climb || this.maybeStartClimb(manual, vx, vy)) {
      this.updateClimb(dt, manual, vy);
      this.computeNear();
      return;
    }

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

  /** Bắt đầu leo khi: giữ phím đi về phía sàn ở chân thang (hoặc ra mép ở đầu thang), hoặc đường đi tự động bước qua thang. */
  private maybeStartClimb(manual: boolean, vx: number, vy: number) {
    const th = this.map.treeHouse;
    if (!th) return false;
    const p = this.player;
    const tx = Math.floor(p.x);
    const ty = Math.floor(p.y);
    const atFoot = tx === th.foot.x && ty === th.foot.y;
    const atTop = tx === th.top.x && ty === th.top.y;
    let dir: 1 | -1 | 0 = 0;
    if (manual) {
      if (atFoot && vy < 0 && vx <= 0 && p.y - th.foot.y < 0.45) dir = 1;
      else if (atTop && vy > 0 && vx >= 0 && p.y - th.top.y > 0.55) dir = -1;
    } else if (this.path.length && Math.hypot(p.x - tx - 0.5, p.y - ty - 0.5) < 0.1) {
      const next = this.path[0];
      if (isLadderEdge(th, tx, ty, next.x, next.y)) dir = atFoot ? 1 : -1;
    }
    if (!dir) return false;
    const ends = defaultEnds(th);
    const here = { x: p.x, y: p.y };
    this.climb = { t: dir > 0 ? 0 : 1, dir, auto: !manual, bottom: dir > 0 ? here : ends.bottom, topPos: dir > 0 ? ends.topPos : here };
    p.mode = "climb";
    this.settling = false;
    return true;
  }

  private updateClimb(dt: number, manual: boolean, vy: number) {
    const th = this.map.treeHouse!;
    const c = this.climb!;
    const p = this.player;
    if (manual) {
      c.auto = false;
      c.dir = vy < 0 ? 1 : vy > 0 ? -1 : 0;
    } else if (!c.auto) c.dir = 0;
    stepClimb(th, c, dt);
    const pose = climbPose(th, c);
    p.x = pose.x;
    p.y = pose.y;
    p.z = pose.z;
    p.dir = "up";
    p.moving = c.dir !== 0;
    if (p.moving) p.anim += dt;
    if ((c.t >= 1 && c.dir > 0) || (c.t <= 0 && c.dir < 0)) {
      this.climb = null;
      p.mode = "walk";
      p.z = this.groundAt(p.x, p.y);
    }
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
    const tx = Math.floor(p.x);
    const ty = Math.floor(p.y);
    return {
      x: p.x,
      y: p.y,
      z: p.z,
      mode: p.mode,
      tx,
      ty,
      speed: MOVE_SPEED[p.mode],
      paths: this.path.length,
      climbT: this.climb?.t ?? null,
      climbDir: this.climb?.dir ?? 0,
      onDeck: inDeck(this.map.treeHouse, tx, ty),
      surface: this.tileH(tx, ty),
    };
  }

  /** Đặt nhân vật vào giữa một ô (chỉ dùng cho kiểm thử E2E). */
  debugTeleport(tx: number, ty: number) {
    this.path = [];
    this.target = null;
    this.climb = null;
    this.player.mode = "walk";
    this.player.x = tx + 0.5;
    this.player.y = ty + 0.5;
    this.updateElevation(0.1);
  }

  /** Nhà trên cây của bản đồ (bản sao, để kiểm thử), null nếu không có. */
  debugTreeHouse() {
    const th = this.map.treeHouse;
    if (!th) return null;
    const deck: { x: number; y: number }[] = [];
    for (let y = th.y; y <= th.y + 2; y++) for (let x = th.x; x <= th.x + 2; x++) deck.push({ x, y });
    return { x: th.x, y: th.y, z: th.z, g: th.g, foot: { ...th.foot }, top: { ...th.top }, deck };
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
  private drawEnv(): DrawEnv {
    return {
      g: this.ctx,
      time: this.time,
      won: this.won,
      stations: this.stations,
      projX: (x, y) => this.projX(x, y),
      projY: (x, y, z) => this.projY(x, y, z),
      stopAnchor: (s) => this.stopAnchor(s),
    };
  }

  private render() {
    const g = this.ctx;
    this.tenv.time = this.time;
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
    const th = map.treeHouse;
    const sFront = th ? th.x + th.y + 4 : -1; // đường chéo của mép trước sàn (cũng là của chân thang)
    const onTree = !!th && (p.mode === "climb" || inDeck(th, Math.floor(p.x), Math.floor(p.y)));
    // đứng dưới đất ngay trước mặt +x / +y của sàn: tuy đường chéo nhỏ hơn nhưng vẫn ở trước cột chống → vẽ sau nhà cây
    const inFront =
      !!th && !onTree && ps >= sFront - 2 && ps < sFront && (p.y >= th.y + 3 || p.x >= th.x + 3) &&
      p.x > th.x - 2 && p.x < th.x + 5 && p.y > th.y - 2 && p.y < th.y + 5;
    const frame = Math.floor(this.time * 1.6);

    for (let s = 0; s <= map.w + map.h - 2; s++) {
      const xa = Math.max(0, s - map.h + 1);
      const xb = Math.min(map.w - 1, s);
      for (let x = xa; x <= xb; x++) {
        const y = s - x;
        const sx = this.projX(x, y);
        const sy = this.projY(x, y, this.dh[y][x]);
        if (sx < vx0 || sx > vx1 || sy < vy0 || sy > vy1) continue;
        drawTile(this.tenv, x, y, sx, sy, frame);
        const stop = map.stops.findIndex((st) => st.bx + 1 === x && st.by + 1 === y);
        if (stop >= 0) drawStop(this.drawEnv(), map.stops[stop], stop);
      }
      if (th && s === sFront) {
        drawTreeHouse(this.treeEnv(), th, { player: onTree ? () => this.drawPlayer() : null, canopyAlpha: this.canopyAlpha(onTree, ps < sFront) });
        if (onTree || inFront) playerDrawn = true;
        if (inFront) this.drawPlayer();
      }
      if (s === ps && !onTree && !inFront) {
        this.drawPlayer();
        playerDrawn = true;
      }
    }
    if (!playerDrawn) this.drawPlayer();
    const env = this.drawEnv();
    map.stops.forEach((s, i) => drawLabel(env, s, i));
    if (th) drawTreeHouseLabel(this.treeEnv(), th);
  }

  private treeEnv(): TreeDrawEnv {
    return { g: this.ctx, time: this.time, leaf: this.map.theme.leaf, projX: (x, y) => this.projX(x, y), projY: (x, y, z) => this.projY(x, y, z) };
  }

  /** Tán lá mờ đi khi người chơi ở trên cây, hoặc đứng phía sau bị tán lá che. */
  private canopyAlpha(onTree: boolean, behind: boolean) {
    if (onTree) return 0.3;
    if (!behind || !this.map.treeHouse) return 1;
    const b = canopyBox(this.treeEnv(), this.map.treeHouse);
    const px = this.projX(this.player.x, this.player.y);
    const py = this.projY(this.player.x, this.player.y, this.player.z);
    return px > b.x0 && px < b.x1 && py > b.y0 && py < b.y1 + 24 ? 0.4 : 1;
  }

  private drawPlayer() {
    const p = this.player;
    const f = p.moving ? [1, 0, 2, 0][Math.floor(p.anim * 8) % 4] : 0;
    const g = this.ctx;
    const sx = this.projX(p.x, p.y);
    const sy = this.projY(p.x, p.y, p.z);
    if (p.mode === "swim") this.drawSwimmer(sx, this.projY(p.x, p.y, 0) + 2, (p.z - WATER_Z) * ZH, this.sprites[p.dir][f]);
    else if (p.mode === "climb" && this.map.treeHouse) {
      // bóng nhỏ dần trên mặt đất dưới chân thang
      const th = this.map.treeHouse;
      const k = Math.max(0.3, 1 - (p.z - th.g) / (th.z - th.g));
      g.fillStyle = `rgba(0,0,0,${0.3 * k})`;
      g.beginPath();
      g.ellipse(sx, this.projY(p.x, th.y + 3 + 0.3, th.g), 8 * k, 4 * k, 0, 0, Math.PI * 2);
      g.fill();
      g.drawImage(this.sprites[p.dir][f], Math.round(sx - 16), Math.round(sy - 30), 32, 32);
    } else {
      g.fillStyle = "rgba(0,0,0,0.3)";
      g.beginPath();
      g.ellipse(sx, sy, 8, 4, 0, 0, Math.PI * 2);
      g.fill();
      g.drawImage(this.sprites[p.dir][f], Math.round(sx - 16), Math.round(sy - 30), 32, 32);
    }

    if (this.mark && this.time - this.mark.t < 0.6 && this.path.length) {
      const m = this.mark;
      const mx = this.projX(m.x, m.y);
      const my = this.projY(m.x, m.y, this.tileH(m.x, m.y));
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
}
