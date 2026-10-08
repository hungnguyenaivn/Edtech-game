/**
 * Mô phỏng trận đánh boss không cần trình duyệt: kiểm tra logic combat ở nhiều hạt giống.
 * Chạy: npx tsx scripts/combat-sim.ts   (thoát mã 1 nếu có kiểm tra nào hỏng)
 */
import { hazardActive, hazardHits } from "../src/components/game/boss/bossAi";
import { BOUNDS, type Combat, type Input, PLAYER, applyAnswer, createCombat, phaseFor, snapshot, step, telegraphTime } from "../src/components/game/boss/combat";
import { rng } from "../src/components/game/sprites";

let fails = 0;
const check = (ok: boolean, msg: string) => {
  if (!ok) {
    fails++;
    if (fails <= 20) console.log("FAIL", msg);
  }
};

/** "Người chơi" giả: đổi hướng ngẫu nhiên mỗi nửa giây, thỉnh thoảng đánh / né. */
function bot(seed: number) {
  const r = rng(seed);
  let input: Input = { mx: 0, my: 0, attack: false, dash: false };
  return (tick: number): Input => {
    if (tick % 30 === 0) input = { mx: Math.round(r() * 2 - 1), my: Math.round(r() * 2 - 1), attack: false, dash: false };
    return { ...input, attack: r() < 0.08, dash: r() < 0.01 };
  };
}

function hasSafeSpot(s: Combat) {
  const active = s.hazards.filter(hazardActive);
  if (active.length === 0) return true;
  for (let y = BOUNDS.y0 + 40; y <= BOUNDS.y1; y += 6)
    for (let x = BOUNDS.x0; x <= BOUNDS.x1; x += 6) if (!active.some((h) => hazardHits(h, x, y, PLAYER.r))) return true;
  return false;
}

function finite(s: Combat) {
  const p = s.player;
  return [p.x, p.y, p.hp, ...s.hazards.flatMap((h) => Object.values(h).filter((v) => typeof v === "number") as number[])].every(Number.isFinite);
}

const SEEDS = 20;
const TICKS = 10000;
let telegraphs = 0;
let unsafeTicks = 0;
let chips = 0;

for (let seed = 1; seed <= SEEDS; seed++)
  for (const startAnswered of [0, 4, 7]) {
    const s = createCombat(seed * 7919, 10);
    s.answered = startAnswered;
    s.phase = phaseFor(startAnswered);
    const play = bot(seed);
    for (let t = 0; t < TICKS && s.boss.mode !== "done"; t++) {
      step(s, play(t));
      if (s.events.includes("telegraph")) {
        telegraphs++;
        check(s.boss.dur >= telegraphTime(s.phase, 0) - 1e-9, `seed ${seed}: báo trước ${s.boss.dur.toFixed(2)}s < ngưỡng pha ${s.phase}`);
      }
      if (!hasSafeSpot(s)) unsafeTicks++;
      check(finite(s), `seed ${seed} tick ${t}: có NaN/Infinity`);
      if (s.waiting) {
        chips++;
        applyAnswer(s, ((seed + t) & 3) !== 0);
        // giữ nguyên pha đang thử nghiệm để đo đủ lâu
        if (s.answered >= 10) break;
      }
    }
  }
check(unsafeTicks === 0, `${unsafeTicks} tick không có chỗ đứng an toàn`);

// Tất định: cùng hạt giống + cùng thao tác → cùng trạng thái
for (const seed of [42, 7, 2026]) {
  const run = () => {
    const s = createCombat(seed, 10);
    const play = bot(seed);
    for (let t = 0; t < 1200; t++) {
      step(s, play(t));
      if (s.waiting) applyAnswer(s, t % 2 === 0);
    }
    return JSON.stringify(snapshot(s));
  };
  check(run() === run(), `seed ${seed}: hai lần chạy cho kết quả khác nhau`);
}

// Không bấm gì: mảnh mã tự rơi trong vòng 20 giây (+1 giây dư)
{
  const s = createCombat(99, 10);
  s.invincible = true;
  let at = -1;
  for (let t = 0; t < 21 * 60 && at < 0; t++) {
    step(s, { mx: 0, my: 0, attack: false, dash: false });
    if (s.chip) at = t;
  }
  check(at >= 0, "mảnh mã không tự rơi sau 21 giây");
  console.log(`mảnh mã tự rơi sau ${(at / 60).toFixed(1)}s`);
}

// Trọn một trận: chỉ đi nhặt mảnh mã (không đánh) vẫn trả lời đủ 10 câu
{
  const s = createCombat(5, 10);
  let t = 0;
  while (s.boss.mode !== "done" && t < 60 * 60 * 6) {
    const c = s.chip;
    const p = s.player;
    const input: Input = c ? { mx: Math.sign(Math.round(c.x - p.x)), my: Math.sign(Math.round(c.y - p.y)), attack: false, dash: false } : { mx: 0, my: 0, attack: false, dash: false };
    step(s, input);
    if (s.waiting) applyAnswer(s, s.answered % 3 !== 0);
    t++;
  }
  check(s.boss.mode === "done" && s.answered === 10, `trận không kết thúc (answered=${s.answered})`);
  console.log(`trận chỉ nhặt mảnh mã: xong sau ${(t / 60).toFixed(0)}s, gục ${s.assist} lần (nấc hỗ trợ)`);
}

console.log(`${SEEDS} hạt giống × 3 pha × ≤${TICKS} tick: ${telegraphs} đòn, ${chips} mảnh mã, ${unsafeTicks} tick không an toàn`);
console.log(fails ? `FAILED: ${fails}` : "ALL PASS");
process.exit(fails ? 1 : 0);
