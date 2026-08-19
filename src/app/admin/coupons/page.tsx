import { getDb } from "@/lib/db";
import { CouponsClient, type AdminCoupon } from "./coupons-client";

export const dynamic = "force-dynamic";

async function allCoupons(): Promise<AdminCoupon[]> {
  const res = await getDb().query(
    `select c.id, c.code, c.kind, c.percent_off, c.amount_cents, c.min_nights,
            c.max_uses, c.used_count, to_char(c.expires_at,'YYYY-MM-DD') as expires_at,
            c.active, c.note, c.per_user_limit, c.allowed_email,
            coalesce(c.block_on_sale,false) as block_on_sale,
            l.title as listing_title,
            coalesce(b.cents, 0) as redeemed_cents,
            coalesce(b.n, 0) as redeemed_bookings
       from coupons c
       left join listings l on l.id = c.listing_id
       left join (
         select coupon_code, sum(coupon_discount_cents) as cents, count(*) as n
           from bookings where coupon_code is not null group by coupon_code
       ) b on b.coupon_code = c.code
      order by c.created_at desc`,
  );
  return res.rows.map((r) => ({
    id: r.id, code: r.code, kind: r.kind,
    percentOff: r.percent_off == null ? null : Number(r.percent_off),
    amountCents: r.amount_cents, minNights: r.min_nights,
    maxUses: r.max_uses, usedCount: r.used_count,
    expiresAt: r.expires_at, active: r.active, note: r.note,
    perUserLimit: r.per_user_limit, allowedEmail: r.allowed_email,
    blockOnSale: r.block_on_sale, listingTitle: r.listing_title,
    redeemedCents: Number(r.redeemed_cents), redeemedBookings: Number(r.redeemed_bookings),
  }));
}

async function listingOptions(): Promise<{ id: string; title: string }[]> {
  const res = await getDb().query(
    "select id, title from listings where status <> 'archived' order by title");
  return res.rows;
}

export default async function AdminCoupons() {
  const [coupons, listings] = await Promise.all([allCoupons(), listingOptions()]);
  return (
    <div>
      <h1 className="mb-2 text-2xl font-extrabold">Coupons</h1>
      <p className="mb-5 text-sm text-grey">
        Discount codes guests enter at checkout. Validation always happens
        server-side; usage and revenue impact are tracked per code. One
        coupon per booking &mdash; codes can never stack.
      </p>
      <CouponsClient coupons={coupons} listings={listings} />
    </div>
  );
}
