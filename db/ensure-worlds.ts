/**
 * Chạy lúc build trên Vercel, sau seed-if-empty: thêm các thế giới còn thiếu (theo slug).
 * Chỉ INSERT, mỗi thế giới trong một transaction — KHÔNG xoá hay sửa dữ liệu đang có,
 * nên tiến độ của học sinh luôn được giữ nguyên.
 */
import { eq } from "drizzle-orm";
import { db, schema } from "../src/db";
import { WORLDS, insertWorld } from "./seed";

async function main() {
  if (!process.env.DATABASE_URL) {
    console.error("Thiếu DATABASE_URL.");
    process.exit(1);
  }
  for (const [order, w] of WORLDS.entries()) {
    const added = await db.transaction(async (tx) => {
      const [existing] = await tx.select({ id: schema.worlds.id }).from(schema.worlds).where(eq(schema.worlds.slug, w.bank.slug));
      if (existing) return -1;
      return insertWorld(tx, w, order);
    });
    console.log(added < 0 ? `Đã có thế giới ${w.bank.slug} — bỏ qua.` : `Đã thêm thế giới ${w.bank.slug} (${added} câu hỏi).`);
  }
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
