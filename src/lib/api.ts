import "server-only";
import { NextResponse } from "next/server";
import { getCurrentUser } from "./auth";

export function jsonError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

export async function apiStudent() {
  const user = await getCurrentUser();
  if (!user || user.role !== "STUDENT") return null;
  return user;
}
