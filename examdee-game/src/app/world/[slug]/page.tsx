import { eq } from "drizzle-orm";
import Link from "next/link";
import { notFound } from "next/navigation";
import Planet from "@/components/Planet";
import Stars from "@/components/Stars";
import StudentTopbar from "@/components/StudentTopbar";
import { db, schema } from "@/db";
import { requireStudent } from "@/lib/auth";
import { levelsWithProgress, totalStars } from "@/lib/progress";
import { QUESTIONS_PER_LEVEL, passMark } from "@/lib/rules";

export default async function WorldPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const user = await requireStudent();
  const world = await db.query.worlds.findFirst({ where: eq(schema.worlds.slug, slug) });
  if (!world) notFound();
  const [levels, stars] = await Promise.all([levelsWithProgress(user.id, world.id), totalStars(user.id)]);
  const current = levels.find((l) => l.unlocked && !l.passed);
  const worldStars = levels.reduce((s, l) => s + l.bestStars, 0);

  return (
    <main className="space-bg" style={{ ["--wc" as string]: world.color }}>
      <StudentTopbar name={user.displayName} avatar={user.avatar} totalStars={stars} back={{ href: "/home", label: "Chọn thế giới" }} />
      <div className="page">
        <div className="levels-wrap">
          <aside className="world-side">
            <Planet slug={world.slug} color={world.color} size={180} />
            <h1 className="title-kid">{world.name}</h1>
            <p className="muted-light" style={{ margin: "4px 0 16px" }}>{world.subtitle}</p>
            <div className="bar"><i style={{ width: `${(levels.filter((l) => l.passed).length / Math.max(1, levels.length)) * 100}%` }} /></div>
            <div className="world-meta">
              <span>Đã qua {levels.filter((l) => l.passed).length}/{levels.length}</span>
              <span>⭐ {worldStars}/{levels.length * 3}</span>
            </div>
            <p className="muted-light" style={{ fontSize: 14, marginTop: 18, lineHeight: 1.5 }}>
              Mỗi level có {QUESTIONS_PER_LEVEL} câu hỏi rải trên bản đồ. Đúng từ {passMark(QUESTIONS_PER_LEVEL)} câu trở lên là qua level và mở level tiếp theo.
            </p>
          </aside>
          <section className="levels">
            {levels.map((l) => (
              <div key={l.id} className={`level-row ${l.unlocked ? "" : "locked"} ${current?.id === l.id ? "current" : ""}`}>
                <div className="level-num">{l.unlocked ? l.number : "🔒"}</div>
                <div className="level-info">
                  <h3>
                    Level {l.number} · {l.title}
                    <span className="diff" title={`Độ khó ${l.number}/5`}>
                      {[1, 2, 3, 4, 5].map((d) => <i key={d} className={d <= l.number ? "on" : ""} />)}
                    </span>
                  </h3>
                  <p>
                    {!l.unlocked
                      ? `Qua level ${l.number - 1} để mở nhé`
                      : l.plays === 0
                        ? "Chưa chơi"
                        : `Tốt nhất: ${l.bestCorrect}/${QUESTIONS_PER_LEVEL} câu đúng · đã chơi ${l.plays} lần`}
                  </p>
                </div>
                <div className="level-actions">
                  <Stars n={l.bestStars} />
                  {l.unlocked ? (
                    <Link href={`/play/${l.id}`} className="btn btn-primary">
                      {l.plays === 0 ? "Vào chơi ▶" : "Chơi lại ↻"}
                    </Link>
                  ) : (
                    <span className="lock-note">Đang khoá</span>
                  )}
                </div>
              </div>
            ))}
          </section>
        </div>
      </div>
    </main>
  );
}
