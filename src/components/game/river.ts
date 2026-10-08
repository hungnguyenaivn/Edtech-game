import type { Cell } from "./mapgen";
import { rng } from "./sprites";

/**
 * Khắc một con sông uốn lượn chạy dọc mép phải bản đồ (nằm ngoài vùng đường và nhà, nên tiến trình
 * không bao giờ bắt buộc phải bơi). Hai bên bờ là cát và thấp dần xuống mặt nước, mỗi bước chênh ≤ 1 bậc.
 */
export function carveRiver(opts: {
  seed: number;
  cells: Cell[][];
  height: number[][];
  /** ô không được đụng tới (đường, sân nhà) */
  locked: boolean[][];
  w: number;
  h: number;
}) {
  const { cells, height, locked, w, h } = opts;
  const r = rng(opts.seed);
  const phase = r() * Math.PI * 2;
  const water: boolean[][] = Array.from({ length: h }, () => Array<boolean>(w).fill(false));

  for (let y = 1; y < h - 1; y++) {
    const center = 29.6 + Math.sin(y / 3.5 + phase) * 1.0;
    const half = 1.8 + Math.sin(y / 2.3 + phase) * 0.25;
    for (let x = 1; x < w - 1; x++) {
      if (locked[y][x] || Math.abs(x + 0.5 - center) >= half) continue;
      cells[y][x].ground = "water";
      cells[y][x].obj = null;
      cells[y][x].decor = null;
      height[y][x] = 0;
      water[y][x] = true;
    }
  }

  // Bờ thoải: độ cao mỗi ô không vượt quá khoảng cách tới mặt nước, nên đi từ bờ xuống nước luôn bước được.
  const dist: number[][] = Array.from({ length: h }, () => Array<number>(w).fill(-1));
  const q: [number, number][] = [];
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++)
      if (water[y][x]) {
        dist[y][x] = 0;
        q.push([x, y]);
      }
  for (let i = 0; i < q.length; i++) {
    const [x, y] = q[i];
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = x + dx;
      const ny = y + dy;
      if (nx < 0 || ny < 0 || nx >= w || ny >= h || dist[ny][nx] >= 0) continue;
      dist[ny][nx] = dist[y][x] + 1;
      q.push([nx, ny]);
    }
  }
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      if (water[y][x] || locked[y][x]) continue;
      if (dist[y][x] > 0) height[y][x] = Math.min(height[y][x], dist[y][x]);
      if (dist[y][x] === 1 && cells[y][x].ground !== "wall") cells[y][x].ground = "sand";
    }
}
