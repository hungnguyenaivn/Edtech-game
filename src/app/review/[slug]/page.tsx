import { eq } from "drizzle-orm";
import { notFound, redirect } from "next/navigation";
import Game from "@/components/game/Game";
import { db, schema } from "@/db";
import { requireStudent } from "@/lib/auth";
import { wrongQuestions } from "@/lib/progress";
import { AVATAR_COLORS } from "@/lib/rules";

export const metadata = { title: "Ôn tập · Vũ trụ Tri thức" };

export default async function ReviewPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const user = await requireStudent();
  const world = await db.query.worlds.findFirst({ where: eq(schema.worlds.slug, slug) });
  if (!world) notFound();
  if ((await wrongQuestions(user.id, slug)).length === 0) redirect("/home");
  return <Game key={slug} review worldSlug={slug} avatarColor={AVATAR_COLORS[user.avatar % AVATAR_COLORS.length]} skin={user.skin} />;
}
