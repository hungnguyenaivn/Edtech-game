import { and, eq, inArray } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";
import { db, schema } from "@/db";
import { apiStudent, jsonError } from "@/lib/api";
import { isLevelUnlocked } from "@/lib/progress";
import { QUESTIONS_PER_LEVEL } from "@/lib/rules";

const Body = z.object({ levelId: z.string().min(1) });

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** Bắt đầu một lượt chơi: bốc ngẫu nhiên 10 câu. KHÔNG gửi đáp án đúng xuống trình duyệt. */
export async function POST(req: Request) {
  const user = await apiStudent();
  if (!user) return jsonError("Chưa đăng nhập", 401);
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return jsonError("Dữ liệu không hợp lệ");
  const { levelId } = parsed.data;

  const level = await db.query.levels.findFirst({ where: eq(schema.levels.id, levelId), with: { world: true } });
  if (!level) return jsonError("Không tìm thấy level", 404);
  if (!(await isLevelUnlocked(user.id, levelId))) return jsonError("Level này còn khoá", 403);

  const pool = await db
    .select({ id: schema.questions.id })
    .from(schema.questions)
    .where(and(eq(schema.questions.levelId, levelId), eq(schema.questions.active, true)));
  if (pool.length === 0) return jsonError("Level này chưa có câu hỏi", 409);

  const pickedIds = shuffle(pool.map((q) => q.id)).slice(0, QUESTIONS_PER_LEVEL);
  const rows = await db.select().from(schema.questions).where(inArray(schema.questions.id, pickedIds));
  const byId = new Map(rows.map((r) => [r.id, r]));

  const [attempt] = await db
    .insert(schema.attempts)
    .values({ userId: user.id, levelId, questionIds: pickedIds })
    .returning();

  return NextResponse.json({
    attemptId: attempt.id,
    level: { id: level.id, number: level.number, title: level.title },
    world: { slug: level.world.slug, name: level.world.name, color: level.world.color },
    questions: pickedIds.map((id) => {
      const q = byId.get(id)!;
      return { id: q.id, type: q.type, prompt: q.prompt, options: q.options };
    }),
  });
}
