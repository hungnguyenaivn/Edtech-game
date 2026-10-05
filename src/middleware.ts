import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, verifySession } from "@/lib/session";

// Chặn sớm: chưa đăng nhập thì về /login; học sinh không vào /admin.
export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const s = await verifySession(req.cookies.get(SESSION_COOKIE)?.value);

  if (pathname === "/login") {
    if (s) return NextResponse.redirect(new URL(s.role === "TEACHER" ? "/admin" : "/home", req.url));
    return NextResponse.next();
  }
  if (!s) {
    if (pathname.startsWith("/api/")) return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });
    return NextResponse.redirect(new URL("/login", req.url));
  }
  if (pathname.startsWith("/admin") && s.role !== "TEACHER") {
    return NextResponse.redirect(new URL("/home", req.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/|favicon|sprites/|api/health).*)"],
};
