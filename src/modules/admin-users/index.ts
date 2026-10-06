import "server-only";
import { randomBytes, scrypt as _scrypt, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
import { getDb } from "@/lib/db";

/** Team members who log in to admin with their own email + password. */
const scrypt = promisify(_scrypt) as (pw: string, salt: Buffer, len: number) => Promise<Buffer>;

export interface AdminUser {
  id: string; name: string; email: string; active: boolean;
  createdAt: string; lastLoginAt: string | null; createdBy: string | null;
}

export const MIN_PASSWORD = 10;

export async function hashPassword(pw: string): Promise<string> {
  const salt = randomBytes(16);
  return `scrypt$${salt.toString("hex")}$${(await scrypt(pw, salt, 32)).toString("hex")}`;
}

async function passwordMatches(pw: string, stored: string): Promise<boolean> {
  const [algo, saltHex, hashHex] = stored.split("$");
  if (algo !== "scrypt" || !saltHex || !hashHex) return false;
  const want = Buffer.from(hashHex, "hex");
  const got = await scrypt(pw, Buffer.from(saltHex, "hex"), want.length);
  return got.length === want.length && timingSafeEqual(got, want);
}

const row = (r: Record<string, unknown>): AdminUser => ({
  id: String(r.id), name: String(r.name), email: String(r.email), active: !!r.active,
  createdAt: String(r.created_at), lastLoginAt: r.last_login_at ? String(r.last_login_at) : null,
  createdBy: (r.created_by as string | null) ?? null,
});

export async function listAdminUsers(): Promise<AdminUser[]> {
  const res = await getDb().query("select * from admin_users order by active desc, lower(name)");
  return res.rows.map(row);
}

export async function getActiveAdminUser(id: string): Promise<AdminUser | null> {
  const res = await getDb().query("select * from admin_users where id=$1 and active", [id]);
  return res.rows[0] ? row(res.rows[0]) : null;
}

/** Email + password check for the login form; null on any mismatch. */
export async function authenticateAdminUser(email: string, pw: string): Promise<AdminUser | null> {
  const res = await getDb().query("select * from admin_users where lower(email)=lower($1) and active", [email.trim()]);
  const r = res.rows[0];
  if (!r || !(await passwordMatches(pw, r.password_hash))) return null;
  await getDb().query("update admin_users set last_login_at=now() where id=$1", [r.id]);
  return row(r);
}

export async function createAdminUser(input: { name: string; email: string; password: string; createdBy: string }):
  Promise<{ ok: true } | { ok: false; message: string }> {
  const email = input.email.trim().toLowerCase();
  if (!input.name.trim()) return { ok: false, message: "Enter their name." };
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return { ok: false, message: "That email doesn't look right." };
  if (input.password.length < MIN_PASSWORD) return { ok: false, message: `The password needs at least ${MIN_PASSWORD} characters.` };
  try {
    await getDb().query(
      "insert into admin_users (name, email, password_hash, created_by) values ($1,$2,$3,$4)",
      [input.name.trim(), email, await hashPassword(input.password), input.createdBy]);
  } catch (e) {
    if ((e as { code?: string }).code === "23505") return { ok: false, message: "Someone with that email is already on the team." };
    throw e;
  }
  return { ok: true };
}

export async function setAdminUserPassword(id: string, password: string): Promise<{ ok: boolean; message: string }> {
  if (password.length < MIN_PASSWORD) return { ok: false, message: `The password needs at least ${MIN_PASSWORD} characters.` };
  await getDb().query("update admin_users set password_hash=$2 where id=$1", [id, await hashPassword(password)]);
  return { ok: true, message: "Password changed." };
}

export async function setAdminUserActive(id: string, active: boolean): Promise<void> {
  await getDb().query("update admin_users set active=$2 where id=$1", [id, active]);
}

export async function deleteAdminUser(id: string): Promise<void> {
  await getDb().query("delete from admin_users where id=$1", [id]);
}
