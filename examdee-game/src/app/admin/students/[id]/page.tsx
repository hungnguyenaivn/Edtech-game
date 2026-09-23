import { and, desc, eq } from "drizzle-orm";
import Link from "next/link";
import { notFound } from "next/navigation";
import { db, schema } from "@/db";
import { requireTeacher } from "@/lib/auth";
import { fmtTime, progressFor, recentAttempts, worldsWithLevels } from "@/lib/admin-data";
import { deleteStudent, resetProgress } from "../../actions";
import ConfirmButton from "../../ConfirmButton";

export default async function StudentDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const teacher = await requireTeacher();
  const s = await db.query.users.findFirst({
    where: and(eq(schema.users.id, id), eq(schema.users.role, "STUDENT")),
  });
  if (!s || s.classId !== teacher.classId) notFound();
  const [worlds, prog, attempts] = await Promise.all([worldsWithLevels(), progressFor([id]), recentAttempts([id], 50)]);
  const pmap = new Map(prog.map((p) => [p.levelId, p]));

  // Câu hay sai nhất
  const wrong = await db
    .select({ prompt: schema.questions.prompt, levelId: schema.questions.levelId })
    .from(schema.attemptAnswers)
    .innerJoin(schema.attempts, eq(schema.attempts.id, schema.attemptAnswers.attemptId))
    .innerJoin(schema.questions, eq(schema.questions.id, schema.attemptAnswers.questionId))
    .where(and(eq(schema.attempts.userId, id), eq(schema.attemptAnswers.isCorrect, false)))
    .orderBy(desc(schema.attemptAnswers.answeredAt))
    .limit(10);
  const levelName = new Map(worlds.flatMap((w) => w.levels.map((l) => [l.id, `${w.name} · L${l.number}`] as const)));

  return (
    <>
      <p className="small"><Link href="/admin/students">← Học sinh</Link></p>
      <h1>{s.displayName}</h1>
      <p className="lead">Tên đăng nhập: <code>{s.username}</code> · tạo lúc {fmtTime(s.createdAt)}</p>

      <div className="panel">
        <h2>Tiến độ từng level</h2>
        <table className="tbl">
          <thead><tr><th>Thế giới</th>{[1, 2, 3, 4, 5].map((n) => <th key={n} className="cell-lv">Level {n}</th>)}</tr></thead>
          <tbody>
            {worlds.map((w) => (
              <tr key={w.id}>
                <td style={{ fontWeight: 700 }}><span style={{ color: w.color }}>●</span> {w.name}</td>
                {w.levels.map((l) => {
                  const p = pmap.get(l.id);
                  return (
                    <td key={l.id} className="cell-lv">
                      {!p ? <span className="small">chưa chơi</span> : (
                        <>
                          {p.passed ? <span className="pill pill-green">{"★".repeat(p.bestStars)}</span> : <span className="pill pill-amber">chưa qua</span>}
                          <div className="small">tốt nhất {p.bestCorrect}/10 · {p.plays} lượt</div>
                        </>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1.3fr 1fr", gap: 20 }}>
        <div className="panel">
          <h2>Lịch sử lượt chơi</h2>
          {attempts.length === 0 ? <p className="small">Chưa có lượt chơi nào.</p> : (
            <table className="tbl">
              <thead><tr><th>Thời gian</th><th>Level</th><th>Kết quả</th></tr></thead>
              <tbody>
                {attempts.map((a) => (
                  <tr key={a.id}>
                    <td>{fmtTime(a.finishedAt)}</td>
                    <td>{a.worldName} · L{a.levelNumber}</td>
                    <td>{a.correct}/{a.total.length} · {a.stars > 0 ? <span className="pill pill-green">{"★".repeat(a.stars)}</span> : <span className="pill pill-red">chưa qua</span>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
        <div className="panel">
          <h2>Câu trả lời sai gần đây</h2>
          {wrong.length === 0 ? <p className="small">Chưa có câu sai nào.</p> : (
            <ul style={{ margin: 0, paddingLeft: 18, display: "grid", gap: 8 }}>
              {wrong.map((w, i) => (
                <li key={i}><span className="small">{levelName.get(w.levelId)}</span><br />{w.prompt}</li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div className="panel">
        <h2>Thao tác</h2>
        <div style={{ display: "flex", gap: 10 }}>
          <form action={resetProgress}>
            <input type="hidden" name="id" value={s.id} />
            <ConfirmButton message={`Xoá toàn bộ tiến độ và lịch sử chơi của ${s.displayName}?`} className="btn btn-light">Xoá tiến độ (chơi lại từ đầu)</ConfirmButton>
          </form>
          <form action={deleteStudent}>
            <input type="hidden" name="id" value={s.id} />
            <ConfirmButton message={`Xoá hẳn tài khoản ${s.displayName}? Không khôi phục được.`} className="btn btn-danger">Xoá tài khoản</ConfirmButton>
          </form>
        </div>
      </div>
    </>
  );
}
