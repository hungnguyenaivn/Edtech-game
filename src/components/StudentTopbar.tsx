import Link from "next/link";
import { logout } from "@/app/actions";
import { AVATAR_COLORS } from "@/lib/rules";

export default function StudentTopbar({
  name,
  avatar,
  totalStars,
  back,
}: {
  name: string;
  avatar: number;
  totalStars: number;
  back?: { href: string; label: string };
}) {
  return (
    <header className="topbar">
      <div className="topbar-left">
        {back ? (
          <Link href={back.href} className="btn btn-ghost btn-sm">← {back.label}</Link>
        ) : (
          <Link href="/home" className="brand">🪐 Vũ trụ Tri thức</Link>
        )}
      </div>
      <div className="topbar-right">
        <Link href="/leaderboard" className="chip">🏆 Xếp hạng lớp</Link>
        <span className="chip">⭐ {totalStars}</span>
        <span className="chip">
          <span className="avatar-dot" style={{ background: AVATAR_COLORS[avatar % AVATAR_COLORS.length] }}>
            {name.split(" ").pop()?.[0]}
          </span>
          {name}
        </span>
        <form action={logout}>
          <button className="btn btn-ghost btn-sm">Thoát</button>
        </form>
      </div>
    </header>
  );
}
