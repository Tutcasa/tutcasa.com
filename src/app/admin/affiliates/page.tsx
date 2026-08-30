import { getDb } from "@/lib/db";
import { AffiliatesClient, type AffiliateRow } from "./affiliates-client";

export const dynamic = "force-dynamic";

const SITE = process.env.SITE_URL ?? "https://tutcasa-platform.vercel.app";

async function listAffiliates(): Promise<AffiliateRow[]> {
  const res = await getDb().query(
    `select r.id, r.code, r.referrer_name, r.referrer_email, r.created_at,
            count(distinct b.id)  as bookings,
            coalesce(sum(b.coupon_discount_cents) filter (where b.status <> 'cancelled'), 0) as discount_cents,
            count(distinct rw.booking_id) as rewards
       from referrals r
       left join bookings b on b.coupon_code = r.code
       left join referral_rewards rw on rw.referral_id = r.id
      group by r.id
      order by r.created_at desc
      limit 300`,
  );
  return res.rows.map((r) => ({
    id: r.id,
    code: r.code,
    name: r.referrer_name,
    email: r.referrer_email,
    link: `${SITE}/invite/${r.code}`,
    bookings: Number(r.bookings),
    discountCents: Number(r.discount_cents),
    rewards: Number(r.rewards),
    createdAt: r.created_at,
  }));
}

export default async function AdminAffiliates() {
  const affiliates = await listAffiliates();
  return (
    <div>
      <h1 className="mb-2 text-2xl font-extrabold">Affiliate links</h1>
      <p className="mb-5 text-sm text-grey">
        Each affiliate gets a personal invite link (emailed to them automatically).
        Friends who book through it get $100 off their first stay; when the booking
        is confirmed, the affiliate earns a $200 coupon. Guests can also create
        their own link on the Loyalty page.
      </p>
      <AffiliatesClient affiliates={affiliates} />
    </div>
  );
}
