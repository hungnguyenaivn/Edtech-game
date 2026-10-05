import "server-only";
import { and, asc, desc, eq, inArray, isNotNull } from "drizzle-orm";
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
    .where(and(inArray(schema.attempts.userId, userIds), isNotNull(schema.attempts.finishedAt)))
    .orderBy(desc(schema.attempts.finishedAt))
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
