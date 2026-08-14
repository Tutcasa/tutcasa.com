import "server-only";
import { timingSafeEqual } from "node:crypto";

/**
 * Server-to-server auth for the partner booking API (Amanah).
 * The shared key lives in AMANAH_PARTNER_KEY on both sides; requests carry
 * it in the x-partner-key header. Never called from a browser — routes using
 * this must send Cache-Control: no-store and no CORS headers.
 */
export function partnerAuthorized(req: Request): boolean {
  const expected = process.env.AMANAH_PARTNER_KEY;
  if (!expected) return false; // unset key = API disabled
  const got = req.headers.get("x-partner-key") ?? "";
  const a = Buffer.from(got);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

/** fresh Response per call — a Response body can only be sent once */
export function unauthorized(): Response {
  return Response.json(
    { error: "UNAUTHORIZED" },
    { status: 401, headers: { "Cache-Control": "no-store" } },
  );
}
