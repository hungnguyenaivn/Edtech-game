import Link from "next/link";
import { count } from "drizzle-orm";
import { db, schema } from "@/db";
import { requireTeacher } from "@/lib/auth";
import { classStudents, fmtTime, progressFor, recentAttempts, worldsWithLevels } from "@/lib/admin-data";

export default async function AdminHome() {
  const teacher = await requireTeacher();
  const students = await classStudents(teacher.classId);
  const ids = students.map((s) => s.id);
  const [worlds, prog, recent, [{ n: qCount }]] = await Promise.all([
    worldsWithLevels(),
    progressFor(ids),
    recentAttempts(ids),
    db.select({ n: count() }).from(schema.questions),
  ]);
  const key = (u: string, l: string) => `${u}:${l}`;
  const pmap = new Map(prog.map((p) => [key(p.userId, p.levelId), p]));
  const nameOf = new Map(students.map((s) => [s.id, s.displayName]));
  const plays = prog.reduce((s, p) => s + p.plays, 0);
  const passed = prog.filter((p) => p.passed).length;
  const totalLevels = worlds.reduce((s, w) => s + w.levels.length, 0);

  return (
    <>
      <h1>Tiến độ lớp</h1>
      <p className="lead">Mỗi ô là một level: số sao cao nhất em đạt được. Bấm tên học sinh để xem chi tiết.</p>

      <div className="stat-row">
        <div className="stat"><b>{students.length}</b><span>học sinh</span></div>
        <div className="stat"><b>{plays}</b><span>lượt chơi đã nộp</span></div>
        <div className="stat"><b>{passed}/{students.length * totalLevels}</b><span>level đã qua (cả lớp)</span></div>
        <div className="stat"><b>{qCount}</b><span>câu hỏi trong ngân hàng</span></div>
      </div>

      <div className="panel" style={{ overflowX: "auto" }}>
        <table className="tbl">
          <thead>
            <tr>
              <th rowSpan={2}>Học sinh</th>
              {worlds.map((w) => (
                <th key={w.id} colSpan={w.levels.length} style={{ textAlign: "center", borderLeft: "2px solid #eef0f6" }}>
                  <span style={{ color: w.color }}>●</span> {w.name}
                </th>
              ))}
              <th rowSpan={2}>Tổng sao</th>
            </tr>
            <tr>
              {worlds.flatMap((w) =>
                w.levels.map((l, i) => (
                  <th key={l.id} className="cell-lv" style={i === 0 ? { borderLeft: "2px solid #eef0f6" } : undefined}>L{l.number}</th>
                )),
              )}
            </tr>
          </thead>
          <tbody>
            {students.map((s) => {
              let stars = 0;
              return (
                <tr key={s.id}>
                  <td><Link href={`/admin/students/${s.id}`} style={{ fontWeight: 700, color: "#4b3ccc" }}>{s.displayName}</Link><div className="small">{s.username}</div></td>
                  {worlds.flatMap((w) =>
                    w.levels.map((l, i) => {
                      const p = pmap.get(key(s.id, l.id));
                      stars += p?.bestStars ?? 0;
                      return (
                        <td key={l.id} className="cell-lv" style={i === 0 ? { borderLeft: "2px solid #eef0f6" } : undefined}>
                          {!p ? (
                            <span className="small">–</span>
                          ) : p.passed ? (
                            <span className="pill pill-green" title={`Tốt nhất ${p.bestCorrect}/10 · ${p.plays} lượt`}>{"★".repeat(p.bestStars)}</span>
                          ) : (
                            <span className="pill pill-amber" title={`Chưa qua · ${p.plays} lượt`}>{p.bestCorrect}/10</span>
                          )}
                        </td>
                      );
                    }),
                  )}
                  <td style={{ fontWeight: 800 }}>⭐ {stars}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
        <p className="small" style={{ margin: "12px 0 0" }}>
          <span className="pill pill-green">★★</span> đã qua (số sao) · <span className="pill pill-amber">5/10</span> đã chơi nhưng chưa qua (điểm tốt nhất) · – chưa chơi
        </p>
      </div>

      <div className="panel">
        <h2>Lượt chơi gần đây</h2>
        {recent.length === 0 ? (
          <p className="small">Chưa có lượt chơi nào.</p>
        ) : (
          <table className="tbl">
            <thead><tr><th>Thời gian</th><th>Học sinh</th><th>Thế giới · Level</th><th>Kết quả</th></tr></thead>
            <tbody>
              {recent.map((a) => (
                <tr key={a.id}>
                  <td>{fmtTime(a.finishedAt)}</td>
                  <td>{nameOf.get(a.userId)}</td>
                  <td>{a.worldName} · L{a.levelNumber} {a.levelTitle}</td>
                  <td>
                    {a.correct}/{a.total.length} câu ·{" "}
                    {a.stars > 0 ? <span className="pill pill-green">{"★".repeat(a.stars)}</span> : <span className="pill pill-red">chưa qua</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}
