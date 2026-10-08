/**
 * In mã băm bản đồ overworld của mọi thế giới (nhiều số level) — dùng để chứng minh một thay đổi
 * KHÔNG làm đổi bản đồ cũ. Chạy: npx tsx scripts/snap-overworld.ts  (so sánh đầu ra trước/sau)
 */
import { createHash } from "node:crypto";
import { buildOverworld } from "../src/components/game/overworld-gen";

for (const slug of ["ai-cong-nghe", "toan-ly-hoa", "tieng-anh", "cyber-world"])
  for (const n of [5, 6, 8]) {
    const m = buildOverworld(slug, n);
    const hash = createHash("md5").update(JSON.stringify([m.cells, m.height, m.reachable, m.stops, m.spawn])).digest("hex");
    console.log(slug.padEnd(14), n, hash);
  }
