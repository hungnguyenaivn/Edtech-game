/**
 * Chạy lúc build trên Vercel: nếu database chưa có thế giới nào thì nạp dữ liệu mẫu.
 * Đã có dữ liệu thì bỏ qua — deploy lại KHÔNG xoá tiến độ của học sinh.
 */
import { count } from "drizzle-orm";
import { db, schema } from "../src/db";
import { seedAll } from "./seed";

async function main() {
  if (!process.env.DATABASE_URL) {
    console.error("Thiếu DATABASE_URL — hãy kết nối database Neon với project trên Vercel (Storage → Connect).");
    process.exit(1);
  }
  const [{ n }] = await db.select({ n: count() }).from(schema.worlds);
  if (n > 0) {
    console.log(`Database đã có ${n} thế giới — giữ nguyên dữ liệu.`);
  } else {
    console.log("Database trống — nạp dữ liệu mẫu…");
    await seedAll();
  }
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
