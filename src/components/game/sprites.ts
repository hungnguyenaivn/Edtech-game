/**
 * Pixel-art tự vẽ bằng code (không cần asset ngoài). Mỗi ô = 16×16 px, phóng to khi vẽ.
 */
export const T = 16;

export type Canvas = HTMLCanvasElement;

export function makeCanvas(w: number, h: number): Canvas {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  return c;
}

/** Sinh số giả ngẫu nhiên có hạt giống — cùng hạt giống ra cùng bản đồ. */
export function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
export function hashString(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
}

/** Vẽ sprite từ lưới ký tự. "." = trong suốt. */
export function fromAscii(rows: string[], pal: Record<string, string>, flip = false): Canvas {
  const h = rows.length;
  const w = rows[0].length;
  const c = makeCanvas(w, h);
  const g = c.getContext("2d")!;
  rows.forEach((row, y) => {
    for (let x = 0; x < w; x++) {
      const ch = row[x];
      if (ch === "." || ch === " " || !pal[ch]) continue;
      g.fillStyle = pal[ch];
      g.fillRect(flip ? w - 1 - x : x, y, 1, 1);
    }
  });
  return c;
}

// ---------------------------------------------------------------- Nhân vật

const HEAD_DOWN = [
  "................",
  ".....kkkkkk.....",
  "....khhhhhhk....",
  "...khhhhhhhhk...",
  "...khhhhhhhhk...",
  "...khsssssshk...",
  "...ksessssesk...",
  "...kssssssssk...",
  "...ksssmmsssk...",
  "....kssssssk....",
];
const HEAD_UP = [
  "................",
  ".....kkkkkk.....",
  "....khhhhhhk....",
  "...khhhhhhhhk...",
  "...khhhhhhhhk...",
  "...khhhhhhhhk...",
  "...khhhhhhhhk...",
  "...khhhhhhhhk...",
  "...khhhhhhhhk...",
  "....kssssssk....",
];
const HEAD_SIDE = [
  "................",
  ".....kkkkkk.....",
  "....khhhhhhk....",
  "...khhhhhhhhk...",
  "...khhhhhhhhk...",
  "...khhhhhsssk...",
  "...khhhhssesk...",
  "...khhsssssskk..",
  "...khssssmssk...",
  "....kssssssk....",
];
const BODY_FRONT = [
  "...kcccccccck...",
  "..kcccccccccck..",
  "..ksccccccccsk..",
  "...kppppppppk...",
];
const BODY_SIDE = [
  "....kccccccck...",
  "....kcccsccck...",
  "....kcccsccck...",
  "....kpppppppk...",
];
const LEGS_FRONT = [
  ["...kppk..kppk...", "...kbbk..kbbk..."],
  ["...kbbk..kppk...", ".........kbbk..."],
  ["...kppk..kbbk...", "...kbbk........."],
];
const LEGS_SIDE = [
  ["....kppkkppk....", "....kbbkkbbk...."],
  ["...kppk..kppk...", "...kbbk..kbbk..."],
  ["....kppkkppk....", "....kbbkkbbk...."],
];

export type Dir = "down" | "up" | "left" | "right";
export type CharSprites = Record<Dir, Canvas[]>; // 3 khung: đứng, bước trái, bước phải

export function buildCharacter(opts: { shirt: string; hair: string; pants?: string; skin?: string }): CharSprites {
  const pal = {
    k: "#1d1b2e",
    h: opts.hair,
    s: opts.skin ?? "#f7c9a0",
    e: "#1d1b2e",
    m: "#d98a72",
    c: opts.shirt,
    p: opts.pants ?? "#34406b",
    b: "#4a2f25",
  };
  const make = (head: string[], body: string[], legs: string[][], flip = false) =>
    legs.map((l) => fromAscii([...head, ...body, ...l], pal, flip));
  return {
    down: make(HEAD_DOWN, BODY_FRONT, LEGS_FRONT),
    up: make(HEAD_UP, BODY_FRONT, LEGS_FRONT),
    right: make(HEAD_SIDE, BODY_SIDE, LEGS_SIDE),
    left: make(HEAD_SIDE, BODY_SIDE, LEGS_SIDE, true),
  };
}

const ROBOT = [
  ".......kk.......",
  "......kyyk......",
  ".......kk.......",
  "...kkkkkkkkkk...",
  "..kmmmmmmmmmmk..",
  "..kmddddddddmk..",
  "..kmdggddggdmk..",
  "..kmdggddggdmk..",
  "..kmddddddddmk..",
  "..kmmmmmmmmmmk..",
  "...kkkkkkkkkk...",
  ".kkmmmmmmmmmmkk.",
  "km.kmmmccmmmk.mk",
  "k..kmmmmmmmmk..k",
  "...kmmmmmmmmk...",
  "...kkk....kkk...",
];

export function buildRobot(body: string, light: string): Canvas {
  return fromAscii(ROBOT, { k: "#1d1b2e", y: light, m: body, d: "#20264a", g: "#7ff5ff", c: light });
}

// ---------------------------------------------------------------- Ô nền (vẽ thủ tục)

function shade(hex: string, amt: number): string {
  const n = parseInt(hex.slice(1), 16);
  const r = Math.max(0, Math.min(255, ((n >> 16) & 255) + amt));
  const g = Math.max(0, Math.min(255, ((n >> 8) & 255) + amt));
  const b = Math.max(0, Math.min(255, (n & 255) + amt));
  return `#${((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1)}`;
}

type Ctx = CanvasRenderingContext2D;
const px = (g: Ctx, x: number, y: number, c: string) => {
  g.fillStyle = c;
  g.fillRect(x, y, 1, 1);
};

/** Nền có hạt lấm tấm (cỏ, cát, đất). */
export function drawNoiseTile(g: Ctx, ox: number, oy: number, base: string, r: () => number, density = 0.12, blades = false) {
  g.fillStyle = base;
  g.fillRect(ox, oy, T, T);
  for (let i = 0; i < T * T * density; i++) {
    const x = Math.floor(r() * T);
    const y = Math.floor(r() * T);
    const c = r() < 0.5 ? shade(base, -18) : shade(base, 14);
    px(g, ox + x, oy + y, c);
    if (blades && y > 0 && r() < 0.5) px(g, ox + x, oy + y - 1, shade(base, -10));
  }
}

export function drawMetalTile(g: Ctx, ox: number, oy: number, base: string) {
  g.fillStyle = base;
  g.fillRect(ox, oy, T, T);
  g.fillStyle = shade(base, 16);
  g.fillRect(ox, oy, T, 1);
  g.fillRect(ox, oy, 1, T);
  g.fillStyle = shade(base, -16);
  g.fillRect(ox, oy + T - 1, T, 1);
  g.fillRect(ox + T - 1, oy, 1, T);
  px(g, ox + 2, oy + 2, shade(base, -24));
  px(g, ox + 13, oy + 2, shade(base, -24));
  px(g, ox + 2, oy + 13, shade(base, -24));
  px(g, ox + 13, oy + 13, shade(base, -24));
}

export function drawLaneTile(g: Ctx, ox: number, oy: number, base: string, glow: string, t: number) {
  g.fillStyle = base;
  g.fillRect(ox, oy, T, T);
  g.fillStyle = shade(base, 10);
  g.fillRect(ox + 1, oy + 1, T - 2, T - 2);
  if (t % 2 === 0) {
    px(g, ox + 7, oy + 7, glow);
    px(g, ox + 8, oy + 8, glow);
    px(g, ox + 8, oy + 7, glow);
    px(g, ox + 7, oy + 8, glow);
  }
}

export function drawWater(g: Ctx, ox: number, oy: number, base: string, r: () => number) {
  g.fillStyle = base;
  g.fillRect(ox, oy, T, T);
  for (let i = 0; i < 3; i++) {
    const x = Math.floor(r() * 11);
    const y = Math.floor(r() * 14) + 1;
    g.fillStyle = shade(base, 40);
    g.fillRect(ox + x, oy + y, 4, 1);
  }
}

export function drawBrick(g: Ctx, ox: number, oy: number, base: string) {
  g.fillStyle = shade(base, -30);
  g.fillRect(ox, oy, T, T);
  g.fillStyle = base;
  for (let row = 0; row < 4; row++) {
    const off = row % 2 ? 4 : 0;
    for (let col = -1; col < 3; col++) {
      const x = col * 8 + off + 1;
      const x0 = Math.max(0, x);
      const x1 = Math.min(T, x + 7);
      if (x1 > x0) g.fillRect(ox + x0, oy + row * 4 + 1, x1 - x0, 3);
    }
  }
  g.fillStyle = shade(base, 22);
  g.fillRect(ox, oy, T, 1);
}

/** Khối tròn có bóng (tán cây, bụi, đá). */
export function drawBlob(g: Ctx, ox: number, oy: number, cx: number, cy: number, rad: number, base: string, outline = "#1d1b2e") {
  for (let y = 0; y < T; y++)
    for (let x = 0; x < T; x++) {
      const dx = x + 0.5 - cx;
      const dy = y + 0.5 - cy;
      const d = Math.sqrt(dx * dx + dy * dy);
      if (d > rad + 0.6) continue;
      let c: string;
      if (d > rad - 0.6) c = outline;
      else {
        const light = (-dx - dy) / rad; // sáng phía trên trái
        c = light > 0.55 ? shade(base, 34) : light > 0 ? shade(base, 12) : light < -0.7 ? shade(base, -34) : shade(base, -12);
      }
      px(g, ox + x, oy + y, c);
    }
}

export function drawTree(g: Ctx, ox: number, oy: number, leaf: string, trunk = "#6b4226") {
  // bóng dưới gốc
  g.fillStyle = "#00000033";
  g.fillRect(ox + 3, oy + 14, 10, 2);
  g.fillStyle = "#1d1b2e";
  g.fillRect(ox + 6, oy + 10, 4, 5);
  g.fillStyle = trunk;
  g.fillRect(ox + 7, oy + 10, 2, 4);
  drawBlob(g, ox, oy, 8, 6.5, 6.6, leaf);
}

export function drawPalm(g: Ctx, ox: number, oy: number) {
  g.fillStyle = "#00000033";
  g.fillRect(ox + 4, oy + 14, 8, 2);
  const trunk = ["#8b5a2b", "#a8743d"];
  for (let y = 6; y < 15; y++) {
    g.fillStyle = "#1d1b2e";
    g.fillRect(ox + 6 + (y < 10 ? 1 : 0), oy + y, 4, 1);
    g.fillStyle = trunk[y % 2];
    g.fillRect(ox + 7 + (y < 10 ? 1 : 0), oy + y, 2, 1);
  }
  const leaf = "#2f9e44";
  const fronds: [number, number][] = [[-6, 2], [-5, -1], [-2, -3], [2, -3], [5, -1], [6, 2], [0, -4]];
  for (const [dx, dy] of fronds) {
    const steps = 6;
    for (let i = 0; i <= steps; i++) {
      const x = Math.round(8 + (dx * i) / steps);
      const y = Math.round(5 + (dy * i) / steps + (i * i) / 14);
      px(g, ox + x, oy + y, i % 2 ? leaf : shade(leaf, 20));
      px(g, ox + x, oy + y + 1, shade(leaf, -30));
    }
  }
  px(g, ox + 7, oy + 5, "#6b4226");
  px(g, ox + 9, oy + 5, "#6b4226");
}

export function drawRock(g: Ctx, ox: number, oy: number, base = "#8d93a8") {
  g.fillStyle = "#00000033";
  g.fillRect(ox + 3, oy + 13, 11, 2);
  drawBlob(g, ox, oy, 8.5, 9, 5.8, base);
}

export function drawBush(g: Ctx, ox: number, oy: number, leaf: string, berry?: string) {
  g.fillStyle = "#00000033";
  g.fillRect(ox + 2, oy + 13, 12, 2);
  drawBlob(g, ox, oy, 8, 9, 6.2, leaf);
  if (berry) {
    px(g, ox + 5, oy + 7, berry);
    px(g, ox + 10, oy + 9, berry);
    px(g, ox + 7, oy + 11, berry);
  }
}

export function drawFlowers(g: Ctx, ox: number, oy: number, r: () => number) {
  const colors = ["#ff6b8a", "#ffd23f", "#ffffff", "#b38cff"];
  for (let i = 0; i < 3; i++) {
    const x = 2 + Math.floor(r() * 11);
    const y = 2 + Math.floor(r() * 11);
    const c = colors[Math.floor(r() * colors.length)];
    px(g, ox + x, oy + y - 1, c);
    px(g, ox + x - 1, oy + y, c);
    px(g, ox + x + 1, oy + y, c);
    px(g, ox + x, oy + y + 1, c);
    px(g, ox + x, oy + y, "#ffb000");
  }
}

export function drawCrate(g: Ctx, ox: number, oy: number) {
  g.fillStyle = "#00000033";
  g.fillRect(ox + 2, oy + 14, 13, 2);
  g.fillStyle = "#1d1b2e";
  g.fillRect(ox + 2, oy + 2, 12, 12);
  g.fillStyle = "#b7793f";
  g.fillRect(ox + 3, oy + 3, 10, 10);
  g.fillStyle = "#8a5526";
  g.fillRect(ox + 3, oy + 7, 10, 2);
  for (let i = 0; i < 8; i++) px(g, ox + 4 + i, oy + 4 + i, "#8a5526");
  g.fillStyle = "#d39a5c";
  g.fillRect(ox + 3, oy + 3, 10, 1);
}

export function drawServer(g: Ctx, ox: number, oy: number, t: number) {
  g.fillStyle = "#00000044";
  g.fillRect(ox + 2, oy + 14, 13, 2);
  g.fillStyle = "#1d1b2e";
  g.fillRect(ox + 2, oy + 0, 12, 15);
  g.fillStyle = "#3a4270";
  g.fillRect(ox + 3, oy + 1, 10, 13);
  const leds = ["#3dff9a", "#ffd23f", "#3dd6ff", "#ff5c7a"];
  for (let row = 0; row < 4; row++) {
    g.fillStyle = "#252b50";
    g.fillRect(ox + 4, oy + 2 + row * 3, 8, 2);
    px(g, ox + 5, oy + 2 + row * 3, leds[(row + t) % 4]);
    if ((row + t) % 3 !== 0) px(g, ox + 7, oy + 2 + row * 3, "#3dff9a");
  }
}

export function drawDesk(g: Ctx, ox: number, oy: number, screen: string) {
  g.fillStyle = "#00000033";
  g.fillRect(ox + 1, oy + 14, 14, 2);
  g.fillStyle = "#1d1b2e";
  g.fillRect(ox + 1, oy + 8, 14, 5);
  g.fillStyle = "#c98b52";
  g.fillRect(ox + 2, oy + 9, 12, 3);
  g.fillStyle = "#1d1b2e";
  g.fillRect(ox + 2, oy + 13, 2, 2);
  g.fillRect(ox + 12, oy + 13, 2, 2);
  // màn hình
  g.fillRect(ox + 4, oy + 1, 8, 7);
  g.fillStyle = screen;
  g.fillRect(ox + 5, oy + 2, 6, 4);
  g.fillStyle = "#ffffffaa";
  g.fillRect(ox + 5, oy + 2, 2, 1);
  g.fillStyle = "#1d1b2e";
  g.fillRect(ox + 7, oy + 7, 2, 2);
}

export function drawPlantPot(g: Ctx, ox: number, oy: number) {
  g.fillStyle = "#00000033";
  g.fillRect(ox + 4, oy + 14, 8, 2);
  g.fillStyle = "#1d1b2e";
  g.fillRect(ox + 5, oy + 10, 6, 5);
  g.fillStyle = "#d9734e";
  g.fillRect(ox + 6, oy + 10, 4, 4);
  drawBlob(g, ox, oy, 8, 6, 4.6, "#3fa34d");
}

export function drawSign(g: Ctx, ox: number, oy: number, label: string) {
  g.fillStyle = "#1d1b2e";
  g.fillRect(ox + 7, oy + 8, 2, 7);
  g.fillRect(ox + 2, oy + 2, 12, 7);
  g.fillStyle = "#e0b27a";
  g.fillRect(ox + 3, oy + 3, 10, 5);
  g.fillStyle = "#6b4226";
  g.font = "bold 5px monospace";
  g.textAlign = "center";
  g.textBaseline = "middle";
  g.fillText(label, ox + 8, oy + 5.8);
}

export function drawCable(g: Ctx, ox: number, oy: number, r: () => number) {
  const c = r() < 0.5 ? "#3dd6ff" : "#ffcf5a";
  const y = 4 + Math.floor(r() * 8);
  for (let x = 0; x < T; x++) px(g, ox + x, oy + y + Math.round(Math.sin(x / 2.5)), c);
}

export function drawVent(g: Ctx, ox: number, oy: number) {
  g.fillStyle = "#1f2440";
  g.fillRect(ox + 3, oy + 3, 10, 10);
  g.fillStyle = "#56608f";
  for (let i = 0; i < 4; i++) g.fillRect(ox + 4, oy + 4 + i * 2 + 1, 8, 1);
}
