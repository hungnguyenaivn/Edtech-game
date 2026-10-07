import { STOP_COLORS, type StationInfo, type Stop } from "./overworld-gen";

export type Pt = [number, number];

// Hình chiếu 2.5D (isometric): một ô = hình thoi TW×TH, mỗi bậc cao = ZH điểm ảnh.
export const TW = 32;
export const TH = 16;
export const ZH = 8;

/** Những gì hàm vẽ nhà cần biết về engine. */
export type DrawEnv = {
  g: CanvasRenderingContext2D;
  time: number;
  won: boolean;
  stations: StationInfo[];
  projX: (x: number, y: number) => number;
  projY: (x: number, y: number, z: number) => number;
  stopAnchor: (s: Stop) => Pt;
};

/** Nhà level / kho báu và nhãn tên phía trên. */
export function drawStop(env: DrawEnv, s: Stop, i: number) {
  const g = env.g;
  const x0 = env.projX(s.bx, s.by);
  const y0 = env.projY(s.bx, s.by, s.h);
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
    const bob = Math.sin(env.time * 3) * 2;
    g.fillStyle = "#000";
    g.fillText(env.won ? "🏆" : "🎁", ex, ey + bob);
    if (env.won) {
      g.fillStyle = "#ffe27a";
      g.font = "bold 10px sans-serif";
      for (let k = 0; k < 3; k++) g.fillText("✦", ex - 14 + k * 14, ey - 30 + Math.sin(env.time * 4 + k * 2) * 3);
    }
    return;
  }

  const info = env.stations[i];
  const locked = !info.unlocked;
  const color = STOP_COLORS[i % STOP_COLORS.length];
  const wall = locked ? "#a9adc9" : shade(color, 70);
  const wallR = shade(wall, -34);
  const roof = locked ? "#767a9e" : color;

  if (info.current) {
    const a = 0.35 + Math.sin(env.time * 5) * 0.15;
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

export function drawLabel(env: DrawEnv, s: Stop, i: number) {
  const g = env.g;
  const [ax, ay] = env.stopAnchor(s);
  const apexY = ay - (s.kind === "finish" ? 36 : 46);
  const text = s.kind === "finish" ? (env.won ? "Nhà vô địch!" : "Kho báu") : env.stations[i].title;
  const locked = s.kind === "level" && !env.stations[i].unlocked;
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
    const info = env.stations[i];
    if (info.unlocked) {
      g.font = "10px sans-serif";
      for (let k = 0; k < 3; k++) {
        g.fillStyle = k < info.stars ? "#ffc93c" : "#00000055";
        g.fillText("★", ax - 11 + k * 11, py + 14);
      }
    }
    if (info.current) {
      const bounce = Math.sin(env.time * 6) * 2;
      tri(g, "#1d1b2e", ax - 6, py - 22 + bounce, ax + 6, py - 22 + bounce, ax, py - 13 + bounce);
      tri(g, "#ffb020", ax - 4.5, py - 21 + bounce, ax + 4.5, py - 21 + bounce, ax, py - 15 + bounce);
    }
  }
}

export function tri(g: CanvasRenderingContext2D, fill: string, x1: number, y1: number, x2: number, y2: number, x3: number, y3: number) {
  g.fillStyle = fill;
  g.beginPath();
  g.moveTo(x1, y1);
  g.lineTo(x2, y2);
  g.lineTo(x3, y3);
  g.closePath();
  g.fill();
}

export function roundRect(g: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  g.beginPath();
  g.roundRect(x, y, w, h, r);
  g.fill();
}

export function rgb(c: string): [number, number, number] {
  if (c.startsWith("#")) {
    const n = parseInt(c.slice(1), 16);
    return [n >> 16, (n >> 8) & 255, n & 255];
  }
  const m = c.match(/\d+/g)!.map(Number);
  return [m[0], m[1], m[2]];
}

export function shade(color: string, amt: number) {
  const clamp = (v: number) => Math.max(0, Math.min(255, Math.round(v + amt)));
  const [r, g, b] = rgb(color);
  return `rgb(${clamp(r)},${clamp(g)},${clamp(b)})`;
}

export function mix(a: string, b: string, t: number) {
  const x = rgb(a);
  const y = rgb(b);
  const c = (i: number) => Math.round(x[i] + (y[i] - x[i]) * t);
  return `rgb(${c(0)},${c(1)},${c(2)})`;
}
