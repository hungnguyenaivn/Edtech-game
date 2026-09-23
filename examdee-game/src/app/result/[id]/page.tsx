import { and, asc, eq, inArray, isNotNull, lt, gt } from "drizzle-orm";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import Stars from "@/components/Stars";
import { db, schema } from "@/db";
import { requireStudent } from "@/lib/auth";
import { passMark } from "@/lib/rules";

export const metadata = { title: "Kết quả · Vũ trụ Tri thức" };

export default async function ResultPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireStudent();
  const attempt = await db.query.attempts.findFirst({
    where: and(eq(schema.attempts.id, id), eq(schema.attempts.userId, user.id)),
  });
  if (!attempt) notFound();
  if (!attempt.finishedAt) redirect(`/play/${attempt.levelId}`);

  const level = (await db.query.levels.findFirst({ where: eq(schema.levels.id, attempt.levelId), with: { world: true } }))!;
  const total = attempt.questionIds.length;
  const passed = attempt.stars > 0;

  // Level sau vừa được mở lần đầu nhờ lượt này?
  let unlocked: { id: string; number: number; title: string } | null = null;
  if (passed) {
    const earlierPass = await db.query.attempts.findFirst({
      where: and(
        eq(schema.attempts.userId, user.id),
        eq(schema.attempts.levelId, level.id),
        isNotNull(schema.attempts.finishedAt),
        gt(schema.attempts.stars, 0),
        lt(schema.attempts.finishedAt, attempt.finishedAt),
      ),
    });
    if (!earlierPass) {
      const next = await db.query.levels.findFirst({
        where: and(eq(schema.levels.worldId, level.worldId), eq(schema.levels.number, level.number + 1)),
      });
      if (next) unlocked = { id: next.id, number: next.number, title: next.title };
    }
  }
  const next = await db.query.levels.findFirst({
    where: and(eq(schema.levels.worldId, level.worldId), eq(schema.levels.number, level.number + 1)),
  });

  const answers = await db.select().from(schema.attemptAnswers).where(eq(schema.attemptAnswers.attemptId, id));
  const qs = await db
    .select({ id: schema.questions.id, prompt: schema.questions.prompt })
    .from(schema.questions)
    .where(inArray(schema.questions.id, attempt.questionIds))
    .orderBy(asc(schema.questions.createdAt));
  const qById = new Map(qs.map((q) => [q.id, q]));
  const aById = new Map(answers.map((a) => [a.questionId, a]));

  const title = attempt.stars === 3 ? "Xuất sắc!" : attempt.stars === 2 ? "Giỏi lắm!" : attempt.stars === 1 ? "Qua level rồi!" : "Suýt nữa rồi!";

  return (
    <main className="space-bg center-screen">
      <div className="result-card">
        <p className="muted" style={{ margin: 0, fontWeight: 700 }}>
          {level.world.name} · Level {level.number} · {level.title}
        </p>
        <h1 className="title-kid" style={{ marginTop: 6 }}>{title}</h1>
        <div className="result-stars"><Stars n={attempt.stars} size={64} /></div>
        <div className="result-score">Em trả lời đúng {attempt.correctCount}/{total} câu</div>
        {!passed && (
          <p className="muted" style={{ marginBottom: 0 }}>
            Cần đúng ít nhất {passMark(total)} câu để qua level. Chơi lại nhé, câu hỏi sẽ được đổi!
          </p>
        )}
        {unlocked && <div className="banner-unlock">🔓 Đã mở Level {unlocked.number} · {unlocked.title}</div>}

        <div className="result-list">
          {attempt.questionIds.map((qid, i) => {
            const a = aById.get(qid);
            return (
              <div key={qid} className="result-item">
                <span>{a ? (a.isCorrect ? "✅" : "❌") : "⬜"}</span>
                <span>
                  <b>Câu {i + 1}.</b> {qById.get(qid)?.prompt}
                  {!a && <em className="muted"> (chưa trả lời)</em>}
                </span>
              </div>
            );
          })}
        </div>

        <div className="result-actions">
          <Link href={`/world/${level.world.slug}`} className="btn btn-light btn-lg">Danh sách level</Link>
          <Link href={`/play/${level.id}`} className="btn btn-light btn-lg">Chơi lại ↻</Link>
          {passed && next && (
            <Link href={`/play/${next.id}`} className="btn btn-primary btn-lg">Level {next.number} ▶</Link>
          )}
        </div>
      </div>
    </main>
  );
}
