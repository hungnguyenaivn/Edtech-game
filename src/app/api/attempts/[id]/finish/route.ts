import { and, eq, sql } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db, schema } from "@/db";
import { apiStudent, jsonError } from "@/lib/api";
import { starsFor } from "@/lib/rules";

/** Kết thúc lượt: tính điểm, sao, cập nhật tiến độ (giữ kết quả cao nhất). Gọi lại nhiều lần vẫn an toàn. */
export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await apiStudent();
  if (!user) return jsonError("Chưa đăng nhập", 401);
  const { id } = await params;

  const result = await db.transaction(async (tx) => {
    // Khoá dòng để hai request finish cùng lúc không cộng trùng.
    const locked = await tx.execute(sql`SELECT id FROM attempts WHERE id = ${id} AND user_id = ${user.id} FOR UPDATE`);
    if (locked.rows.length === 0) return null;
    const attempt = (await tx.query.attempts.findFirst({ where: eq(schema.attempts.id, id) }))!;
    if (attempt.finishedAt) return { correct: attempt.correctCount, total: attempt.questionIds.length, stars: attempt.stars };

    const answers = await tx.select().from(schema.attemptAnswers).where(eq(schema.attemptAnswers.attemptId, id));
    const total = attempt.questionIds.length;
    const correct = answers.filter((a) => a.isCorrect).length;
    const stars = starsFor(correct, total);

    await tx
      .update(schema.attempts)
      .set({ correctCount: correct, stars, finishedAt: new Date() })
      .where(eq(schema.attempts.id, id));

    const prev = await tx.query.levelProgress.findFirst({
      where: and(eq(schema.levelProgress.userId, user.id), eq(schema.levelProgress.levelId, attempt.levelId)),
    });
    if (prev) {
      await tx
        .update(schema.levelProgress)
        .set({
          bestCorrect: Math.max(prev.bestCorrect, correct),
          bestStars: Math.max(prev.bestStars, stars),
          passed: prev.passed || stars > 0,
          plays: prev.plays + 1,
          updatedAt: new Date(),
        })
        .where(and(eq(schema.levelProgress.userId, user.id), eq(schema.levelProgress.levelId, attempt.levelId)));
    } else {
      await tx.insert(schema.levelProgress).values({
        userId: user.id,
        levelId: attempt.levelId,
        bestCorrect: correct,
        bestStars: stars,
        passed: stars > 0,
        plays: 1,
      });
    }
    return { correct, total, stars };
  });

  if (!result) return jsonError("Không tìm thấy lượt chơi", 404);
  return NextResponse.json(result);
}
