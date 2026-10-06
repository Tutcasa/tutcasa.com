"use server";

import { createHash, timingSafeEqual } from "node:crypto";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { overLimit } from "@/lib/rate-limit";

export interface LoginState { error: string }

export async function adminLoginAction(
  _prev: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const password = process.env.ADMIN_PASSWORD;
  const given = String(formData.get("password") ?? "");
  const next = String(formData.get("next") ?? "/admin");

  // brute-force guard: 10 attempts / 10 min per IP, plus a fixed delay
  const ip = (await headers()).get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  if (overLimit(`login:${ip}`, 10, 10 * 60 * 1000)) {
    return { error: "Too many attempts — try again in a few minutes." };
  }
  await new Promise((r) => setTimeout(r, 400));

  const email = String(formData.get("email") ?? "").trim();
  const dest = next.startsWith("/admin") ? next : "/admin";
  const cookieOpts = {
    httpOnly: true, sameSite: "lax" as const, secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 24 * 14, path: "/",
  };

  // team member: their own email + password
  if (email) {
    if (overLimit(`login-email:${email.toLowerCase()}`, 8, 10 * 60 * 1000)) {
      return { error: "Too many attempts — try again in a few minutes." };
    }
    const { authenticateAdminUser } = await import("@/modules/admin-users");
    const user = await authenticateAdminUser(email, given);
    if (!user) return { error: "Wrong email or password." };
    const { signUserSession, USER_COOKIE } = await import("@/lib/admin-session");
    const token = await signUserSession(user.id);
    if (!token) return { error: "Admin isn't configured." };
    const jar = await cookies();
    jar.delete("tc_admin");
    jar.set(USER_COOKIE, token, cookieOpts);
    redirect(dest);
  }

  // owner: the main admin password
  const ok = !!password && given.length === password.length &&
    timingSafeEqual(Buffer.from(given), Buffer.from(password));
  if (!ok) {
    return { error: "Wrong password." };
  }

  const token = createHash("sha256").update(`tutcasa-admin:${password}`).digest("hex");
  const jar = await cookies();
  jar.delete("tc_user");
  jar.set("tc_admin", token, cookieOpts); // two weeks
  redirect(dest);
}

/** Sign out of admin (owner or team member). */
export async function logoutAction(): Promise<void> {
  const jar = await cookies();
  jar.delete("tc_admin");
  jar.delete("tc_user");
  redirect("/admin-login");
}
