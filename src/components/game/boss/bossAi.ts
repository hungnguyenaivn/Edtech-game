import { rectCircleHit, circleHit } from "./hitbox";

/**
 * Các đòn tấn công của boss. Mỗi đòn có thời gian báo trước `warn` (vô hại khi t < warn) và luôn chừa vùng an toàn:
 *  - "Bug rơi": vài vòng tròn rơi xuống (một vòng nhắm vào chỗ em đang đứng) — phủ một phần nhỏ đấu trường.
 *  - "Tia quét": tia laser ngang quét từ trên xuống, luôn có một khe hở rộng GAP_W.
 *  - "Vòng lặp vô hạn": vòng đạn toả ra từ boss, luôn thiếu RING_GAP viên liền nhau.
 */

export type Hazard =
  | { kind: "drop"; x: number; y: number; r: number; t: number; warn: number }
  | { kind: "beam"; y: number; speed: number; gapX: number; gapW: number; h: number; t: number; warn: number }
  | { kind: "bullet"; x: number; y: number; vx: number; vy: number; r: number; t: number; warn: number };

export const DROP_R = 14;
export const DROP_HIT = 0.18; // giây vòng rơi gây sát thương
const DROP_LINGER = 0.35;
export const GAP_W = 46;
export const BEAM_H = 10;
export const RING_N = 14;
export const RING_GAP = 3;
const ARENA = 240;
const BOSS_X = 120;
const BOSS_Y = 66;

export type PatternKind = "drop" | "beam" | "ring";

export function pickPattern(rand: () => number, phase: number): PatternKind {
  if (phase <= 1) return "drop";
  const r = rand();
  if (phase === 2) return r < 0.5 ? "drop" : "beam";
  return r < 0.34 ? "drop" : r < 0.67 ? "beam" : "ring";
}

export function spawnPattern(rand: () => number, phase: number, warn: number, speed: number, player: { x: number; y: number }): Hazard[] {
  const kind = pickPattern(rand, phase);
  if (kind === "drop") {
    const n = [3, 4, 5][phase - 1];
    const out: Hazard[] = [];
    for (let i = 0; i < n; i++) {
      const x = i === 0 ? player.x : 20 + rand() * (ARENA - 40);
      const y = i === 0 ? player.y : 100 + rand() * 120;
      out.push({ kind: "drop", x: clamp(x, 16, ARENA - 16), y: clamp(y, 40, ARENA - 16), r: DROP_R, t: 0, warn: warn + i * 0.12 });
    }
    return out;
  }
  if (kind === "beam") {
    const gapX = 16 + rand() * (ARENA - 32 - GAP_W);
    return [{ kind: "beam", y: 30, speed: 48 * speed, gapX, gapW: GAP_W, h: BEAM_H, t: 0, warn }];
  }
  const start = Math.floor(rand() * RING_N);
  const rot = rand() * Math.PI * 2;
  const out: Hazard[] = [];
  for (let i = 0; i < RING_N; i++) {
    if ((i - start + RING_N) % RING_N < RING_GAP) continue;
    const a = rot + (i / RING_N) * Math.PI * 2;
    out.push({ kind: "bullet", x: BOSS_X, y: BOSS_Y, vx: Math.cos(a) * 55 * speed, vy: Math.sin(a) * 55 * speed, r: 4, t: 0, warn });
  }
  return out;
}

export function stepHazard(h: Hazard, dt: number) {
  h.t += dt;
  if (h.t < h.warn) return;
  if (h.kind === "beam") h.y += h.speed * dt;
  else if (h.kind === "bullet") {
    h.x += h.vx * dt;
    h.y += h.vy * dt;
  }
}

/** Đang gây sát thương được chưa (đã hết thời gian báo trước). */
export function hazardActive(h: Hazard) {
  if (h.t < h.warn) return false;
  return h.kind !== "drop" || h.t < h.warn + DROP_HIT;
}

export function hazardDone(h: Hazard) {
  if (h.kind === "drop") return h.t >= h.warn + DROP_LINGER;
  if (h.kind === "beam") return h.y - h.h > ARENA;
  return h.x < -10 || h.y < -10 || h.x > ARENA + 10 || h.y > ARENA + 10;
}

export function hazardHits(h: Hazard, x: number, y: number, r: number) {
  if (h.kind === "drop") return circleHit(x, y, r, h.x, h.y, h.r);
  if (h.kind === "bullet") return circleHit(x, y, r, h.x, h.y, h.r);
  const y0 = h.y - h.h / 2;
  const y1 = h.y + h.h / 2;
  return rectCircleHit(-20, y0, h.gapX, y1, x, y, r) || rectCircleHit(h.gapX + h.gapW, y0, ARENA + 20, y1, x, y, r);
}

const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
