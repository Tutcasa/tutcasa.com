import { getDb } from "@/lib/db";
import { fmtMoney } from "@/modules/pricing";

export const dynamic = "force-dynamic";

interface MonthRow { month: string; bookings: number; revenueCents: number }
interface ListingRow { title: string; bookings: number; revenueCents: number; nights: number }

async function loadAnalytics() {
  const db = getDb();
  const [months, listings, statuses, coupons, tours] = await Promise.all([
    db.query(
      `select to_char(date_trunc('month', created_at),'YYYY-MM') as month,
              count(*) as bookings, coalesce(sum(total_cents),0) as revenue
         from bookings where status in ('confirmed','completed')
        group by 1 order by 1 desc limit 12`),
    db.query(
      `select l.title, count(*) as bookings,
              coalesce(sum(b.total_cents),0) as revenue,
              coalesce(sum(upper(b.stay) - lower(b.stay)),0) as nights
         from bookings b join listings l on l.id = b.listing_id
        where b.status in ('confirmed','completed')
        group by l.title order by revenue desc limit 10`),
    db.query(
      `select status, count(*) as n from bookings group by status`),
    db.query(
      `select coupon_code, count(*) as n, coalesce(sum(coupon_discount_cents),0) as cents
         from bookings where coupon_code is not null group by coupon_code order by n desc limit 10`),
    db.query(
      `select count(*) as n, coalesce(sum(total_cents),0) as revenue
         from tour_bookings where status not in ('pending','cancelled')`),
  ]);
  return {
    months: months.rows.map((r): MonthRow => ({
      month: r.month, bookings: Number(r.bookings), revenueCents: Number(r.revenue) })),
    listings: listings.rows.map((r): ListingRow => ({
      title: r.title, bookings: Number(r.bookings),
      revenueCents: Number(r.revenue), nights: Number(r.nights) })),
    statuses: Object.fromEntries(statuses.rows.map((r) => [r.status, Number(r.n)])),
    coupons: coupons.rows.map((r) => ({
      code: r.coupon_code as string, n: Number(r.n), cents: Number(r.cents) })),
    tours: { n: Number(tours.rows[0]?.n ?? 0), revenueCents: Number(tours.rows[0]?.revenue ?? 0) },
  };
}

export default async function AdminAnalytics() {
  const a = await loadAnalytics();
  const maxRev = Math.max(1, ...a.months.map((m) => m.revenueCents));
  const totalRev = a.months.reduce((s, m) => s + m.revenueCents, 0);
  const totalBookings = a.months.reduce((s, m) => s + m.bookings, 0);

  const cards = [
    ["Confirmed revenue (12 mo)", fmtMoney(totalRev)],
    ["Confirmed stays (12 mo)", String(totalBookings)],
    ["Pending requests", String(a.statuses.pending ?? 0)],
    ["Tour revenue (paid+)", fmtMoney(a.tours.revenueCents)],
  ] as const;

  return (
    <div>
      <h1 className="mb-2 text-2xl font-extrabold">Analytics</h1>
      <p className="mb-5 text-sm text-grey">
        Orders and revenue analysis — confirmed and completed bookings only,
        so the numbers reflect real money, not held requests.
      </p>

      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map(([label, value]) => (
          <div key={label} className="rounded-card bg-paper p-5 shadow-soft">
            <div className="font-display text-2xl font-extrabold text-rosa">{value}</div>
            <div className="mt-1 text-sm text-grey">{label}</div>
          </div>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-card bg-paper p-5 shadow-soft">
          <h2 className="mb-3 font-extrabold">Revenue by month</h2>
          {a.months.length === 0 && <p className="py-4 text-center text-sm text-grey">No confirmed bookings yet.</p>}
          <div className="grid gap-2">
            {a.months.map((m) => (
              <div key={m.month} className="grid grid-cols-[64px_1fr_auto] items-center gap-2 text-sm">
                <span className="font-mono text-xs text-grey">{m.month}</span>
                <div className="h-4 rounded-full bg-crema">
                  <div className="h-4 rounded-full bg-rosa"
                       style={{ width: `${Math.max(3, Math.round((m.revenueCents / maxRev) * 100))}%` }} />
                </div>
                <span className="whitespace-nowrap font-bold">{fmtMoney(m.revenueCents)} <span className="font-normal text-grey">· {m.bookings}</span></span>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-card bg-paper p-5 shadow-soft">
          <h2 className="mb-3 font-extrabold">Top homes</h2>
          {a.listings.length === 0 && <p className="py-4 text-center text-sm text-grey">No confirmed bookings yet.</p>}
          <table className="w-full text-sm">
            <tbody>
              {a.listings.map((l) => (
                <tr key={l.title} className="border-b border-line/60">
                  <td className="py-2 font-semibold">{l.title}</td>
                  <td className="py-2 text-right text-grey">{l.bookings} bookings · {l.nights} nights</td>
                  <td className="py-2 text-right font-bold">{fmtMoney(l.revenueCents)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <h2 className="mb-3 mt-6 font-extrabold">Coupon usage</h2>
          {a.coupons.length === 0 && <p className="text-sm text-grey">No coupons redeemed yet.</p>}
          {a.coupons.map((c) => (
            <div key={c.code} className="flex justify-between border-b border-line/60 py-2 text-sm">
              <span className="font-mono font-bold">{c.code}</span>
              <span>{c.n} bookings · <b>{fmtMoney(c.cents)}</b> discounted</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
