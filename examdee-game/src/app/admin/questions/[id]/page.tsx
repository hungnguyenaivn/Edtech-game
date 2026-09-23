import { eq } from "drizzle-orm";
import Link from "next/link";
import { notFound } from "next/navigation";
import { db, schema } from "@/db";
import { requireTeacher } from "@/lib/auth";
import { worldsWithLevels } from "@/lib/admin-data";
import QuestionForm from "./QuestionForm";

export default async function EditQuestion({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ level?: string }> }) {
  await requireTeacher();
  const { id } = await params;
  const sp = await searchParams;
  const worlds = await worldsWithLevels();
  const levelOptions = worlds.flatMap((w) => w.levels.map((l) => ({ id: l.id, label: `${w.name} · Level ${l.number} · ${l.title}` })));

  let initial = null;
  if (id !== "new") {
    const q = await db.query.questions.findFirst({ where: eq(schema.questions.id, id) });
    if (!q) notFound();
    initial = { id: q.id, levelId: q.levelId, type: q.type, prompt: q.prompt, options: q.options, correctIndex: q.correctIndex, explanation: q.explanation, active: q.active };
  }
  const levelId = initial?.levelId ?? sp.level ?? levelOptions[0]?.id;

  return (
    <>
      <p className="small"><Link href={`/admin/questions?level=${levelId}`}>← Ngân hàng câu hỏi</Link></p>
      <h1>{initial ? "Sửa câu hỏi" : "Thêm câu hỏi"}</h1>
      <p className="lead">Học sinh sẽ thấy lời giải thích ngay sau khi trả lời (cả khi đúng và khi sai).</p>
      <div className="panel" style={{ maxWidth: 860 }}>
        <QuestionForm levels={levelOptions} initial={initial} defaultLevelId={levelId} />
      </div>
    </>
  );
}
