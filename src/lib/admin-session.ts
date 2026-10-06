/**
 * Team-member admin sessions: cookie `tc_user` = "<userId>.<expiresMs>.<hmac>".
 * Web Crypto only, so the middleware (edge) and server code share it. The key
 * derives from ADMIN_PASSWORD — changing the owner password signs everyone out.
 * The signature proves the cookie is ours; whether the user is still ACTIVE is
 * checked against the database by requireAdmin() and the admin layout.
 */
export const USER_COOKIE = "tc_user";
export const SESSION_DAYS = 14;

async function key(): Promise<CryptoKey | null> {
  const pw = process.env.ADMIN_PASSWORD;
  if (!pw) return null;
  const raw = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(`tutcasa-admin-session:${pw}`));
  return crypto.subtle.importKey("raw", raw, { name: "HMAC", hash: "SHA-256" }, false, ["sign", "verify"]);
}

const hex = (b: ArrayBuffer) => Array.from(new Uint8Array(b)).map((x) => x.toString(16).padStart(2, "0")).join("");

export async function signUserSession(userId: string, days = SESSION_DAYS): Promise<string | null> {
  const k = await key();
  if (!k) return null;
  const body = `${userId}.${Date.now() + days * 86_400_000}`;
  return `${body}.${hex(await crypto.subtle.sign("HMAC", k, new TextEncoder().encode(body)))}`;
}

/** The user id when the token is genuine and not expired, else null. */
export async function verifyUserSession(token: string | undefined | null): Promise<string | null> {
  if (!token) return null;
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  const [userId, exp, sig] = parts;
  if (!/^[0-9a-f-]{36}$/i.test(userId) || !(Number(exp) > Date.now()) || !/^[0-9a-f]{64}$/.test(sig)) return null;
  const k = await key();
  if (!k) return null;
  const sigBytes = new Uint8Array(sig.match(/../g)!.map((h) => parseInt(h, 16)));
  const ok = await crypto.subtle.verify("HMAC", k, sigBytes, new TextEncoder().encode(`${userId}.${exp}`));
  return ok ? userId : null;
}
