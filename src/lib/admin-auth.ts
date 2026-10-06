import "server-only";
import { createHash, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";

/**
 * Server-action guard. The /admin middleware only protects PAGE routes —
 * Next server actions are POSTs that can target ANY path, so every
 * admin mutation must verify the cookie itself. Throws on failure so a
 * forged action call dies before touching data.
 */
export type AdminIdentity = { kind: "owner"; name: string } | { kind: "user"; id: string; name: string; email: string };

/** Who is signed in: the owner (shared ADMIN_PASSWORD) or an ACTIVE team
    member (signed tc_user cookie + still active in the database). */
export async function currentAdmin(): Promise<AdminIdentity | null> {
  const password = process.env.ADMIN_PASSWORD;
  if (!password) return null;
  const jar = await cookies();
  const given = jar.get("tc_admin")?.value ?? "";
  const want = createHash("sha256").update(`tutcasa-admin:${password}`).digest();
  const got = Buffer.from(given, "hex");
  if (got.length === want.length && timingSafeEqual(got, want)) return { kind: "owner", name: "Owner" };
  const { verifyUserSession, USER_COOKIE } = await import("./admin-session");
  const uid = await verifyUserSession(jar.get(USER_COOKIE)?.value);
  if (!uid) return null;
  const { getActiveAdminUser } = await import("@/modules/admin-users");
  const u = await getActiveAdminUser(uid);
  return u ? { kind: "user", id: u.id, name: u.name, email: u.email } : null;
}

export async function requireAdmin(): Promise<void> {
  if (!(await currentAdmin())) throw new Error("not authorized");
}

/** Non-throwing variant for form actions that want to show a friendly
    "logged out" message instead of a crash screen. */
export async function isAdmin(): Promise<boolean> {
  try {
    await requireAdmin();
    return true;
  } catch {
    return false;
  }
}
