import * as S from "./sprites";
import { T, hashString, makeCanvas, rng } from "./sprites";

export const MAP_W = 44;
export const MAP_H = 28;

type Ground = "A" | "B" | "path" | "water" | "sand" | "wall";
type Obj = "tree" | "palm" | "bush" | "rock" | "crate" | "server" | "desk" | "plant" | "sign" | null;
type Decor = "flowers" | "cable" | "vent" | null;

export type Cell = { ground: Ground; obj: Obj; decor: Decor; label?: string };

export type GameMap = {
  w: number;
  h: number;
  cells: Cell[][];
  spawn: { x: number; y: number };
  reachable: boolean[][];
  theme: Theme;
};

export type Theme = {
  slug: string;
  bg: string;
  groundA: string;
  groundB: string;
  path: string;
  pathGlow?: string;
  water: string;
  sand: string;
  wall: string;
  border: Obj | "wall";
  obstacles: { kind: Exclude<Obj, null>; w: number }[];
  decor: Exclude<Decor, null>[];
  leaf: string;
  metal: boolean;
  npc: "robot" | "scientist" | "sailor";
};

export const THEMES: Record<string, Theme> = {
  "ai-cong-nghe": {
    slug: "ai-cong-nghe",
    bg: "#11152f",
    groundA: "#3d4775",
    groundB: "#37406b",
    path: "#2a3260",
    pathGlow: "#3dd6ff",
    water: "#2b5fb8",
    sand: "#4a4f80",
    wall: "#5a5fa0",
    border: "wall",
    obstacles: [
      { kind: "server", w: 4 },
      { kind: "desk", w: 3 },
      { kind: "crate", w: 1 },
      { kind: "plant", w: 1 },
    ],
    decor: ["cable", "vent"],
    leaf: "#3fa34d",
    metal: true,
    npc: "robot",
  },
  "toan-ly-hoa": {
    slug: "toan-ly-hoa",
    bg: "#1a3b2a",
    groundA: "#63b95a",
    groundB: "#5aae52",
    path: "#d2ad73",
    water: "#3f8fd8",
    sand: "#e2c98e",
    wall: "#7a6a58",
    border: "tree",
    obstacles: [
      { kind: "tree", w: 4 },
      { kind: "bush", w: 3 },
      { kind: "rock", w: 2 },
      { kind: "crate", w: 1 },
    ],
    decor: ["flowers"],
    leaf: "#2f8f46",
    metal: false,
    npc: "scientist",
  },
  "tieng-anh": {
    slug: "tieng-anh",
    bg: "#1b4a6b",
    groundA: "#7cc66a",
    groundB: "#74bb62",
    path: "#e6cf95",
    water: "#3aa0e0",
    sand: "#ecd79f",
    wall: "#8a6a4a",
    border: "palm",
    obstacles: [
      { kind: "palm", w: 3 },
      { kind: "bush", w: 2 },
      { kind: "rock", w: 2 },
      { kind: "crate", w: 1 },
      { kind: "sign", w: 2 },
    ],
    decor: ["flowers"],
    leaf: "#2f9e44",
    metal: false,
    npc: "sailor",
  },
};

export function isSolid(c: Cell): boolean {
  return c.ground === "water" || c.ground === "wall" || c.obj !== null;
}

function pickWeighted<T extends { w: number }>(items: T[], r: () => number): T {
  const total = items.reduce((s, i) => s + i.w, 0);
  let x = r() * total;
  for (const it of items) {
    x -= it.w;
    if (x <= 0) return it;
  }
  return items[items.length - 1];
}

/** Sinh bản đồ cố định cho mỗi thế giới (cùng thế giới → cùng bản đồ). */
export function generateMap(slug: string): GameMap {
  const theme = THEMES[slug] ?? THEMES["toan-ly-hoa"];
  const r = rng(hashString(slug));
  const W = MAP_W;
  const H = MAP_H;
  const spawn = { x: Math.floor(W / 2), y: Math.floor(H / 2) };
  const cells: Cell[][] = Array.from({ length: H }, () => Array.from({ length: W }, () => ({ ground: "A" as Ground, obj: null, decor: null })));
  const inside = (x: number, y: number) => x > 0 && y > 0 && x < W - 1 && y < H - 1;
  const dSpawn = (x: number, y: number) => Math.abs(x - spawn.x) + Math.abs(y - spawn.y);

  // Mảng nền B cho đỡ đơn điệu
  for (let i = 0; i < 18; i++) {
    const cx = Math.floor(r() * W);
    const cy = Math.floor(r() * H);
    const rad = 1.5 + r() * 3;
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if ((x - cx) ** 2 + (y - cy) ** 2 < rad * rad) cells[y][x].ground = "B";
  }

  // Nước
  if (slug === "tieng-anh") {
    for (let x = 0; x < W; x++) {
      const shore = H - 5 - Math.round(Math.sin(x / 4) * 1.2 + (r() < 0.3 ? 1 : 0));
      for (let y = shore; y < H; y++) cells[y][x].ground = "water";
      for (let y = shore - 2; y < shore; y++) if (y > 0) cells[y][x].ground = "sand";
    }
  } else if (slug === "toan-ly-hoa") {
    const ponds = [
      { x: 9, y: 7, rx: 4, ry: 2.6 },
      { x: 34, y: 20, rx: 4.5, ry: 2.8 },
    ];
    for (const p of ponds)
      for (let y = 0; y < H; y++)
        for (let x = 0; x < W; x++) {
          const v = ((x - p.x) / p.rx) ** 2 + ((y - p.y) / p.ry) ** 2;
          if (v < 1) cells[y][x].ground = "water";
          else if (v < 1.7 && cells[y][x].ground !== "water") cells[y][x].ground = "sand";
        }
  }

  // Đường đi: chữ thập qua điểm xuất phát + một vòng chữ nhật
  const setPath = (x: number, y: number) => {
    if (inside(x, y) && cells[y][x].ground !== "water") cells[y][x].ground = "path";
  };
  for (let x = 2; x < W - 2; x++) setPath(x, spawn.y);
  for (let y = 2; y < H - 2; y++) setPath(spawn.x, y);
  const inset = { x: 6, y: 5 };
  for (let x = inset.x; x <= W - 1 - inset.x; x++) {
    setPath(x, inset.y);
    setPath(x, H - 1 - inset.y);
  }
  for (let y = inset.y; y <= H - 1 - inset.y; y++) {
    setPath(inset.x, y);
    setPath(W - 1 - inset.x, y);
  }

  // Viền bản đồ
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++)
      if (!inside(x, y)) {
        if (theme.border === "wall") cells[y][x].ground = "wall";
        else if (cells[y][x].ground !== "water") cells[y][x].obj = theme.border as Obj;
      }

  // Tường ngăn trong phòng lab
  if (theme.metal) {
    for (let i = 0; i < 7; i++) {
      const horiz = r() < 0.5;
      const len = 3 + Math.floor(r() * 4);
      const x0 = 2 + Math.floor(r() * (W - 4));
      const y0 = 2 + Math.floor(r() * (H - 4));
      for (let k = 0; k < len; k++) {
        const x = horiz ? x0 + k : x0;
        const y = horiz ? y0 : y0 + k;
        if (inside(x, y) && cells[y][x].ground !== "path" && dSpawn(x, y) > 4) cells[y][x].ground = "wall";
      }
    }
  }

  // Cụm vật cản
  const signLabels = ["ABC", "HI!", "A-Z", "OK", "WOW", "YES"];
  for (let i = 0; i < 34; i++) {
    let x = 2 + Math.floor(r() * (W - 4));
    let y = 2 + Math.floor(r() * (H - 4));
    const kind = pickWeighted(theme.obstacles, r).kind;
    const size = kind === "sign" ? 1 : 1 + Math.floor(r() * 4);
    for (let k = 0; k < size; k++) {
      const c = cells[y]?.[x];
      if (c && inside(x, y) && c.ground !== "path" && c.ground !== "water" && c.ground !== "wall" && dSpawn(x, y) > 3) {
        c.obj = kind;
        if (kind === "sign") c.label = signLabels[Math.floor(r() * signLabels.length)];
      }
      if (r() < 0.5) x += r() < 0.5 ? 1 : -1;
      else y += r() < 0.5 ? 1 : -1;
    }
  }

  // Trang trí (đi xuyên qua được)
  for (let y = 1; y < H - 1; y++)
    for (let x = 1; x < W - 1; x++) {
      const c = cells[y][x];
      if (!isSolid(c) && c.ground !== "path" && c.ground !== "sand" && r() < 0.07) c.decor = theme.decor[Math.floor(r() * theme.decor.length)];
    }

  // Ô đi tới được từ điểm xuất phát
  const reachable = Array.from({ length: H }, () => Array(W).fill(false) as boolean[]);
  const q: [number, number][] = [[spawn.x, spawn.y]];
  reachable[spawn.y][spawn.x] = true;
  while (q.length) {
    const [x, y] = q.shift()!;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = x + dx;
      const ny = y + dy;
      if (nx < 0 || ny < 0 || nx >= W || ny >= H || reachable[ny][nx] || isSolid(cells[ny][nx])) continue;
      reachable[ny][nx] = true;
      q.push([nx, ny]);
    }
  }

  return { w: W, h: H, cells, spawn, reachable, theme };
}

/**
 * Chọn vị trí cho các nhân vật hỏi bài: rải đều khắp bản đồ, ở chỗ thoáng
 * (8 ô xung quanh đều đi được → đặt vật cản ở đó không chặn đường).
 */
export function placeNpcs(map: GameMap, count: number, seed: string): { x: number; y: number }[] {
  const r = rng(hashString(seed));
  const cand: { x: number; y: number }[] = [];
  for (let y = 2; y < map.h - 2; y++)
    for (let x = 2; x < map.w - 2; x++) {
      if (!map.reachable[y][x]) continue;
      if (Math.abs(x - map.spawn.x) + Math.abs(y - map.spawn.y) < 5) continue;
      let open = true;
      for (let dy = -1; dy <= 1 && open; dy++)
        for (let dx = -1; dx <= 1; dx++) if (!map.reachable[y + dy][x + dx]) open = false;
      if (open) cand.push({ x, y });
    }
  const chosen: { x: number; y: number }[] = [];
  const anchors = [map.spawn];
  while (chosen.length < count && cand.length) {
    const scored = cand
      .map((c, i) => ({
        i,
        d: Math.min(...[...anchors, ...chosen].map((p) => Math.hypot(p.x - c.x, p.y - c.y))) + r() * 3,
      }))
      .sort((a, b) => b.d - a.d);
    const pool = chosen.length === 0 ? Math.min(40, scored.length) : Math.min(4, scored.length);
    const pick = scored[Math.floor(r() * pool)];
    chosen.push(cand[pick.i]);
    cand.splice(pick.i, 1);
  }
  return chosen;
}

/** Vẽ sẵn bản đồ ra canvas (2 khung để nước / đèn server nhấp nháy). */
export function renderMap(map: GameMap, frame: number): HTMLCanvasElement {
  const { theme } = map;
  const c = makeCanvas(map.w * T, map.h * T);
  const g = c.getContext("2d")!;
  const r = rng(hashString(theme.slug + ":tiles"));
  const rw = rng(hashString(theme.slug + ":water" + frame));
  for (let y = 0; y < map.h; y++)
    for (let x = 0; x < map.w; x++) {
      const cell = map.cells[y][x];
      const ox = x * T;
      const oy = y * T;
      switch (cell.ground) {
        case "A":
        case "B": {
          const base = cell.ground === "A" ? theme.groundA : theme.groundB;
          if (theme.metal) S.drawMetalTile(g, ox, oy, base);
          else S.drawNoiseTile(g, ox, oy, base, r, 0.1, true);
          break;
        }
        case "path":
          if (theme.metal) S.drawLaneTile(g, ox, oy, theme.path, theme.pathGlow!, x + y);
          else S.drawNoiseTile(g, ox, oy, theme.path, r, 0.08);
          break;
        case "sand":
          S.drawNoiseTile(g, ox, oy, theme.sand, r, 0.08);
          break;
        case "water":
          S.drawWater(g, ox, oy, theme.water, rw);
          break;
        case "wall":
          S.drawBrick(g, ox, oy, theme.wall);
          break;
      }
      if (cell.decor === "flowers") S.drawFlowers(g, ox, oy, r);
      else if (cell.decor === "cable") S.drawCable(g, ox, oy, r);
      else if (cell.decor === "vent") S.drawVent(g, ox, oy);
    }
  // Vật thể vẽ sau nền
  for (let y = 0; y < map.h; y++)
    for (let x = 0; x < map.w; x++) {
      const cell = map.cells[y][x];
      const ox = x * T;
      const oy = y * T;
      switch (cell.obj) {
        case "tree":
          S.drawTree(g, ox, oy, (x + y) % 3 === 0 ? "#3a9e4f" : theme.leaf);
          break;
        case "palm":
          S.drawPalm(g, ox, oy);
          break;
        case "bush":
          S.drawBush(g, ox, oy, "#3f9d4a", (x * 7 + y) % 3 === 0 ? "#ff5c7a" : undefined);
          break;
        case "rock":
          S.drawRock(g, ox, oy);
          break;
        case "crate":
          S.drawCrate(g, ox, oy);
          break;
        case "server":
          S.drawServer(g, ox, oy, frame + x + y);
          break;
        case "desk":
          S.drawDesk(g, ox, oy, frame % 2 === 0 ? "#3dd6ff" : "#7ff5c8");
          break;
        case "plant":
          S.drawPlantPot(g, ox, oy);
          break;
        case "sign":
          S.drawSign(g, ox, oy, cell.label ?? "ABC");
          break;
      }
    }
  return c;
}
