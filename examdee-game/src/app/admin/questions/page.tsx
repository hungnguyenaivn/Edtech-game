import { asc, eq } from "drizzle-orm";
import Link from "next/link";
import { db, schema } from "@/db";
import { requireTeacher } from "@/lib/auth";
import { worldsWithLevels } from "@/lib/admin-data";
import { QUESTIONS_PER_LEVEL } from "@/lib/rules";
import { deleteQuestion, toggleQuestion } from "../actions";
import ConfirmButton from "../ConfirmButton";

export default async function QuestionsPage({ searchParams }: { searchParams: Promise<{ level?: string; saved?: string }> }) {
  await requireTeacher();
  const sp = await searchParams;
  const worlds = await worldsWithLevels();
  const allLevels = worlds.flatMap((w) => w.levels.map((l) => ({ ...l, world: w })));
  const current = allLevels.find((l) => l.id === sp.level) ?? allLevels[0];
  const rows = current
    ? await db.query.questions.findMany({ where: eq(schema.questions.levelId, current.id), orderBy: asc(schema.questions.createdAt) })
    : [];
  const activeCount = rows.filter((r) => r.active).length;

  return (
    <>
      <h1>Ngân hàng câu hỏi</h1>
      <p className="lead">
        Mỗi lượt chơi bốc ngẫu nhiên {QUESTIONS_PER_LEVEL} câu đang bật của level. Nên có từ 15 câu trở lên để mỗi lần chơi lại khác nhau.
      </p>
      {sp.saved && <p className="form-ok" style={{ marginBottom: 16 }}>Đã lưu câu hỏi.</p>}

      {worlds.map((w) => (
        <div key={w.id} className="filters">
          <b style={{ minWidth: 120 }}><span style={{ color: w.color }}>●</span> {w.name}</b>
          {w.levels.map((l) => (
            <Link key={l.id} href={`/admin/questions?level=${l.id}`} className={current?.id === l.id ? "active" : ""}>
              Level {l.number} · {l.title}
            </Link>
          ))}
        </div>
      ))}

      {current && (
        <div className="panel">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <h2 style={{ margin: 0 }}>
              {current.world.name} · Level {current.number} · {current.title}{" "}
              <span className={`pill ${activeCount >= QUESTIONS_PER_LEVEL ? "pill-green" : "pill-red"}`}>{activeCount} câu đang bật</span>
            </h2>
            <Link href={`/admin/questions/new?level=${current.id}`} className="btn btn-primary">+ Thêm câu hỏi</Link>
          </div>
          {activeCount < QUESTIONS_PER_LEVEL && (
            <p className="form-error" style={{ marginBottom: 12 }}>
              Level này có ít hơn {QUESTIONS_PER_LEVEL} câu đang bật — học sinh sẽ chỉ chơi {activeCount} câu.
            </p>
          )}
          <table className="tbl">
            <thead><tr><th>#</th><th>Loại</th><th>Đề bài</th><th>Đáp án đúng</th><th>Trạng thái</th><th></th></tr></thead>
            <tbody>
              {rows.map((q, i) => (
                <tr key={q.id} style={q.active ? undefined : { opacity: 0.55 }}>
                  <td>{i + 1}</td>
                  <td><span className="pill pill-gray">{q.type === "MCQ" ? "Trắc nghiệm" : "Đúng/Sai"}</span></td>
                  <td><div className="truncate" title={q.prompt}>{q.prompt}</div></td>
                  <td>{q.type === "MCQ" ? `${"ABCD"[q.correctIndex]}. ${q.options[q.correctIndex]}` : q.options[q.correctIndex]}</td>
                  <td>
                    <form action={toggleQuestion}>
                      <input type="hidden" name="id" value={q.id} />
                      <button className={`pill ${q.active ? "pill-green" : "pill-gray"}`} style={{ border: 0, cursor: "pointer" }} title="Bấm để bật/tắt">
                        {q.active ? "Đang bật" : "Đang tắt"}
                      </button>
                    </form>
                  </td>
                  <td style={{ whiteSpace: "nowrap" }}>
                    <Link href={`/admin/questions/${q.id}`} className="btn btn-light btn-sm">Sửa</Link>{" "}
                    <form action={deleteQuestion} style={{ display: "inline" }}>
                      <input type="hidden" name="id" value={q.id} />
                      <ConfirmButton message="Xoá câu hỏi này?" className="btn btn-danger btn-sm">Xoá</ConfirmButton>
                    </form>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
