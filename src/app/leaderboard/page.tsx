import StudentTopbar from "@/components/StudentTopbar";
import { eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { requireStudent } from "@/lib/auth";
import { classLeaderboard, totalStars } from "@/lib/progress";
import { AVATAR_COLORS } from "@/lib/rules";

export const metadata = { title: "Xếp hạng lớp · Vũ trụ Tri thức" };

export default async function LeaderboardPage() {
  const user = await requireStudent();
  const [rows, stars, cls] = await Promise.all([
    user.classId ? classLeaderboard(user.classId) : Promise.resolve([]),
    totalStars(user.id),
    user.classId ? db.query.classRooms.findFirst({ where: eq(schema.classRooms.id, user.classId) }) : null,
  ]);

  return (
    <main className="space-bg">
      <StudentTopbar name={user.displayName} avatar={user.avatar} totalStars={stars} back={{ href: "/home", label: "Trang chủ" }} />
      <div className="page" style={{ maxWidth: 820 }}>
        <div className="page-head">
          <h1 className="title-kid">🏆 Bảng xếp hạng {cls?.name ?? "lớp"}</h1>
          <p className="muted-light">Xếp theo tổng số sao. Bằng sao thì bạn nào đúng nhiều câu hơn đứng trước.</p>
        </div>
        <div className="board">
          <div className="board-row board-head">
            <span style={{ textAlign: "center" }}>Hạng</span>
            <span>Học sinh</span>
            <span>Sao</span>
            <span>Level đã qua</span>
          </div>
          {rows.map((r) => (
            <div key={r.id} className={`board-row ${r.id === user.id ? "me" : ""}`}>
              <span className={`rank rank-${r.rank}`}>{r.rank <= 3 ? ["🥇", "🥈", "🥉"][r.rank - 1] : r.rank}</span>
              <span className="board-name">
                <span className="avatar-dot" style={{ background: AVATAR_COLORS[r.avatar % AVATAR_COLORS.length] }}>
                  {r.name.split(" ").pop()?.[0]}
                </span>
                {r.name} {r.id === user.id && <small className="muted">(em)</small>}
              </span>
              <span style={{ fontWeight: 800, fontSize: 18 }}>⭐ {r.stars}</span>
              <span>{r.passed}</span>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
