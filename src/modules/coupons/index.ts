import { getDb } from "@/lib/db";

/**
 * Native coupon engine — replaces the old site's WooCommerce coupons.
 * Server-only: validation and redemption always run against the DB;
 * the client never decides a discount.
 */

export interface CouponCheck {
  ok: boolean;
  code: string;
  discountCents: number;
  reason?: "NOT_FOUND" | "EXPIRED" | "USED_UP" | "MIN_NIGHTS";
  minNights?: number;
}

interface CouponRow {
  code: string;
  kind: "percent" | "fixed";
  percent_off: string | null;
  amount_cents: number | null;
  min_nights: number;
  max_uses: number | null;
  used_count: number;
  expires_at: string | null;
  active: boolean;
}

/** Validate a code against a stay context; returns the discount in cents. */
export async function checkCoupon(
  rawCode: string,
  nights: number,
  totalCents: number,
): Promise<CouponCheck> {
  const code = rawCode.trim().toUpperCase();
  if (!code) return { ok: false, code, discountCents: 0, reason: "NOT_FOUND" };

  const res = await getDb().query<CouponRow>(
    "select code, kind, percent_off, amount_cents, min_nights, max_uses, used_count, to_char(expires_at,'YYYY-MM-DD') as expires_at, active from coupons where code = $1",
    [code],
  );
  const c = res.rows[0];
  if (!c || !c.active) return { ok: false, code, discountCents: 0, reason: "NOT_FOUND" };
  if (c.expires_at && c.expires_at < new Date().toISOString().slice(0, 10)) {
    return { ok: false, code, discountCents: 0, reason: "EXPIRED" };
  }
  if (c.max_uses != null && c.used_count >= c.max_uses) {
    return { ok: false, code, discountCents: 0, reason: "USED_UP" };
  }
  if (nights < c.min_nights) {
    return { ok: false, code, discountCents: 0, reason: "MIN_NIGHTS", minNights: c.min_nights };
  }

  const discountCents = Math.min(
    totalCents,
    c.kind === "percent"
      ? Math.round(totalCents * (Number(c.percent_off) / 100))
      : (c.amount_cents ?? 0),
  );
  return { ok: true, code, discountCents };
}

/** Count a redemption (called when a booking is actually created). */
export async function redeemCoupon(code: string): Promise<void> {
  await getDb().query(
    "update coupons set used_count = used_count + 1 where code = $1",
    [code.trim().toUpperCase()],
  );
}
