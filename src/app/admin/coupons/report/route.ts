import { getDb } from "@/lib/db";

export const dynamic = "force-dynamic";

const esc = (v: unknown) => {
  let s = String(v ?? "");
  // neutralize spreadsheet formula injection (=, +, -, @ prefixes)
  if (/^[=+\-@]/.test(s)) s = `'${s}`;
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

/** Coupon usage report as a CSV download (the old site's
    Analytics → Coupons export). Route lives under /admin so the
    middleware's cookie gate protects it. */
export async function GET() {
  const res = await getDb().query(
    `select b.coupon_code, l.title as listing, to_char(b.created_at,'YYYY-MM-DD') as used_on,
            b.guest_name, b.coupon_discount_cents, b.currency, b.status
       from bookings b join listings l on l.id = b.listing_id
      where b.coupon_code is not null
     union all
     select tb.coupon_code, t.title, to_char(tb.created_at,'YYYY-MM-DD'),
            tb.guest_name, tb.coupon_discount_cents, tb.currency, tb.status
       from tour_bookings tb join tours t on t.id = tb.tour_id
      where tb.coupon_code is not null
      order by 3 desc`,
  );
  const rows = [
    ["Coupon code", "Listing name", "Date of usage", "Guest name", "Discounted amount", "Currency", "Booking status"],
    ...res.rows.map((r) => [
      r.coupon_code, r.listing, r.used_on, r.guest_name,
      ((r.coupon_discount_cents ?? 0) / 100).toFixed(2), r.currency, r.status,
    ]),
  ];
  const csv = rows.map((row) => row.map(esc).join(",")).join("\n");
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="tutcasa-coupons-report.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
