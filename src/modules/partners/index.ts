import "server-only";
import { cookies } from "next/headers";
import { getDb } from "@/lib/db";

/**
 * Marketing partners (influencers, agencies…): each has a tracked link
 * tutcasa.com/?via=CODE. The CaptureRef component stores the code in a
 * 30-day cookie; every price the visitor sees — and the booking they
 * make — carries that partner's commission % on top (paid by the guest,
 * shown only in the admin breakdown).
 */

export interface VisitorCommission {
  code: string;
  name: string;
  pct: number;
}

const CODE_RE = /^[A-Z0-9_-]{2,32}$/i;

/** The partner attached to THIS visitor (via the tc_via cookie), if any. */
export async function visitorCommission(): Promise<VisitorCommission | null> {
  const raw = (await cookies()).get("tc_via")?.value?.trim() ?? "";
  if (!raw || !CODE_RE.test(raw)) return null;
  const res = await getDb().query<{ code: string; name: string; commission_pct: string }>(
    `select code, name, commission_pct from marketing_partners
      where upper(code) = upper($1) and active`,
    [raw],
  );
  const p = res.rows[0];
  if (!p) return null;
  const pct = Number(p.commission_pct);
  return pct > 0 ? { code: p.code, name: p.name, pct } : null;
}
