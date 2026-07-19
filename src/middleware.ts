import { NextRequest, NextResponse } from "next/server";

/**
 * Cookie-gated /admin. The login page sets an httpOnly cookie holding
 * a SHA-256 of the admin password; the middleware recomputes and
 * compares. Admin is disabled entirely when ADMIN_PASSWORD is unset.
 */

async function expectedToken(): Promise<string | null> {
  const password = process.env.ADMIN_PASSWORD;
  if (!password) return null;
  const data = new TextEncoder().encode(`tutcasa-admin:${password}`);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export async function middleware(req: NextRequest) {
  const expected = await expectedToken();
  if (!expected) return new NextResponse("Admin is not configured", { status: 503 });

  const cookie = req.cookies.get("tc_admin")?.value;
  if (cookie === expected) return NextResponse.next();

  const login = new URL("/admin-login", req.url);
  login.searchParams.set("next", req.nextUrl.pathname);
  return NextResponse.redirect(login);
}

export const config = { matcher: "/admin/:path*" };
