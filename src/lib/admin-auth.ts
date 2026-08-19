import "server-only";
import { createHash, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";

/**
 * Server-action guard. The /admin middleware only protects PAGE routes —
 * Next server actions are POSTs that can target ANY path, so every
 * admin mutation must verify the cookie itself. Throws on failure so a
 * forged action call dies before touching data.
 */
export async function requireAdmin(): Promise<void> {
  const password = process.env.ADMIN_PASSWORD;
  const given = (await cookies()).get("tc_admin")?.value ?? "";
  if (!password) throw new Error("admin auth unavailable");
  const want = createHash("sha256").update(`tutcasa-admin:${password}`).digest();
  const got = Buffer.from(given, "hex");
  const ok = got.length === want.length && timingSafeEqual(got, want);
  if (!ok) throw new Error("not authorized");
}
