"use server";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db, schema } from "@/db";
import { getCurrentUser } from "@/lib/auth";
import { isSkinId } from "@/lib/skins";

/** Học sinh đổi trang phục nhân vật. Trả về false nếu không hợp lệ. */
export async function setSkin(skinId: string): Promise<boolean> {
  const user = await getCurrentUser();
  if (!user || user.role !== "STUDENT" || !isSkinId(skinId)) return false;
  await db.update(schema.users).set({ skin: skinId }).where(eq(schema.users.id, user.id));
  revalidatePath("/", "layout");
  return true;
}
