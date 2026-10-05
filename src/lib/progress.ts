import "server-only";
import { and, asc, eq, inArray } from "drizzle-orm";
import { db, schema } from "@/db";

export type LevelView = {
  id: string;
  number: number;
  title: string;
  unlocked: boolean;
  passed: boolean;
  bestStars: number;
  bestCorrect: number;
  plays: number;
};

/** Các level của một thế giới kèm trạng thái khoá/mở và sao của học sinh. */
export async function levelsWithProgress(userId: string, worldId: string): Promise<LevelView[]> {
  const lvls = await db.query.levels.findMany({
    where: eq(schema.levels.worldId, worldId),
    orderBy: asc(schema.levels.number),
  });
  if (lvls.length === 0) return [];
  const prog = await db
    .select()
    .from(schema.levelProgress)
    .where(and(eq(schema.levelProgress.userId, userId), inArray(schema.levelProgress.levelId, lvls.map((l) => l.id))));
  const byLevel = new Map(prog.map((p) => [p.levelId, p]));
  let prevPassed = true;
  return lvls.map((l) => {
    const p = byLevel.get(l.id);
    const view: LevelView = {
      id: l.id,
      number: l.number,
      title: l.title,
      unlocked: prevPassed,
      passed: p?.passed ?? false,
      bestStars: p?.bestStars ?? 0,
      bestCorrect: p?.bestCorrect ?? 0,
      plays: p?.plays ?? 0,
    };
    prevPassed = view.passed;
    return view;
  });
}

export async function isLevelUnlocked(userId: string, levelId: string): Promise<boolean> {
  const level = await db.query.levels.findFirst({ where: eq(schema.levels.id, levelId) });
  if (!level) return false;
  const views = await levelsWithProgress(userId, level.worldId);
  return views.find((v) => v.id === levelId)?.unlocked ?? false;
}

export async function totalStars(userId: string): Promise<number> {
  const rows = await db.select().from(schema.levelProgress).where(eq(schema.levelProgress.userId, userId));
  return rows.reduce((s, r) => s + r.bestStars, 0);
}

/** Tóm tắt tiến độ theo thế giới: số level đã qua và tổng sao. */
export async function worldSummaries(userId: string) {
  const worlds = await db.query.worlds.findMany({ orderBy: asc(schema.worlds.order), with: { levels: true } });
  const prog = await db.select().from(schema.levelProgress).where(eq(schema.levelProgress.userId, userId));
  const byLevel = new Map(prog.map((p) => [p.levelId, p]));
  return worlds.map((w) => {
    const passed = w.levels.filter((l) => byLevel.get(l.id)?.passed).length;
    const stars = w.levels.reduce((s, l) => s + (byLevel.get(l.id)?.bestStars ?? 0), 0);
    return { id: w.id, slug: w.slug, name: w.name, subtitle: w.subtitle, color: w.color, levelCount: w.levels.length, passed, stars };
  });
}

/** Bảng xếp hạng một lớp: tổng sao, hoà thì so tổng câu đúng (điểm cao nhất mỗi level). */
export async function classLeaderboard(classId: string) {
  const students = await db.query.users.findMany({
    where: and(eq(schema.users.classId, classId), eq(schema.users.role, "STUDENT")),
  });
  if (students.length === 0) return [];
  const prog = await db
    .select()
    .from(schema.levelProgress)
    .where(inArray(schema.levelProgress.userId, students.map((s) => s.id)));
  const rows = students.map((s) => {
    const mine = prog.filter((p) => p.userId === s.id);
    return {
      id: s.id,
      name: s.displayName,
      avatar: s.avatar,
      stars: mine.reduce((a, p) => a + p.bestStars, 0),
      correct: mine.reduce((a, p) => a + p.bestCorrect, 0),
      passed: mine.filter((p) => p.passed).length,
    };
  });
  rows.sort((a, b) => b.stars - a.stars || b.correct - a.correct || a.name.localeCompare(b.name, "vi"));
  let rank = 0;
  return rows.map((r, i) => {
    if (i === 0 || r.stars !== rows[i - 1].stars || r.correct !== rows[i - 1].correct) rank = i + 1;
    return { ...r, rank };
  });
}
