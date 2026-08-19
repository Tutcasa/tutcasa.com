import { getDb } from "@/lib/db";

/**
 * Native coupon engine — replaces the old site's WooCommerce coupons.
 * Server-only: validation and redemption always run against the DB;
 * the client never decides a discount. One coupon per booking (the
 * booking row has a single coupon field), so codes can never stack.
 */

export interface CouponCheck {
  ok: boolean;
  code: string;
  discountCents: number;
  reason?:
    | "NOT_FOUND" | "EXPIRED" | "USED_UP" | "MIN_NIGHTS"
    | "LISTING_ONLY" | "USER_LIMIT" | "WRONG_EMAIL" | "NEEDS_EMAIL" | "NO_SALE_STACK";
  minNights?: number;
}

export interface CouponContext {
  nights: number;
  totalCents: number;
  /** the home being booked — for listing-restricted coupons */
  listingId?: string;
  /** guest email — for per-user limits and email-restricted coupons */
  guestEmail?: string;
  /** cents of sale discounts already in the quote (length/early-bird) */
  saleDiscountCents?: number;
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
  listing_id: string | null;
  per_user_limit: number | null;
  allowed_email: string | null;
  block_on_sale: boolean;
}

/** Validate a code against a stay context; returns the discount in cents. */
export async function checkCoupon(rawCode: string, ctx: CouponContext): Promise<CouponCheck> {
  const code = rawCode.trim().toUpperCase();
  const no = (reason: CouponCheck["reason"], extra?: Partial<CouponCheck>): CouponCheck =>
    ({ ok: false, code, discountCents: 0, reason, ...extra });
  if (!code) return no("NOT_FOUND");

  const res = await getDb().query<CouponRow>(
    `select code, kind, percent_off, amount_cents, min_nights, max_uses, used_count,
            to_char(expires_at,'YYYY-MM-DD') as expires_at, active,
            listing_id, per_user_limit, allowed_email, coalesce(block_on_sale,false) as block_on_sale
       from coupons where code = $1`,
    [code],
  );
  const c = res.rows[0];
  if (!c || !c.active) return no("NOT_FOUND");
  if (c.expires_at && c.expires_at < new Date().toISOString().slice(0, 10)) return no("EXPIRED");
  if (c.max_uses != null && c.used_count >= c.max_uses) return no("USED_UP");
  if (ctx.nights < c.min_nights) return no("MIN_NIGHTS", { minNights: c.min_nights });
  if (c.listing_id && ctx.listingId && c.listing_id !== ctx.listingId) return no("LISTING_ONLY");
  if (c.block_on_sale && (ctx.saleDiscountCents ?? 0) > 0) return no("NO_SALE_STACK");

  const email = ctx.guestEmail?.trim().toLowerCase() || null;
  if (c.allowed_email) {
    if (!email) return no("NEEDS_EMAIL");
    if (email !== c.allowed_email.trim().toLowerCase()) return no("WRONG_EMAIL");
  }
  if (c.per_user_limit != null && email) {
    const used = await getDb().query<{ n: string }>(
      `select count(*) as n from bookings
        where coupon_code=$1 and lower(guest_email)=$2 and status <> 'cancelled'`,
      [code, email],
    );
    if (Number(used.rows[0].n) >= c.per_user_limit) return no("USER_LIMIT");
  }

  const discountCents = Math.min(
    ctx.totalCents,
    c.kind === "percent"
      ? Math.round(ctx.totalCents * (Number(c.percent_off) / 100))
      : (c.amount_cents ?? 0),
  );
  return { ok: true, code, discountCents };
}

/**
 * Atomically claim one use — the WHERE clause enforces max_uses inside
 * the UPDATE, so two simultaneous checkouts can never both take the
 * last slot. Returns false when the coupon just ran out.
 */
export async function tryRedeemCoupon(code: string): Promise<boolean> {
  const res = await getDb().query(
    `update coupons set used_count = used_count + 1
      where code = $1 and active
        and (max_uses is null or used_count < max_uses)
      returning code`,
    [code.trim().toUpperCase()],
  );
  return res.rowCount === 1;
}

/** Give a use back (booking insert failed, hold expired, or cancelled). */
export async function unredeemCoupon(code: string): Promise<void> {
  await getDb().query(
    "update coupons set used_count = greatest(0, used_count - 1) where code = $1",
    [code.trim().toUpperCase()],
  );
}
