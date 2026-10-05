import Link from "next/link";
import Planet from "@/components/Planet";
import StudentTopbar from "@/components/StudentTopbar";
import { requireStudent } from "@/lib/auth";
import { wrongCountsByWorld, worldSummaries } from "@/lib/progress";

export const metadata = { title: "Chọn thế giới · Vũ trụ Tri thức" };

export default async function HomePage() {
  const user = await requireStudent();
  const [worlds, wrong] = await Promise.all([worldSummaries(user.id), wrongCountsByWorld(user.id)]);
  const stars = worlds.reduce((s, w) => s + w.stars, 0);

  return (
    <main className="space-bg">
      <StudentTopbar name={user.displayName} avatar={user.avatar} totalStars={stars} />
      <div className="page">
        <div className="page-head">
          <h1 className="title-kid">Chào {user.displayName.split(" ").pop()}! Hôm nay em bay tới đâu?</h1>
          <p className="muted-light">Chọn một hành tinh để xem các level. Level càng cao, câu hỏi càng khó.</p>
        </div>
        <div className="worlds">
          {worlds.map((w) => (
            <Link key={w.id} href={`/world/${w.slug}`} className="world-card" style={{ ["--wc" as string]: w.color }}>
              <Planet slug={w.slug} color={w.color} />
              <h2>{w.name}</h2>
              <p className="sub">{w.subtitle}</p>
              <div className="world-progress">
                <div className="bar"><i style={{ width: `${(w.passed / Math.max(1, w.levelCount)) * 100}%` }} /></div>
                <div className="world-meta">
                  <span>{w.passed}/{w.levelCount} level</span>
                  <span>⭐ {w.stars}/{w.levelCount * 3}</span>
                </div>
              </div>
              <span className="btn btn-primary">{w.passed === 0 ? "Bắt đầu ▶" : w.passed === w.levelCount ? "Chơi lại ▶" : "Chơi tiếp ▶"}</span>
            </Link>
          ))}
        </div>
        {worlds.some((w) => wrong[w.slug]) && (
          <div className="page-head" style={{ marginTop: 32 }}>
            <h2 className="title-kid">🛠️ Ôn lại câu em từng sai</h2>
            <p className="muted-light">Làm đúng là câu đó biến mất khỏi danh sách. Ôn tập không tính sao nên em cứ thoải mái nhé!</p>
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
              {worlds.filter((w) => wrong[w.slug]).map((w) => (
                <Link key={w.id} href={`/review/${w.slug}`} className="btn btn-light btn-lg">
                  {w.name} · {wrong[w.slug]} câu ▶
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
