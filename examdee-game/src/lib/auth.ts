import "server-only";
import { eq } from "drizzle-orm";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import { db, schema } from "@/db";
import { SESSION_COOKIE, verifySession } from "./session";

/** Người dùng đang đăng nhập (đọc lại từ DB mỗi request để tài khoản bị xoá thì mất quyền ngay). */
export const getCurrentUser = cache(async () => {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  const s = await verifySession(token);
  if (!s) return null;
  const user = await db.query.users.findFirst({ where: eq(schema.users.id, s.uid) });
  return user ?? null;
});

export async function requireStudent() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.role !== "STUDENT") redirect("/admin");
  return user;
}

export async function requireTeacher() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.role !== "TEACHER") redirect("/home");
  return user;
}
