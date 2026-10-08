import { type CharSprites, type Dir, buildCharacter } from "../sprites";
import { DROP_HIT, type Hazard } from "./bossAi";
import { type BossSprites, buildBoss, buildChip } from "./bossSprites";
import { ARENA, BOSS, type Combat, type CombatEvent, type Input, PLAYER, TICK, applyAnswer, createCombat, dropChip, snapshot, step } from "./combat";

export type BossCallbacks = {
  /** nhặt được mảnh mã → mở câu hỏi */
  onChip: () => void;
  /** máu / pha / lõi thay đổi → cập nhật HUD */
  onHud: (hud: BossHud) => void;
  onPauseKey: () => void;
};
export type BossHud = { hp: number; maxHp: number; phase: number; down: boolean; cores: Combat["cores"]; chip: boolean };

const MOVE_KEYS: Record<string, [number, number]> = {
  arrowup: [0, -1], w: [0, -1],
  arrowdown: [0, 1], s: [0, 1],
  arrowleft: [-1, 0], a: [-1, 0],
  arrowright: [1, 0], d: [1, 0],
};
const ATTACK_KEYS = new Set(["j", " ", "attack"]);
const DASH_KEYS = new Set(["k", "shift", "dash"]);

/** Vẽ và điều khiển trận đánh boss trên canvas; logic nằm ở combat.ts. */
export class BossEngine {
  readonly state: Combat;
  private ctx: CanvasRenderingContext2D;
  private sprites: CharSprites;
  private boss: BossSprites;
  private chip: HTMLCanvasElement;
  private keys = new Set<string>();
  private pressAttack = false;
  private pressDash = false;
  private paused = false;
  /** kiểm thử: dừng vòng lặp tự động, chỉ chạy khi gọi stepTicks */
  private manual = false;
  private raf = 0;
  private last = 0;
  private acc = 0;
  private time = 0;
  private shake = 0;
  private reducedMotion = false;
  private hudKey = "";
  private disposers: (() => void)[] = [];

  constructor(
    private canvas: HTMLCanvasElement,
    seed: number,
    total: number,
    avatarColor: string,
    skin: string,
    private cb: BossCallbacks,
  ) {
    this.ctx = canvas.getContext("2d")!;
    this.state = createCombat(seed, total);
    this.sprites = buildCharacter({ shirt: avatarColor, hair: "#2b1d16", skin });
    this.boss = buildBoss();
    this.chip = buildChip();
    this.reducedMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
    this.bind();
    this.resize();
    this.emitHud();
  }

  start() {
    this.last = performance.now();
    const loop = (now: number) => {
      const dt = Math.max(0, Math.min(0.05, (now - this.last) / 1000));
      this.last = now;
      this.time += dt;
      this.raf = requestAnimationFrame(loop);
      if (!this.paused && !this.manual && !document.hidden) {
        this.acc += dt;
        for (let n = 0; this.acc >= TICK && n < 5; n++) {
          this.acc -= TICK;
          this.tick();
        }
      }
      this.shake = Math.max(0, this.shake - dt);
      this.render();
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
    this.pressAttack = false;
    this.pressDash = false;
    this.acc = 0;
  }

  /** Nút trên màn hình cảm ứng: hướng đi, "attack", "dash". */
  setKey(k: string, down: boolean) {
    if (down) this.press(k);
    else this.keys.delete(k);
  }

  answer(correct: boolean) {
    applyAnswer(this.state, correct);
    this.emitHud();
  }

  // ------------------------------------------------------------ kiểm thử (gắn vào window.__vtBoss khi URL có ?e2e)
  snapshot() {
    return snapshot(this.state);
  }

  stepTicks(n: number) {
    this.manual = true;
    for (let i = 0; i < n; i++) this.tick();
    return this.snapshot();
  }

  dropChip() {
    const p = this.state.player;
    dropChip(this.state, p.x, p.y + 8);
    return this.snapshot();
  }

  setInvincible(on: boolean) {
    this.state.invincible = on;
  }

  // ------------------------------------------------------------ vòng lặp
  private input(): Input {
    let mx = 0;
    let my = 0;
    for (const k of this.keys) {
      const v = MOVE_KEYS[k];
      if (v) {
        mx += v[0];
        my += v[1];
      }
    }
    const inp = { mx: Math.sign(mx), my: Math.sign(my), attack: this.pressAttack, dash: this.pressDash };
    this.pressAttack = false;
    this.pressDash = false;
    return inp;
  }

  private tick() {
    step(this.state, this.input());
    this.handle(this.state.events);
  }

  private handle(events: CombatEvent[]) {
    if (events.length === 0) return;
    if (events.includes("hurt") && !this.reducedMotion) this.shake = 0.25;
    if (events.includes("chip")) {
      this.setPaused(true);
      this.cb.onChip();
    }
    this.emitHud();
  }

  private emitHud() {
    const s = this.state;
    const hud: BossHud = { hp: s.player.hp, maxHp: PLAYER.maxHp, phase: s.phase, down: s.player.downT > 0, cores: [...s.cores], chip: !!s.chip };
    const key = JSON.stringify(hud);
    if (key === this.hudKey) return;
    this.hudKey = key;
    this.cb.onHud(hud);
  }

  private press(k: string) {
    if (ATTACK_KEYS.has(k)) this.pressAttack = true;
    else if (DASH_KEYS.has(k)) this.pressDash = true;
    else if (MOVE_KEYS[k]) this.keys.add(k);
  }

  private bind() {
    const down = (e: KeyboardEvent) => {
      if (this.paused) return;
      const k = e.key.toLowerCase();
      if (k === "escape") return this.cb.onPauseKey();
      if (!MOVE_KEYS[k] && !ATTACK_KEYS.has(k) && !DASH_KEYS.has(k)) return;
      e.preventDefault();
      if (e.repeat && !MOVE_KEYS[k]) return;
      this.press(k);
    };
    const up = (e: KeyboardEvent) => this.keys.delete(e.key.toLowerCase());
    const blur = () => this.keys.clear();
    const resize = () => this.resize();
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    window.addEventListener("blur", blur);
    window.addEventListener("resize", resize);
    const ro = new ResizeObserver(resize);
    ro.observe(this.canvas);
    this.disposers.push(() => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
      window.removeEventListener("blur", blur);
      window.removeEventListener("resize", resize);
      ro.disconnect();
    });
  }

  private resize() {
    const dpr = window.devicePixelRatio || 1;
    this.canvas.width = Math.round((this.canvas.clientWidth || 480) * dpr);
    this.canvas.height = Math.round((this.canvas.clientHeight || 480) * dpr);
  }

  // ------------------------------------------------------------ vẽ
  private render() {
    const g = this.ctx;
    const W = this.canvas.width;
    const H = this.canvas.height;
    // phóng theo số nguyên điểm ảnh thiết bị để pixel art sắc nét
    const fit = Math.min(W, H) / ARENA;
    const scale = fit >= 1 ? Math.floor(fit) : fit;
    const sx = this.shake > 0 ? Math.round((Math.random() - 0.5) * 4 * scale) : 0;
    const ox = Math.round((W - ARENA * scale) / 2) + sx;
    const oy = Math.round((H - ARENA * scale) / 2);
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.fillStyle = "#070b1c";
    g.fillRect(0, 0, W, H);
    g.imageSmoothingEnabled = false;
    g.setTransform(scale, 0, 0, scale, ox, oy);
    this.drawFloor(g);
    for (const h of this.state.hazards) if (h.t < h.warn) this.drawWarning(g, h);
    this.drawCores(g);
    this.drawBoss(g);
    if (this.state.chip) this.drawChip(g);
    this.drawPlayer(g);
    for (const h of this.state.hazards) if (h.t >= h.warn) this.drawHazard(g, h);
  }

  private drawFloor(g: CanvasRenderingContext2D) {
    g.fillStyle = "#0b1430";
    g.fillRect(0, 0, ARENA, ARENA);
    g.strokeStyle = "#16305a";
    g.lineWidth = 1;
    g.beginPath();
    for (let i = 0; i <= ARENA; i += 16) {
      g.moveTo(i + 0.5, 0);
      g.lineTo(i + 0.5, ARENA);
      g.moveTo(0, i + 0.5);
      g.lineTo(ARENA, i + 0.5);
    }
    g.stroke();
    g.strokeStyle = `rgba(34,211,238,${0.5 + Math.sin(this.time * 2) * 0.2})`;
    g.lineWidth = 2;
    g.strokeRect(5, 17, ARENA - 10, ARENA - 22);
  }

  /** 0..1 nhấp nháy theo tần số f; bật "giảm chuyển động" thì giữ cố định. */
  private pulse(f: number) {
    return this.reducedMotion ? 0.5 : Math.abs(Math.sin(this.time * f));
  }

  private drawWarning(g: CanvasRenderingContext2D, h: Hazard) {
    const k = Math.min(1, h.t / Math.max(0.01, h.warn));
    const blink = 0.35 + 0.35 * this.pulse(12);
    g.strokeStyle = `rgba(255,61,107,${blink + 0.2})`;
    g.fillStyle = `rgba(255,61,107,${0.12 + k * 0.2})`;
    g.lineWidth = 1;
    if (h.kind === "drop") {
      g.beginPath();
      g.arc(h.x, h.y, h.r, 0, Math.PI * 2);
      g.stroke();
      g.beginPath();
      g.arc(h.x, h.y, h.r * k, 0, Math.PI * 2);
      g.fill();
    } else if (h.kind === "beam") {
      g.setLineDash([4, 3]);
      g.beginPath();
      g.moveTo(0, h.y);
      g.lineTo(h.gapX, h.y);
      g.moveTo(h.gapX + h.gapW, h.y);
      g.lineTo(ARENA, h.y);
      g.stroke();
      g.setLineDash([]);
      // cột sáng xanh chỉ chỗ khe an toàn
      g.fillStyle = `rgba(74,222,128,${0.08 + blink * 0.15})`;
      g.fillRect(h.gapX, h.y, h.gapW, ARENA - h.y);
    } else {
      g.beginPath();
      g.arc(BOSS.x, BOSS.y, BOSS.r + 6 + k * 6, 0, Math.PI * 2);
      g.stroke();
    }
  }

  private drawHazard(g: CanvasRenderingContext2D, h: Hazard) {
    if (h.kind === "drop") {
      const hot = h.t < h.warn + DROP_HIT;
      g.fillStyle = hot ? "#ff5d3d" : "rgba(255,93,61,0.35)";
      g.beginPath();
      g.arc(h.x, h.y, h.r, 0, Math.PI * 2);
      g.fill();
      if (hot) {
        g.fillStyle = "#ffd166";
        g.beginPath();
        g.arc(h.x, h.y, h.r * 0.5, 0, Math.PI * 2);
        g.fill();
      }
    } else if (h.kind === "beam") {
      const y0 = Math.round(h.y - h.h / 2);
      g.fillStyle = "#ff3d6b";
      g.fillRect(0, y0, h.gapX, h.h);
      g.fillRect(h.gapX + h.gapW, y0, ARENA - h.gapX - h.gapW, h.h);
      g.fillStyle = "#ffd6de";
      g.fillRect(0, y0 + h.h / 2 - 1, h.gapX, 2);
      g.fillRect(h.gapX + h.gapW, y0 + h.h / 2 - 1, ARENA - h.gapX - h.gapW, 2);
    } else {
      g.fillStyle = "#1d1b2e";
      g.beginPath();
      g.arc(h.x, h.y, h.r + 1, 0, Math.PI * 2);
      g.fill();
      g.fillStyle = "#e879f9";
      g.beginPath();
      g.arc(h.x, h.y, h.r, 0, Math.PI * 2);
      g.fill();
    }
  }

  private drawBoss(g: CanvasRenderingContext2D) {
    const b = this.state.boss;
    const bob = b.mode === "stunned" || b.mode === "done" || this.reducedMotion ? 0 : Math.round(Math.sin(this.time * 2.5) * 2);
    const img = b.flash > 0 ? this.boss.flash : b.mode === "stunned" || b.mode === "done" ? this.boss.stunned : this.boss.normal;
    // khiên: chỉ hở khi boss vừa tấn công xong hoặc đang choáng
    if (b.mode !== "exposed" && b.mode !== "stunned" && b.mode !== "done") {
      g.strokeStyle = `rgba(34,211,238,${0.45 + Math.sin(this.time * 4) * 0.15})`;
      g.lineWidth = 2;
      g.beginPath();
      g.arc(BOSS.x, BOSS.y + bob, BOSS.r + 3, 0, Math.PI * 2);
      g.stroke();
    }
    if (b.mode === "telegraph") {
      g.fillStyle = `rgba(255,61,107,${0.2 + this.pulse(10) * 0.25})`;
      g.beginPath();
      g.arc(BOSS.x, BOSS.y + bob, BOSS.r + 1, 0, Math.PI * 2);
      g.fill();
    }
    g.drawImage(img, BOSS.x - 24, BOSS.y - 24 + bob, 48, 48);
    if (b.mode === "stunned") {
      g.fillStyle = "#ffd166";
      g.font = "8px sans-serif";
      g.textAlign = "center";
      for (let k = 0; k < 3; k++) {
        const a = this.time * 3 + (k * Math.PI * 2) / 3;
        g.fillText("✦", BOSS.x + Math.cos(a) * 16, BOSS.y - 26 + Math.sin(a) * 4);
      }
    }
    if (b.mode === "exposed" || b.mode === "stunned") {
      for (let k = 0; k < BOSS.hitsPerChip; k++) {
        g.fillStyle = k < b.hits ? "#4ade80" : "#ffffff44";
        g.fillRect(BOSS.x - 8 + k * 6, BOSS.y + BOSS.r + 6, 4, 4);
      }
    }
  }

  /** 10 lõi xếp thành vòng cung phía trên boss: xanh = còn, đen nứt = đã phá, xám = đã vá. */
  private drawCores(g: CanvasRenderingContext2D) {
    const n = this.state.cores.length;
    this.state.cores.forEach((c, i) => {
      const a = Math.PI + (Math.PI * (i + 0.5)) / n;
      const x = Math.round(BOSS.x + Math.cos(a) * 44);
      const y = Math.round(BOSS.y + 6 + Math.sin(a) * 34);
      g.fillStyle = "#1d1b2e";
      g.fillRect(x - 4, y - 4, 8, 8);
      g.fillStyle = c === "intact" ? "#22d3ee" : c === "ok" ? "#0b1430" : "#64748b";
      g.fillRect(x - 3, y - 3, 6, 6);
      if (c === "ok") {
        g.fillStyle = "#4ade80";
        g.fillRect(x - 2, y - 1, 4, 1);
        g.fillRect(x - 1, y - 2, 1, 4);
      }
    });
  }

  private drawChip(g: CanvasRenderingContext2D) {
    const c = this.state.chip!;
    const bob = this.reducedMotion ? 0 : Math.round(Math.sin(this.time * 5) * 2);
    g.fillStyle = `rgba(74,222,128,${0.25 + this.pulse(4) * 0.25})`;
    g.beginPath();
    g.arc(c.x, c.y + bob, 9, 0, Math.PI * 2);
    g.fill();
    g.drawImage(this.chip, Math.round(c.x - 4.5), Math.round(c.y - 4.5 + bob));
  }

  private drawPlayer(g: CanvasRenderingContext2D) {
    const p = this.state.player;
    const x = Math.round(p.x);
    const y = Math.round(p.y);
    g.fillStyle = "rgba(0,0,0,0.35)";
    g.beginPath();
    g.ellipse(x, y + 1, 6, 2.5, 0, 0, Math.PI * 2);
    g.fill();
    if (p.downT > 0) {
      g.globalAlpha = 0.5;
      g.save();
      g.translate(x, y - 4);
      g.rotate(Math.PI / 2);
      g.drawImage(this.sprites.down[0], -8, -8);
      g.restore();
      g.globalAlpha = 1;
      g.fillStyle = "#fff";
      g.font = "bold 8px sans-serif";
      g.textAlign = "center";
      g.fillText(`${Math.ceil(p.downT)}`, x, y - 16);
      return;
    }
    const dir: Dir = Math.abs(p.faceX) > Math.abs(p.faceY) ? (p.faceX > 0 ? "right" : "left") : p.faceY < 0 ? "up" : "down";
    const frame = p.moving ? [1, 0, 2, 0][Math.floor(this.time * 8) % 4] : 0;
    if (p.dashT > 0) {
      g.globalAlpha = 0.35;
      g.drawImage(this.sprites[dir][frame], x - 8 - Math.round(p.dashX * 10), y - 15 - Math.round(p.dashY * 10));
      g.globalAlpha = 1;
    }
    if (p.iframes > 0 && Math.floor(this.time * 16) % 2 === 0) g.globalAlpha = 0.4;
    g.drawImage(this.sprites[dir][frame], x - 8, y - 15);
    g.globalAlpha = 1;
    if (p.attackT > 0) {
      const a = Math.atan2(p.faceY, p.faceX);
      const k = 1 - p.attackT / PLAYER.attackShow;
      g.strokeStyle = `rgba(255,255,255,${1 - k * 0.6})`;
      g.lineWidth = 2;
      g.beginPath();
      g.arc(x, y - 6, PLAYER.reach - 4, a - 1.1 + k * 0.6, a + 1.1 - k * 0.6);
      g.stroke();
    }
  }
}
