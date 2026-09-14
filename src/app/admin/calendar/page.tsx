import Link from "next/link";
import { getDb } from "@/lib/db";

export const dynamic = "force-dynamic";

/**
 * All-in-one calendar — every home's availability, reservations and
 * nightly prices for a month in one grid (rows = homes, columns = days).
 * Clicking a home opens its own calendar with the full editing tools.
 */

interface DayCell {
  kind: "booked" | "blocked" | "free";
  label?: string;   // guest name on the first covered day
  invoiceNo?: string;
  priceCents?: number;
  status?: string;
}

const pad = (n: number) => String(n).padStart(2, "0");

export default async function AdminCalendar({
  searchParams,
}: { searchParams: Promise<{ m?: string }> }) {
  const { m } = await searchParams;
  const now = new Date();
  const [year, month] = /^\d{4}-\d{2}$/.test(m ?? "")
    ? (m as string).split("-").map(Number)
    : [now.getUTCFullYear(), now.getUTCMonth() + 1];
  const first = `${year}-${pad(month)}-01`;
  const nextM = month === 12 ? `${year + 1}-01-01` : `${year}-${pad(month + 1)}-01`;
  const prevLink = month === 1 ? `${year - 1}-12` : `${year}-${pad(month - 1)}`;
  const nextLink = month === 12 ? `${year + 1}-01` : `${year}-${pad(month + 1)}`;
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const days = Array.from({ length: daysInMonth }, (_, i) => `${year}-${pad(month)}-${pad(i + 1)}`);
  const todayISO = now.toISOString().slice(0, 10);

  const db = getDb();
  const [listings, bookings, blocks, rates, dayRows] = await Promise.all([
    db.query(
      `select id, title, city, status from listings
        where status <> 'archived' order by title`),
    db.query(
      `select b.listing_id, b.guest_name, b.invoice_no, b.status, b.guests,
              to_char(lower(b.stay),'YYYY-MM-DD') as ci,
              to_char(upper(b.stay),'YYYY-MM-DD') as co
         from bookings b
        where b.status <> 'cancelled'
          and b.stay && daterange($1::date, $2::date)`, [first, nextM]),
    db.query(
      `select l.id as listing_id,
              to_char(r.from_date,'YYYY-MM-DD') as from_day,
              to_char(r.to_date,'YYYY-MM-DD') as to_day
         from listings l
         cross join lateral listing_unavailable_ranges(l.id) r
        where l.status <> 'archived'
          and daterange(r.from_date, r.to_date) && daterange($1::date, $2::date)`,
      [first, nextM]),
    db.query(
      `select listing_id, nightly_cents, season is null as is_base,
              to_char(lower(season),'YYYY-MM-DD') as from_day,
              to_char(upper(season),'YYYY-MM-DD') as to_day
         from listing_rates`),
    db.query(
      `select listing_id, to_char(day,'YYYY-MM-DD') as day, nightly_cents, is_blocked
         from listing_price_days
        where day >= $1::date and day < $2::date`, [first, nextM]),
  ]);

  // per-listing day resolution: booking → block → override price → season → base
  const grid = new Map<string, DayCell[]>();
  for (const l of listings.rows) {
    const cells: DayCell[] = days.map((d) => {
      const bk = bookings.rows.find((b) => b.listing_id === l.id && d >= b.ci && d < b.co);
      if (bk) {
        const firstDay = d === bk.ci || d === days[0];
        return {
          kind: "booked",
          label: firstDay ? `${bk.guest_name} · ${bk.guests}p` : undefined,
          invoiceNo: bk.invoice_no ? String(bk.invoice_no) : undefined,
          status: bk.status,
        };
      }
      const od = dayRows.rows.find((r) => r.listing_id === l.id && r.day === d);
      const blocked = od?.is_blocked
        || blocks.rows.some((r) => r.listing_id === l.id && d >= r.from_day && d < r.to_day);
      if (blocked) return { kind: "blocked" };
      const season = rates.rows.find((r) =>
        r.listing_id === l.id && !r.is_base && r.from_day && d >= r.from_day && d < r.to_day);
      const base = rates.rows.find((r) => r.listing_id === l.id && r.is_base);
      const cents = od?.nightly_cents ?? season?.nightly_cents ?? base?.nightly_cents;
      return { kind: "free", priceCents: cents != null ? Number(cents) : undefined };
    });
    grid.set(l.id, cells);
  }

  const monthLabel = new Date(Date.UTC(year, month - 1, 1))
    .toLocaleDateString("en-US", { month: "long", year: "numeric", timeZone: "UTC" });

  return (
    <div>
      <div className="mb-2 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-extrabold">All-in-one calendar</h1>
        <div className="flex items-center gap-2">
          <Link href={`/admin/calendar?m=${prevLink}`}
            className="rounded-pill border-[1.5px] border-line bg-paper px-3 py-1.5 text-sm font-bold hover:border-rosa">‹</Link>
          <b className="min-w-[150px] text-center">{monthLabel}</b>
          <Link href={`/admin/calendar?m=${nextLink}`}
            className="rounded-pill border-[1.5px] border-line bg-paper px-3 py-1.5 text-sm font-bold hover:border-rosa">›</Link>
        </div>
      </div>
      <p className="mb-4 text-sm text-grey">
        Every home&rsquo;s month at a glance — reservations (with guest &amp;
        group size), blocked dates, and the nightly price on open days.
        Click a home&rsquo;s name to open its own calendar and edit it.
      </p>
      <div className="mb-3 flex flex-wrap gap-4 text-xs font-semibold">
        <span><span className="mr-1 inline-block h-3 w-3 rounded-sm bg-cactus align-middle"></span>Reserved</span>
        <span><span className="mr-1 inline-block h-3 w-3 rounded-sm bg-sol align-middle"></span>Pending request</span>
        <span><span className="mr-1 inline-block h-3 w-3 rounded-sm bg-grey/50 align-middle"></span>Blocked</span>
        <span className="text-grey">$ = nightly price on open days</span>
      </div>

      <div className="overflow-x-auto rounded-card bg-paper shadow-soft">
        <table className="border-collapse text-xs" style={{ minWidth: daysInMonth * 46 + 190 }}>
          <thead>
            <tr>
              <th className="sticky left-0 z-10 border-b border-r border-line bg-paper p-2 text-left" style={{ minWidth: 185 }}>Home</th>
              {days.map((d) => (
                <th key={d}
                  className={`border-b border-line p-1 text-center font-bold ${d === todayISO ? "bg-rosa/10 text-rosa" : "text-grey"}`}
                  style={{ minWidth: 44 }}>
                  {Number(d.slice(8))}
                  <div className="text-[9px] font-normal">
                    {new Date(`${d}T00:00:00Z`).toLocaleDateString("en-US", { weekday: "short", timeZone: "UTC" })}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {listings.rows.map((l) => (
              <tr key={l.id} className="border-b border-line/60">
                <td className="sticky left-0 z-10 border-r border-line bg-paper p-2">
                  <Link href={`/admin/listings?edit=${l.id}&tab=calendar`}
                    className="font-bold hover:text-rosa hover:underline">
                    {l.title}
                  </Link>
                  <div className="text-[10px] text-grey">
                    {l.city}{l.status !== "published" ? ` · ${l.status}` : ""}
                  </div>
                </td>
                {(grid.get(l.id) ?? []).map((c, i) => {
                  if (c.kind === "booked") {
                    return (
                      <td key={i} title={c.label ? `${c.label}${c.invoiceNo ? ` · #${c.invoiceNo}` : ""}` : undefined}
                        className={`relative p-0 ${c.status === "pending" ? "bg-sol/70" : "bg-cactus/80"}`}>
                        {c.label && (
                          <span className="absolute inset-y-0 left-1 z-[5] flex items-center overflow-visible whitespace-nowrap text-[10px] font-bold text-white drop-shadow">
                            {c.label}{c.invoiceNo ? ` · #${c.invoiceNo}` : ""}
                          </span>
                        )}
                      </td>
                    );
                  }
                  if (c.kind === "blocked") {
                    return <td key={i} className="bg-grey/25 p-0 text-center text-grey">×</td>;
                  }
                  return (
                    <td key={i} className={`p-0 text-center text-[10px] text-grey ${days[i] === todayISO ? "bg-rosa/5" : ""}`}>
                      {c.priceCents != null ? `$${Math.round(c.priceCents / 100)}` : ""}
                    </td>
                  );
                })}
              </tr>
            ))}
            {listings.rows.length === 0 && (
              <tr><td className="p-8 text-center text-grey">No homes yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
