"use server";

import { createHash } from "node:crypto";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { overLimit } from "@/lib/rate-limit";
import { getSetting } from "@/modules/settings";

/**
 * Property-manager access: ONE password (MANAGER_PASSWORD env var,
 * separate from the admin's) unlocks the read-only all-in-one calendar
 * at /management — nothing else. Same hashed-cookie scheme as the admin.
 */

/** The password set in Admin → Content & info wins; the env var is the
    fallback until the admin sets one. Changing it instantly logs every
    manager out (the cookie hash no longer matches). */
async function managerPassword(): Promise<string | null> {
  const saved = (await getSetting("manager_access")).password?.trim();
  return saved || process.env.MANAGER_PASSWORD || null;
}

export const managerCookieValue = async (): Promise<string | null> => {
  const pw = await managerPassword();
  if (!pw) return null;
  return createHash("sha256").update(`tutcasa-manager:${pw}`).digest("hex");
};

export async function isManager(): Promise<boolean> {
  const want = await managerCookieValue();
  if (!want) return false;
  return (await cookies()).get("tc_manager")?.value === want;
}

export interface ManagerLoginState { ok: boolean; message: string }

export async function managerLoginAction(
  _prev: ManagerLoginState,
  formData: FormData,
): Promise<ManagerLoginState> {
  const ip = (await headers()).get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  if (overLimit(`manager-login:${ip}`, 8, 10 * 60 * 1000)) {
    return { ok: false, message: "Too many attempts — try again in a few minutes." };
  }
  const pw = await managerPassword();
  if (!pw) return { ok: false, message: "Management access isn't switched on yet." };
  if (String(formData.get("password") ?? "") !== pw) {
    return { ok: false, message: "Wrong password." };
  }
  (await cookies()).set("tc_manager", (await managerCookieValue())!, {
    httpOnly: true, secure: true, sameSite: "lax", path: "/management",
    maxAge: 30 * 24 * 3600,
  });
  redirect("/management");
}

export async function managerLogoutAction(): Promise<void> {
  (await cookies()).delete("tc_manager");
  redirect("/management");
}
