"use server";

import { createHash } from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export interface LoginState { error: string }

export async function adminLoginAction(
  _prev: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const password = process.env.ADMIN_PASSWORD;
  const given = String(formData.get("password") ?? "");
  const next = String(formData.get("next") ?? "/admin");

  if (!password || given !== password) {
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
