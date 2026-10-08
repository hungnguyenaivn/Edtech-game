import { passMark } from "@/lib/rules";
import { rng } from "../sprites";
import { type Hazard, hazardActive, hazardDone, hazardHits, spawnPattern, stepHazard } from "./bossAi";
import { arcHit, circleHit } from "./hitbox";

/**
 * Trận đánh boss "Tường lửa 10 lõi" — logic thuần (không đụng DOM), chạy theo bước thời gian cố định nên
 * cùng hạt giống + cùng thao tác luôn ra cùng kết quả.
 *
 * Câu hỏi là nguồn sát thương duy nhất: đánh trúng boss khi nó hở 3 lần (hoặc chờ 20 giây) thì rơi "Mảnh mã";
 * nhặt mảnh mã thì trả lời một câu — đúng thì vỡ một lõi. Kỹ năng đánh chỉ quyết định nhịp độ, không quyết định điểm.
 */

export const ARENA = 240;
export const TICK = 1 / 60;

export const PLAYER = {
  r: 5,
  speed: 80, // px / giây
  maxHp: 5,
  iframes: 1.2,
  attackCd: 0.3,
  attackShow: 0.14,
  /** bấm đánh sớm hơn lúc hết hồi chiêu chừng này giây vẫn được tính (cho tay bé chưa canh nhịp) */
  attackBuffer: 0.15,
  reach: 20,
  dashTime: 0.25,
  dashSpeed: 210,
  dashCd: 0.8,
  respawn: 2,
};
export const BOSS = { x: 120, y: 66, r: 22, hitsPerChip: 3, stun: 2, exposed: 1.8, idle: 0.8, autoChip: 20 };
/** Vùng người chơi đi lại được. */
export const BOUNDS = { x0: 12, x1: 228, y0: 24, y1: 228 };
export const SPAWN = { x: 120, y: 196 };

export type CoreState = "intact" | "ok" | "patched";
export type BossMode = "idle" | "telegraph" | "attack" | "exposed" | "stunned" | "done";
export type Input = { mx: number; my: number; attack: boolean; dash: boolean };
export type CombatEvent = "chip-drop" | "chip" | "hit" | "blocked" | "hurt" | "down" | "respawn" | "telegraph";

export type Combat = {
  tick: number;
  seed: number;
  rand: () => number;
  total: number;
  cores: CoreState[];
  answered: number;
  phase: 1 | 2 | 3;
  /** số lần gục → nấc hỗ trợ (0..2): báo trước lâu hơn, đạn chậm hơn */
  assist: number;
  invincible: boolean;
  player: {
    x: number;
    y: number;
    hp: number;
    iframes: number;
    faceX: number;
    faceY: number;
    attackT: number;
    attackCd: number;
    attackBuf: number;
    dashT: number;
    dashCd: number;
    dashX: number;
    dashY: number;
    downT: number;
    moving: boolean;
  };
  boss: { mode: BossMode; t: number; dur: number; hits: number; flash: number };
  hazards: Hazard[];
  chip: { x: number; y: number } | null;
  sinceChip: number;
  /** đã nhặt mảnh mã, đang chờ trả lời câu hỏi */
  waiting: boolean;
  events: CombatEvent[];
};

export function createCombat(seed: number, total: number): Combat {
  return {
    tick: 0,
    seed,
    rand: rng(seed),
    total,
    cores: Array.from({ length: total }, () => "intact" as CoreState),
    answered: 0,
    phase: 1,
    assist: 0,
    invincible: false,
    player: { ...SPAWN, hp: PLAYER.maxHp, iframes: 0, faceX: 0, faceY: -1, attackT: 0, attackCd: 0, attackBuf: 0, dashT: 0, dashCd: 0, dashX: 0, dashY: 0, downT: 0, moving: false },
    boss: { mode: "idle", t: 0, dur: 1.5, hits: 0, flash: 0 },
    hazards: [],
    chip: null,
    sinceChip: 0,
    waiting: false,
    events: [],
  };
}

export const phaseFor = (answered: number): 1 | 2 | 3 => (answered >= 7 ? 3 : answered >= 4 ? 2 : 1);
/** thời gian báo trước đòn (giây) theo pha và nấc hỗ trợ */
export const telegraphTime = (phase: number, assist: number) => [0.9, 0.75, 0.6][phase - 1] * (1 + 0.3 * assist);
/** hệ số tốc độ đạn theo nấc hỗ trợ */
export const speedFactor = (assist: number) => 1 - 0.2 * assist;

/** Một bước thời gian cố định. Không làm gì khi đang chờ trả lời câu hỏi hoặc đã xong trận. */
export function step(s: Combat, input: Input, dt = TICK) {
  s.events = [];
  if (s.waiting || s.boss.mode === "done") return;
  s.tick++;
  stepPlayer(s, input, dt);
  stepBoss(s, dt);
  for (const h of s.hazards) stepHazard(h, dt);
  s.hazards = s.hazards.filter((h) => !hazardDone(h));
  checkDamage(s);
  stepChip(s, dt);
}

function setMode(s: Combat, mode: BossMode, dur: number) {
  s.boss.mode = mode;
  s.boss.t = 0;
  s.boss.dur = dur;
}

function stepPlayer(s: Combat, input: Input, dt: number) {
  const p = s.player;
  p.iframes = Math.max(0, p.iframes - dt);
  p.attackT = Math.max(0, p.attackT - dt);
  p.attackCd = Math.max(0, p.attackCd - dt);
  p.dashCd = Math.max(0, p.dashCd - dt);
  p.attackBuf = Math.max(0, p.attackBuf - dt);
  if (p.downT > 0) {
    p.downT -= dt;
    p.moving = false;
    if (p.downT <= 0) {
      p.downT = 0;
      p.hp = PLAYER.maxHp;
      p.x = SPAWN.x;
      p.y = SPAWN.y;
      p.iframes = PLAYER.iframes;
      s.events.push("respawn");
    }
    return;
  }

  const len = Math.hypot(input.mx, input.my);
  const mx = len > 0 ? input.mx / len : 0;
  const my = len > 0 ? input.my / len : 0;
  p.moving = len > 0;
  if (p.moving && p.dashT <= 0) {
    p.faceX = mx;
    p.faceY = my;
  }
  if (input.dash && p.dashCd <= 0) {
    p.dashT = PLAYER.dashTime;
    p.dashCd = PLAYER.dashCd;
    p.dashX = p.moving ? mx : p.faceX;
    p.dashY = p.moving ? my : p.faceY;
  }
  if (p.dashT > 0) {
    p.dashT = Math.max(0, p.dashT - dt);
    p.x += p.dashX * PLAYER.dashSpeed * dt;
    p.y += p.dashY * PLAYER.dashSpeed * dt;
  } else {
    p.x += mx * PLAYER.speed * dt;
    p.y += my * PLAYER.speed * dt;
  }
  p.x = Math.max(BOUNDS.x0, Math.min(BOUNDS.x1, p.x));
  p.y = Math.max(BOUNDS.y0, Math.min(BOUNDS.y1, p.y));
  // không đi xuyên qua thân boss
  const dx = p.x - BOSS.x;
  const dy = p.y - BOSS.y;
  const d = Math.hypot(dx, dy);
  const minD = BOSS.r + PLAYER.r + 2;
  if (d < minD) {
    const k = d > 0.001 ? minD / d : 1;
    p.x = BOSS.x + (d > 0.001 ? dx * k : 0);
    p.y = BOSS.y + (d > 0.001 ? dy * k : minD);
  }

  if (input.attack) p.attackBuf = PLAYER.attackBuffer;
  if (p.attackBuf > 0 && p.attackCd <= 0) {
    p.attackBuf = 0;
    p.attackT = PLAYER.attackShow;
    p.attackCd = PLAYER.attackCd;
    if (arcHit(p.x, p.y, p.faceX, p.faceY, PLAYER.reach, BOSS.x, BOSS.y, BOSS.r)) hitBoss(s);
  }
}

function hitBoss(s: Combat) {
  const b = s.boss;
  if (b.mode !== "exposed" && b.mode !== "stunned") {
    s.events.push("blocked");
    return;
  }
  b.flash = 0.15;
  s.events.push("hit");
  b.hits++;
  if (b.hits >= BOSS.hitsPerChip) {
    b.hits = 0;
    if (!s.chip) dropChip(s, BOSS.x + (s.rand() - 0.5) * 60, BOSS.y + BOSS.r + 22 + s.rand() * 20);
  }
}

export function dropChip(s: Combat, x: number, y: number) {
  if (s.chip || s.answered >= s.total) return;
  s.chip = { x: Math.max(BOUNDS.x0 + 6, Math.min(BOUNDS.x1 - 6, x)), y: Math.max(BOSS.y + BOSS.r + 14, Math.min(BOUNDS.y1 - 6, y)) };
  s.events.push("chip-drop");
}

function stepBoss(s: Combat, dt: number) {
  const b = s.boss;
  b.t += dt;
  b.flash = Math.max(0, b.flash - dt);
  switch (b.mode) {
    case "idle":
      if (b.t >= b.dur) {
        const warn = telegraphTime(s.phase, s.assist);
        s.hazards.push(...spawnPattern(s.rand, s.phase, warn, speedFactor(s.assist), s.player));
        setMode(s, "telegraph", warn);
        s.events.push("telegraph");
      }
      break;
    case "telegraph":
      if (b.t >= b.dur) setMode(s, "attack", 8);
      break;
    case "attack":
      if (s.hazards.length === 0 || b.t >= b.dur) {
        s.hazards = [];
        setMode(s, "exposed", BOSS.exposed);
      }
      break;
    case "exposed":
    case "stunned":
      if (b.t >= b.dur) {
        b.hits = 0;
        setMode(s, "idle", BOSS.idle);
      }
      break;
  }
}

function checkDamage(s: Combat) {
  const p = s.player;
  if (p.downT > 0 || p.iframes > 0 || p.dashT > 0 || s.invincible) return;
  if (!s.hazards.some((h) => hazardActive(h) && hazardHits(h, p.x, p.y, PLAYER.r))) return;
  p.hp--;
  p.iframes = PLAYER.iframes;
  s.events.push("hurt");
  if (p.hp <= 0) {
    p.downT = PLAYER.respawn;
    s.assist = Math.min(2, s.assist + 1);
    s.events.push("down");
  }
}

function stepChip(s: Combat, dt: number) {
  const p = s.player;
  if (s.chip) {
    if (p.downT <= 0 && circleHit(p.x, p.y, PLAYER.r, s.chip.x, s.chip.y, 6)) {
      s.chip = null;
      s.waiting = true;
      s.events.push("chip");
    }
    return;
  }
  if (s.answered >= s.total) return;
  s.sinceChip += dt;
  if (s.sinceChip >= BOSS.autoChip) {
    // lối thoát cho em chưa quen đánh: mảnh mã tự rơi xuống vùng trống
    dropChip(s, BOUNDS.x0 + 20 + s.rand() * (BOUNDS.x1 - BOUNDS.x0 - 40), 120 + s.rand() * 90);
  }
}

/** Kết quả câu hỏi vừa trả lời: đúng thì vỡ một lõi và boss choáng, sai thì lõi được "vá" (không mất máu). */
export function applyAnswer(s: Combat, correct: boolean) {
  if (!s.waiting || s.answered >= s.total) return;
  s.cores[s.answered] = correct ? "ok" : "patched";
  s.answered++;
  s.waiting = false;
  s.sinceChip = 0;
  s.hazards = [];
  s.boss.hits = 0;
  s.phase = phaseFor(s.answered);
  if (s.answered >= s.total) setMode(s, "done", 0);
  else if (correct) setMode(s, "stunned", BOSS.stun);
  else setMode(s, "idle", BOSS.idle + 0.6);
}

export const brokenCores = (s: Combat) => s.cores.filter((c) => c === "ok").length;
/** Hạ được boss ⇔ đủ số câu đúng để qua level (khớp luật chấm sao ở server). */
export const bossDefeated = (s: Combat) => brokenCores(s) >= passMark(s.total);

/** Ảnh chụp trạng thái để kiểm thử (không chứa hàm). */
export function snapshot(s: Combat) {
  const p = s.player;
  return {
    tick: s.tick,
    seed: s.seed,
    phase: s.phase,
    answered: s.answered,
    assist: s.assist,
    cores: [...s.cores],
    player: { x: round(p.x), y: round(p.y), hp: p.hp, iframes: round(p.iframes), down: p.downT > 0, dashing: p.dashT > 0, attacking: p.attackT > 0 },
    boss: { mode: s.boss.mode, hits: s.boss.hits },
    chip: s.chip ? { x: round(s.chip.x), y: round(s.chip.y) } : null,
    chips: s.chip ? 1 : 0,
    waiting: s.waiting,
    projectiles: s.hazards.length,
    hazards: s.hazards.map((h) => h.kind),
  };
}

const round = (v: number) => Math.round(v * 1000) / 1000;
