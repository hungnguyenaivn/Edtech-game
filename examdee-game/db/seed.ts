/**
 * Nạp dữ liệu mẫu: 1 lớp, 1 giáo viên, 5 học sinh, 3 thế giới × 5 level × 15 câu.
 * Chạy: npm run db:seed  (xoá sạch dữ liệu cũ rồi nạp lại)
 */
import bcrypt from "bcryptjs";
import { sql } from "drizzle-orm";
import { db, schema } from "../src/db";
import ai from "./questions/ai-cong-nghe";
import math from "./questions/toan-ly-hoa";
import english from "./questions/tieng-anh";
import type { WorldBank } from "./questions/types";

const WORLDS: { bank: WorldBank; name: string; subtitle: string; color: string }[] = [
  { bank: ai, name: "AI Công nghệ", subtitle: "Hành tinh Trí tuệ", color: "#7c6cff" },
  { bank: math, name: "Toán Lý Hóa", subtitle: "Hành tinh Khám phá", color: "#ff9a3d" },
  { bank: english, name: "Tiếng Anh", subtitle: "Hành tinh Ngôn ngữ", color: "#2fc4a0" },
];

const STUDENTS = [
  ["hs01", "Nguyễn An"],
  ["hs02", "Trần Bình"],
  ["hs03", "Lê Chi"],
  ["hs04", "Phạm Dũng"],
  ["hs05", "Hoàng Em"],
];

async function main() {
  console.log("Xoá dữ liệu cũ…");
  await db.execute(
    sql`TRUNCATE attempt_answers, attempts, level_progress, questions, levels, worlds, users, class_rooms CASCADE`,
  );

  const [cls] = await db.insert(schema.classRooms).values({ name: "Lớp 4A" }).returning();

  const teacherHash = await bcrypt.hash("gv123456", 10);
  const studentHash = await bcrypt.hash("123456", 10);
  await db.insert(schema.users).values({
    username: "giaovien",
    passwordHash: teacherHash,
    displayName: "Cô Hoa",
    role: "TEACHER",
    classId: cls.id,
  });
  await db.insert(schema.users).values(
    STUDENTS.map(([username, displayName], i) => ({
      username,
      displayName,
      passwordHash: studentHash,
      role: "STUDENT" as const,
      avatar: i % 6,
      classId: cls.id,
    })),
  );

  let total = 0;
  for (const [order, w] of WORLDS.entries()) {
    const [world] = await db
      .insert(schema.worlds)
      .values({ slug: w.bank.slug, name: w.name, subtitle: w.subtitle, color: w.color, order })
      .returning();
    for (const [i, lv] of w.bank.levels.entries()) {
      const [level] = await db
        .insert(schema.levels)
        .values({ worldId: world.id, number: i + 1, title: lv.title })
        .returning();
      await db.insert(schema.questions).values(
        lv.questions.map((q) =>
          q[0] === "m"
            ? { levelId: level.id, type: "MCQ" as const, prompt: q[1], options: q[2], correctIndex: q[3], explanation: q[4] }
            : { levelId: level.id, type: "TRUE_FALSE" as const, prompt: q[1], options: ["Đúng", "Sai"], correctIndex: q[2] ? 0 : 1, explanation: q[3] },
        ),
      );
      total += lv.questions.length;
    }
  }

  console.log(`Xong: 1 lớp, 1 giáo viên (giaovien / gv123456), ${STUDENTS.length} học sinh (hs01…hs05 / 123456), ${total} câu hỏi.`);
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
