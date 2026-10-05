import "server-only";
import { and, asc, desc, eq, inArray, isNotNull, sql } from "drizzle-orm";
import { db, schema } from "@/db";

export async function classStudents(classId: string | null) {
  if (!classId) return [];
  return db.query.users.findMany({
    where: and(eq(schema.users.classId, classId), eq(schema.users.role, "STUDENT")),
    orderBy: asc(schema.users.username),
  });
}

export async function worldsWithLevels() {
  return db.query.worlds.findMany({
    orderBy: asc(schema.worlds.order),
    with: { levels: { orderBy: asc(schema.levels.number) } },
  });
}

export async function progressFor(userIds: string[]) {
  if (userIds.length === 0) return [];
  return db.select().from(schema.levelProgress).where(inArray(schema.levelProgress.userId, userIds));
}

export async function recentAttempts(userIds: string[], limit = 12) {
  if (userIds.length === 0) return [];
  return db
    .select({
      id: schema.attempts.id,
      userId: schema.attempts.userId,
      correct: schema.attempts.correctCount,
      stars: schema.attempts.stars,
      total: schema.attempts.questionIds,
      finishedAt: schema.attempts.finishedAt,
      levelNumber: schema.levels.number,
      levelTitle: schema.levels.title,
      worldName: schema.worlds.name,
    })
    .from(schema.attempts)
    .innerJoin(schema.levels, eq(schema.levels.id, schema.attempts.levelId))
    .innerJoin(schema.worlds, eq(schema.worlds.id, schema.levels.worldId))
    .where(and(inArray(schema.attempts.userId, userIds), isNotNull(schema.attempts.finishedAt), eq(schema.attempts.mode, "LEVEL")))
    .orderBy(desc(schema.attempts.finishedAt))
    .limit(limit);
}

/** Câu hỏi cả lớp hay sai nhất (cần ít nhất minAnswers lượt trả lời để tỉ lệ có ý nghĩa). */
export async function hardestQuestions(userIds: string[], limit = 8, minAnswers = 3) {
  if (userIds.length === 0) return [];
  const answers = sql<number>`count(*)::int`;
  const wrong = sql<number>`count(*) filter (where ${schema.attemptAnswers.isCorrect} = false)::int`;
  return db
    .select({
      id: schema.questions.id,
      prompt: schema.questions.prompt,
      levelNumber: schema.levels.number,
      worldName: schema.worlds.name,
      answers,
      wrong,
    })
    .from(schema.attemptAnswers)
    .innerJoin(schema.attempts, eq(schema.attempts.id, schema.attemptAnswers.attemptId))
    .innerJoin(schema.questions, eq(schema.questions.id, schema.attemptAnswers.questionId))
    .innerJoin(schema.levels, eq(schema.levels.id, schema.questions.levelId))
    .innerJoin(schema.worlds, eq(schema.worlds.id, schema.levels.worldId))
    .where(inArray(schema.attempts.userId, userIds))
    .groupBy(schema.questions.id, schema.questions.prompt, schema.levels.number, schema.worlds.name)
    .having(sql`count(*) >= ${minAnswers} and count(*) filter (where ${schema.attemptAnswers.isCorrect} = false) > 0`)
    .orderBy(sql`count(*) filter (where ${schema.attemptAnswers.isCorrect} = false)::float / count(*) desc`, desc(answers))
    .limit(limit);
}

export function fmtTime(d: Date | null) {
  if (!d) return "—";
  return new Intl.DateTimeFormat("vi-VN", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: "Asia/Ho_Chi_Minh",
  }).format(d);
}
