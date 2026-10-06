import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import Planet from "@/components/Planet";
import StudentTopbar from "@/components/StudentTopbar";
import WorldMap from "@/components/game/WorldMap";
import { db, schema } from "@/db";
import { requireStudent } from "@/lib/auth";
import { levelsWithProgress, totalStars } from "@/lib/progress";
import { AVATAR_COLORS, QUESTIONS_PER_LEVEL, passMark } from "@/lib/rules";

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
              Điều khiển nhân vật đi tới từng ngôi nhà level. Mỗi level có {QUESTIONS_PER_LEVEL} câu hỏi rải trên bản đồ. Đúng từ {passMark(QUESTIONS_PER_LEVEL)} câu trở lên là qua level và mở level tiếp theo.
            </p>
          </aside>
          <section className="levels">
            <WorldMap
              slug={world.slug}
              avatarColor={AVATAR_COLORS[user.avatar % AVATAR_COLORS.length]}
              questionsPerLevel={QUESTIONS_PER_LEVEL}
              levels={levels.map((l) => ({ id: l.id, number: l.number, title: l.title, unlocked: l.unlocked, passed: l.passed, stars: l.bestStars, current: current?.id === l.id, plays: l.plays, bestCorrect: l.bestCorrect }))}
            />
          </section>
        </div>
      </div>
    </main>
  );
}
