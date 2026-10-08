import { eq } from "drizzle-orm";
import { notFound, redirect } from "next/navigation";
import Game from "@/components/game/Game";
import BossGame from "@/components/game/boss/BossGame";
import { db, schema } from "@/db";
import { requireStudent } from "@/lib/auth";
import { isLevelUnlocked } from "@/lib/progress";
import { AVATAR_COLORS, isBossLevel } from "@/lib/rules";

export const metadata = { title: "Đang chơi · Vũ trụ Tri thức" };

export default async function PlayPage({ params }: { params: Promise<{ levelId: string }> }) {
  const { levelId } = await params;
  const user = await requireStudent();
  const level = await db.query.levels.findFirst({ where: eq(schema.levels.id, levelId), with: { world: true } });
  if (!level) notFound();
  if (!(await isLevelUnlocked(user.id, levelId))) redirect(`/world/${level.world.slug}`);
  const avatarColor = AVATAR_COLORS[user.avatar % AVATAR_COLORS.length];
  if (isBossLevel(level.world.slug, level.number))
    return <BossGame key={levelId} levelId={levelId} worldSlug={level.world.slug} avatarColor={avatarColor} skin={user.skin} />;
  return (
    <Game
      key={levelId}
      levelId={levelId}
      worldSlug={level.world.slug}
      avatarColor={avatarColor}
      skin={user.skin}
    />
  );
}
