import { type Pt, roundRect, shade } from "./overworld-draw";
import { CANOPY_H, type TreeHouse } from "./treehouse";

/** Những gì hàm vẽ nhà cây cần biết về engine. */
export type TreeDrawEnv = {
  g: CanvasRenderingContext2D;
  time: number;
  leaf: string;
  projX: (x: number, y: number) => number;
  projY: (x: number, y: number, z: number) => number;
};

const WOOD = "#b07a45";
const BARK = "#6b4426";
const RAIL_H = 0.9; // bậc
const ROOF_Z = 3.2; // mái cao hơn sàn chừng này bậc
const LABEL = "Đài quan sát";

/**
 * Vẽ cả nhà cây tại đường chéo trước nhất của sàn. Thứ tự: thân → cột → sàn → lan can sau → thang →
 * người chơi (nếu đang ở trên cây) → lan can trước → mái → tán lá.
 */
export function drawTreeHouse(env: TreeDrawEnv, th: TreeHouse, opts: { player: (() => void) | null; canopyAlpha: number }) {
  const P = (x: number, y: number, z: number): Pt => [env.projX(x, y), env.projY(x, y, z)];
  drawShadow(env, th, P);
  drawTrunk(env, th, P);
  drawDeck(env, th, P);
  drawRails(env, th, P, false);
  drawLadder(env, th, P);
  opts.player?.();
  drawRails(env, th, P, true);
  env.g.globalAlpha = opts.player ? opts.canopyAlpha : 1;
  drawRoof(env, th, P);
  env.g.globalAlpha = opts.canopyAlpha;
  drawCanopy(env, th, P);
  env.g.globalAlpha = 1;
}

type Proj = (x: number, y: number, z: number) => Pt;

function poly(g: CanvasRenderingContext2D, fill: string, pts: Pt[], stroke?: string) {
  g.beginPath();
  pts.forEach(([x, y], k) => (k ? g.lineTo(x, y) : g.moveTo(x, y)));
  g.closePath();
  g.fillStyle = fill;
  g.fill();
  if (stroke) {
    g.strokeStyle = stroke;
    g.lineWidth = 1;
    g.stroke();
  }
}

function line(g: CanvasRenderingContext2D, color: string, width: number, a: Pt, b: Pt) {
  g.strokeStyle = color;
  g.lineWidth = width;
  g.beginPath();
  g.moveTo(a[0], a[1]);
  g.lineTo(b[0], b[1]);
  g.stroke();
}

function drawShadow(env: TreeDrawEnv, th: TreeHouse, P: Proj) {
  const [cx, cy] = P(th.x + 1.5, th.y + 1.5, th.g);
  env.g.fillStyle = "rgba(0,0,0,0.22)";
  env.g.beginPath();
  env.g.ellipse(cx, cy + 4, 40, 10, 0, 0, Math.PI * 2);
  env.g.fill();
}

function drawTrunk(env: TreeDrawEnv, th: TreeHouse, P: Proj) {
  const g = env.g;
  const [bx, by] = P(th.x + 1.5, th.y + 1.5, th.g);
  const [, ty] = P(th.x + 1.5, th.y + 1.5, th.z + ROOF_Z);
  g.fillStyle = BARK;
  g.fillRect(bx - 7, ty, 14, by - ty);
  g.fillStyle = shade(BARK, -25);
  g.fillRect(bx + 2, ty, 5, by - ty);
  // rễ
  for (const [dx, dy] of [[-12, 3], [11, 4], [-4, 6], [6, 5]]) line(g, shade(BARK, -10), 3, [bx + dx * 0.3, by - 4], [bx + dx, by + dy]);
  // cột chống ở 3 góc trước/bên
  for (const [x, y] of [[th.x + 0.15, th.y + 2.85], [th.x + 2.85, th.y + 2.85], [th.x + 2.85, th.y + 0.15]])
    line(g, shade(WOOD, -40), 3, P(x, y, th.g), P(x, y, th.z));
}

function drawDeck(env: TreeDrawEnv, th: TreeHouse, P: Proj) {
  const g = env.g;
  const { x, y, z } = th;
  const t = 0.5; // độ dày sàn (bậc)
  poly(g, shade(WOOD, -45), [P(x, y + 3, z), P(x + 3, y + 3, z), P(x + 3, y + 3, z - t), P(x, y + 3, z - t)]);
  poly(g, shade(WOOD, -30), [P(x + 3, y, z), P(x + 3, y + 3, z), P(x + 3, y + 3, z - t), P(x + 3, y, z - t)]);
  poly(g, WOOD, [P(x, y, z), P(x + 3, y, z), P(x + 3, y + 3, z), P(x, y + 3, z)], shade(WOOD, -55));
  for (let k = 1; k < 6; k++) line(g, shade(WOOD, -22), 1, P(x + k * 0.5, y + 0.05, z), P(x + k * 0.5, y + 2.95, z));
}

/** Lan can: front=false là hai cạnh phía sau (-x, -y), front=true là hai cạnh phía trước (chừa lối thang). */
function drawRails(env: TreeDrawEnv, th: TreeHouse, P: Proj, front: boolean) {
  const g = env.g;
  const { x, y, z } = th;
  const c = shade(WOOD, -35);
  const seg = (ax: number, ay: number, bx: number, by: number) => {
    line(g, c, 1.5, P(ax, ay, z + RAIL_H), P(bx, by, z + RAIL_H));
    const n = Math.round(Math.hypot(bx - ax, by - ay) * 2);
    for (let k = 0; k <= n; k++) {
      const px = ax + ((bx - ax) * k) / n;
      const py = ay + ((by - ay) * k) / n;
      line(g, c, 1, P(px, py, z), P(px, py, z + RAIL_H));
    }
  };
  if (!front) {
    seg(x, y, x + 3, y);
    seg(x, y, x, y + 3);
    // cột mái phía sau
    for (const [px, py] of [[x + 0.25, y + 0.25], [x + 2.75, y + 0.25], [x + 0.25, y + 2.75]]) line(g, shade(WOOD, -50), 2, P(px, py, z), P(px, py, z + ROOF_Z));
    return;
  }
  const lx = th.foot.x - x; // ô thang trên mép trước
  if (lx > 0) seg(x, y + 3, x + lx, y + 3);
  if (lx < 2) seg(x + lx + 1, y + 3, x + 3, y + 3);
  seg(x + 3, y, x + 3, y + 3);
  line(g, shade(WOOD, -50), 2, P(x + 2.75, y + 2.75, z), P(x + 2.75, y + 2.75, z + ROOF_Z));
}

function drawLadder(env: TreeDrawEnv, th: TreeHouse, P: Proj) {
  const g = env.g;
  const edge = th.y + 3;
  const a = th.foot.x + 0.25;
  const b = th.foot.x + 0.75;
  const top = th.z + 0.8;
  line(g, shade(WOOD, -50), 2, P(a, edge + 0.08, th.g), P(a, edge + 0.08, top));
  line(g, shade(WOOD, -50), 2, P(b, edge + 0.08, th.g), P(b, edge + 0.08, top));
  for (let zz = th.g + 0.5; zz < th.z + 0.5; zz += 0.75) line(g, shade(WOOD, -10), 1.5, P(a, edge + 0.08, zz), P(b, edge + 0.08, zz));
}

function drawRoof(env: TreeDrawEnv, th: TreeHouse, P: Proj) {
  const g = env.g;
  const { x, y, z } = th;
  const r = z + ROOF_Z;
  const apex = P(x + 1.5, y + 1.5, r + 1.6);
  const c = [P(x - 0.1, y - 0.1, r), P(x + 3.1, y - 0.1, r), P(x + 3.1, y + 3.1, r), P(x - 0.1, y + 3.1, r)];
  poly(g, "#2f9e8f", [c[3], c[2], apex], "#1d1b2e");
  poly(g, "#237a6f", [c[2], c[1], apex], "#1d1b2e");
}

function drawCanopy(env: TreeDrawEnv, th: TreeHouse, P: Proj) {
  const g = env.g;
  const sway = Math.sin(env.time * 1.3) * 1.2;
  const blobs: [number, number, number, number, number][] = [
    [th.x + 0.2, th.y + 0.6, th.z + CANOPY_H - 0.5, 22, -10],
    [th.x + 2.4, th.y + 0.2, th.z + CANOPY_H - 0.3, 20, -18],
    [th.x + 1.2, th.y - 0.4, th.z + CANOPY_H + 0.4, 24, 0],
  ];
  for (const [bx, by, bz, rad, tone] of blobs) {
    const [px, py] = P(bx, by, bz);
    g.fillStyle = shade(env.leaf, tone - 18);
    g.beginPath();
    g.ellipse(px + sway, py + 3, rad, rad * 0.62, 0, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = shade(env.leaf, tone);
    g.beginPath();
    g.ellipse(px + sway - 2, py, rad * 0.86, rad * 0.5, 0, 0, Math.PI * 2);
    g.fill();
  }
}

/** Vùng màn hình mà tán lá và mái chiếm (để làm mờ khi người chơi đứng phía sau). */
export function canopyBox(env: TreeDrawEnv, th: TreeHouse) {
  const [cx] = [env.projX(th.x + 1.5, th.y + 1.5)];
  return { x0: cx - 64, x1: cx + 64, y0: env.projY(th.x + 1.5, th.y + 1.5, th.z + CANOPY_H + 2) - 20, y1: env.projY(th.x + 1.5, th.y + 1.5, th.z) };
}

/** Biển tên "Đài quan sát" phía trên tán lá (vẽ cùng lượt với nhãn tên nhà). */
export function drawTreeHouseLabel(env: TreeDrawEnv, th: TreeHouse) {
  const g = env.g;
  const ax = env.projX(th.x + 1.5, th.y + 1.5);
  const py = env.projY(th.x + 1.5, th.y + 1.5, th.z + CANOPY_H + 2) - 6;
  g.font = "bold 8px 'Be Vietnam Pro', sans-serif";
  g.textAlign = "center";
  g.textBaseline = "middle";
  const w = g.measureText(`🌳 ${LABEL}`).width + 10;
  g.fillStyle = "#1d1b2e";
  roundRect(g, ax - w / 2 - 1, py - 7, w + 2, 14, 5);
  g.fillStyle = "#e9fff6";
  roundRect(g, ax - w / 2, py - 6, w, 12, 4.5);
  g.fillStyle = "#1f2140";
  g.fillText(`🌳 ${LABEL}`, ax, py + 0.5);
}
