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

  const ok = !!password && given.length === password.length &&
    timingSafeEqual(Buffer.from(given), Buffer.from(password));
  if (!ok) {
    return { error: "Wrong password." };
  }

  const token = createHash("sha256").update(`tutcasa-admin:${password}`).digest("hex");
  (await cookies()).set("tc_admin", token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 24 * 14, // two weeks
    path: "/",
  });
  redirect(next.startsWith("/admin") ? next : "/admin");
}
