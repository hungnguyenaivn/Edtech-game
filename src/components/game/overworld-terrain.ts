import type { Cell } from "./mapgen";
import type { OverworldMap } from "./overworld-gen";
import { type Pt, TH, TW, ZH, mix, shade } from "./overworld-draw";
import * as S from "./sprites";
import { makeCanvas } from "./sprites";

/** Màu mặt trên + hai vách của từng ô, tính sẵn một lần. */
export type TerrainColors = { top: string[][]; sideL: string[][]; sideR: string[][]; lip: (string | null)[][] };

/** Những gì hàm vẽ địa hình cần biết về engine. */
export type TerrainEnv = TerrainColors & {
  g: CanvasRenderingContext2D;
  map: OverworldMap;
  /** Độ cao hiển thị (tường viền cộng thêm WALL_EXTRA). */
  dh: number[][];
  time: number;
  spriteCache: Map<string, HTMLCanvasElement>;
};

export const WALL_EXTRA = 2; // tường viền cao hơn nền 2 bậc

/** Tính sẵn màu mặt trên + hai vách của từng ô theo loại đất và độ cao. */
export function paintTerrain(map: OverworldMap): TerrainColors {
  const th = map.theme;
  const rowsTop: string[][] = [];
  const rowsL: string[][] = [];
  const rowsR: string[][] = [];
  const rowsLip: (string | null)[][] = [];
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
    rowsTop.push(top);
    rowsL.push(sl);
    rowsR.push(sr);
    rowsLip.push(lip);
  }
  return { top: rowsTop, sideL: rowsL, sideR: rowsR, lip: rowsLip };
}

export function drawTile(env: TerrainEnv, x: number, y: number, sx: number, sy: number, frame: number) {
  const g = env.g;
  const cell = env.map.cells[y][x];
  const h = env.dh[y][x];
  const water = cell.ground === "water";
  const yy = water ? sy + 2 : sy;

  if (!water) {
    const dl = h - (env.dh[y + 1]?.[x] ?? -2);
    const dr = h - (env.dh[y]?.[x + 1] ?? -2);
    if (dl > 0) face(env, sx - TW / 2, yy + TH / 2, sx, yy + TH, dl * ZH, env.sideL[y][x], env.lip[y][x]);
    if (dr > 0) face(env, sx, yy + TH, sx + TW / 2, yy + TH / 2, dr * ZH, env.sideR[y][x], env.lip[y][x] && shade(env.lip[y][x]!, -22));
  }

  g.fillStyle = env.top[y][x];
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
  const th = env.map.theme;
  switch (cell.ground) {
    case "water": {
      g.strokeStyle = "rgba(255,255,255,0.45)";
      g.lineWidth = 1;
      const ph = Math.sin(env.time * 2 + hash) * 3;
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
        g.globalAlpha = 0.45 + 0.35 * Math.sin(env.time * 3 + x + y);
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
        g.fillStyle = shade(env.top[y][x], -22);
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

  if (cell.obj) drawObj(env, cell, x, y, sx, yy, frame);
}

/** Vách đứng của một ô (bên trái hoặc bên phải), sâu `d` điểm ảnh, kẻ vạch mỗi bậc cho giống bậc đá. */
export function face(env: TerrainEnv, x0: number, y0: number, x1: number, y1: number, d: number, color: string, lip: string | null) {
  const g = env.g;
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
export function objSprite(env: TerrainEnv, cell: Cell, x: number, y: number, frame: number): { img: HTMLCanvasElement; scale: number } {
  const th = env.map.theme;
  let key: string = cell.obj!;
  switch (cell.obj) {
    case "tree": key += (x + y) % 3 === 0 ? ":a" : ":b"; break;
    case "bush": key += (x * 7 + y) % 3 === 0 ? ":berry" : ":plain"; break;
    case "server": key += `:${(frame + x + y) % 2}`; break;
    case "desk": key += `:${frame % 2}`; break;
    case "sign": key += `:${cell.label ?? "ABC"}`; break;
  }
  let img = env.spriteCache.get(key);
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
    env.spriteCache.set(key, img);
  }
  return { img, scale };
}

export function drawObj(env: TerrainEnv, cell: Cell, x: number, y: number, sx: number, sy: number, frame: number) {
  const { img, scale } = objSprite(env, cell, x, y, frame);
  const ax = sx;
  const ay = sy + TH / 2 + 3;
  env.g.drawImage(img, Math.round(ax - 16 * scale), Math.round(ay - 26 * scale), 32 * scale, 32 * scale);
}
