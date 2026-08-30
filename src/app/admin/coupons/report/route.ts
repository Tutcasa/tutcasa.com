import type { NextRequest } from "next/server";
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
    middleware's cookie gate protects it. Optional ?year= and ?month=
    filter by when the coupon was used. */
export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const year = Number(sp.get("year")) || 0;   // e.g. 2026
  const month = Number(sp.get("month")) || 0; // 1–12, only with a year
  const from =
    year && month ? `${year}-${String(month).padStart(2, "0")}-01`
    : year ? `${year}-01-01`
    : null;
  const to =
    year && month ? (month === 12 ? `${year + 1}-01-01` : `${year}-${String(month + 1).padStart(2, "0")}-01`)
    : year ? `${year + 1}-01-01`
    : null;

  const window = from ? "and created_at >= $1::date and created_at < $2::date" : "";
  const params = from ? [from, to] : [];
  const res = await getDb().query(
    `select * from (
       select b.coupon_code, l.title as listing, to_char(b.created_at,'YYYY-MM-DD') as used_on,
              b.guest_name, b.coupon_discount_cents, b.currency, b.status, b.created_at
         from bookings b join listings l on l.id = b.listing_id
        where b.coupon_code is not null
       union all
       select tb.coupon_code, t.title, to_char(tb.created_at,'YYYY-MM-DD'),
              tb.guest_name, tb.coupon_discount_cents, tb.currency, tb.status, tb.created_at
         from tour_bookings tb join tours t on t.id = tb.tour_id
        where tb.coupon_code is not null
     ) u where true ${window}
     order by created_at desc`,
    params,
  );
  const rows = [
    ["Coupon code", "Listing name", "Date of usage", "Guest name", "Discounted amount", "Currency", "Booking status"],
    ...res.rows.map((r) => [
      r.coupon_code, r.listing, r.used_on, r.guest_name,
      ((r.coupon_discount_cents ?? 0) / 100).toFixed(2), r.currency, r.status,
    ]),
  ];
  const csv = rows.map((row) => row.map(esc).join(",")).join("\n");
  const suffix = year ? `-${year}${month ? "-" + String(month).padStart(2, "0") : ""}` : "";
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="tutcasa-coupons-report${suffix}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
