/** Va chạm hình học đơn giản cho trận đánh boss (đơn vị: điểm ảnh nguồn của đấu trường). */

export function circleHit(ax: number, ay: number, ar: number, bx: number, by: number, br: number) {
  return (ax - bx) ** 2 + (ay - by) ** 2 < (ar + br) ** 2;
}

/** Hình chữ nhật (x0..x1, y0..y1) chạm hình tròn. */
export function rectCircleHit(x0: number, y0: number, x1: number, y1: number, cx: number, cy: number, r: number) {
  const nx = Math.max(x0, Math.min(x1, cx));
  const ny = Math.max(y0, Math.min(y1, cy));
  return (cx - nx) ** 2 + (cy - ny) ** 2 < r * r;
}

/**
 * Nhát chém hình quạt phía trước mặt (nửa góc 70°, tầm `reach` tính từ mép hình tròn mục tiêu).
 * Đứng sát mục tiêu thì luôn trúng bất kể hướng.
 */
export function arcHit(px: number, py: number, fx: number, fy: number, reach: number, tx: number, ty: number, tr: number) {
  const dx = tx - px;
  const dy = ty - py;
  const d = Math.hypot(dx, dy);
  if (d - tr > reach) return false;
  if (d - tr < 6) return true;
  const fl = Math.hypot(fx, fy) || 1;
  const cos = (dx * fx + dy * fy) / (d * fl);
  return cos >= Math.cos((70 * Math.PI) / 180);
}
