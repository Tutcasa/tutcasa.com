import { getDb } from "@/lib/db";
import { fmtMoney } from "@/modules/pricing";
import { PrintButton } from "./print-button";

export const dynamic = "force-dynamic";

/**
 * Monthly/yearly performance report, filterable per home, printable as
 * PDF. Stays count by CHECK-IN date, tours by tour date, transfers by
 * their travel date (standalone ones by creation date).
 */

const MONTHS = ["January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"];

const STRIPE_FEE = (paidCents: number) =>
  paidCents > 0 ? Math.round(paidCents * 0.029) + 30 : 0;

interface StayRow {
  invoiceNo: string; title: string; guestName: string; dates: string;
  guests: number; status: string; totalCents: number; paidCents: number;
  provider: string | null; commissionCents: number; transfer: string | null;
}
interface TourRow {
  invoiceNo: string; title: string; guestName: string; date: string;
  groupSize: number; status: string; totalCents: number; paidCents: number;
}
interface TransferRow {
  name: string; kind: string; date: string; passengers: number | null;
  status: string; home: string;
}

async function loadReport(y: number, m: number | null, listingId: string | null) {
  const db = getDb();
  const start = m ? `${y}-${String(m).padStart(2, "0")}-01` : `${y}-01-01`;
  const end = m
    ? (m === 12 ? `${y + 1}-01-01` : `${y}-${String(m + 1).padStart(2, "0")}-01`)
    : `${y + 1}-01-01`;

  const [stays, tours, transfers, listings] = await Promise.all([
    db.query(
      `select b.invoice_no, l.title, b.guest_name, b.guests, b.status,
              b.total_cents, coalesce(b.amount_paid_cents,0) as paid,
              b.payment_provider,
              coalesce((b.price_breakdown->>'thirdPartyCommissionCents')::int, 0) as commission,
              to_char(lower(b.stay),'YYYY-MM-DD') || ' → ' || to_char(upper(b.stay),'YYYY-MM-DD') as dates,
              (select string_agg(t.kind, ' + ') from transfers t
                where t.booking_id = b.id and t.status <> 'cancelled') as transfer
         from bookings b join listings l on l.id = b.listing_id
        where lower(b.stay) >= $1::date and lower(b.stay) < $2::date
          ${listingId ? "and l.id = $3" : ""}
        order by lower(b.stay)`,
      listingId ? [start, end, listingId] : [start, end]),
    listingId
      ? Promise.resolve({ rows: [] as Record<string, unknown>[] })
      : db.query(
          `select tb.invoice_no, t.title, tb.guest_name, tb.group_size, tb.status,
                  tb.total_cents, coalesce(tb.amount_paid_cents,0) as paid,
                  to_char(tb.tour_date,'YYYY-MM-DD') as date
             from tour_bookings tb join tours t on t.id = tb.tour_id
            where tb.tour_date >= $1::date and tb.tour_date < $2::date
            order by tb.tour_date`, [start, end]),
    db.query(
      `select tr.full_name, tr.kind, tr.passengers, tr.status,
              coalesce(to_char(tr.travel_date,'YYYY-MM-DD'), to_char(tr.created_at,'YYYY-MM-DD')) as date,
              coalesce(l.title, '(standalone)') as home
         from transfers tr
         left join bookings b on b.id = tr.booking_id
         left join listings l on l.id = b.listing_id
        where coalesce(tr.travel_date, tr.created_at::date) >= $1::date
          and coalesce(tr.travel_date, tr.created_at::date) < $2::date
          ${listingId ? "and l.id = $3" : ""}
        order by tr.created_at`,
      listingId ? [start, end, listingId] : [start, end]),
    db.query("select id, title from listings where status <> 'archived' order by title"),
  ]);

  return {
    stays: stays.rows.map((r): StayRow => ({
      invoiceNo: String(r.invoice_no ?? ""), title: r.title, guestName: r.guest_name,
      dates: r.dates, guests: r.guests, status: r.status,
      totalCents: Number(r.total_cents), paidCents: Number(r.paid),
      provider: r.payment_provider, commissionCents: Number(r.commission),
      transfer: r.transfer,
    })),
    tours: tours.rows.map((r): TourRow => ({
      invoiceNo: String(r.invoice_no ?? ""), title: String(r.title), guestName: String(r.guest_name ?? ""),
      date: String(r.date), groupSize: Number(r.group_size), status: String(r.status),
      totalCents: Number(r.total_cents), paidCents: Number(r.paid),
    })),
    transfers: transfers.rows.map((r): TransferRow => ({
      name: r.full_name, kind: r.kind, date: r.date,
      passengers: r.passengers, status: r.status, home: r.home,
    })),
    listings: listings.rows as { id: string; title: string }[],
  };
}

const ACTIVE = (s: string) => s !== "cancelled";
/** revenue counts real bookings only — never pending requests */
const REVENUE = (s: string) => s !== "cancelled" && s !== "pending";

export default async function AdminAnalytics({
  searchParams,
}: { searchParams: Promise<{ y?: string; m?: string; listing?: string }> }) {
  const q = await searchParams;
  const now = new Date();
  const y = Math.min(2100, Math.max(2020, parseInt(q.y ?? "", 10) || now.getFullYear()));
  const m = q.m && q.m !== "all" ? Math.min(12, Math.max(1, parseInt(q.m, 10) || 0)) || null : null;
  const listingId = q.listing && q.listing !== "all" && /^[0-9a-f-]{36}$/i.test(q.listing) ? q.listing : null;

  const r = await loadReport(y, m, listingId);
  const listingName = listingId ? r.listings.find((l) => l.id === listingId)?.title : null;

  const activeStays = r.stays.filter((s) => REVENUE(s.status));
  const paidTours = r.tours.filter((t) => REVENUE(t.status));
  const grossCents =
    activeStays.reduce((s, x) => s + x.totalCents, 0) +
    paidTours.reduce((s, x) => s + x.totalCents, 0);
  const commissionCents = activeStays.reduce((s, x) => s + x.commissionCents, 0);
  const stripeFeesCents =
    activeStays.filter((x) => x.provider === "stripe").reduce((s, x) => s + STRIPE_FEE(x.paidCents), 0) +
    paidTours.reduce((s, x) => s + STRIPE_FEE(x.paidCents), 0);
  const netCents = grossCents - commissionCents - stripeFeesCents;
  const pending = r.stays.filter((s) => s.status === "pending").length +
    r.tours.filter((t) => t.status === "pending").length;
  const cancelled = {
    stays: r.stays.filter((s) => s.status === "cancelled").length,
    tours: r.tours.filter((t) => t.status === "cancelled").length,
    transfers: r.transfers.filter((t) => t.status === "cancelled").length,
  };

  const periodLabel = `${m ? MONTHS[m - 1] + " " : ""}${y}${listingName ? ` · ${listingName}` : ""}`;
  const years = Array.from({ length: 4 }, (_, i) => now.getFullYear() + 1 - i);

  const cards = [
    ["Gross revenue", fmtMoney(grossCents)],
    ["Net revenue (est.)", fmtMoney(netCents)],
    ["Stays", String(activeStays.length)],
    ["Tours", String(paidTours.length)],
    ["Transfers", String(r.transfers.filter((t) => ACTIVE(t.status)).length)],
    ["Pending requests", String(pending)],
    ["Cancelled", `${cancelled.stays} stays · ${cancelled.tours} tours · ${cancelled.transfers} transfers`],
  ] as const;

  const th = "px-2 py-1.5 text-left text-[11px] font-extrabold uppercase tracking-wide text-grey";
  const td = "px-2 py-1.5 border-t border-line";

  return (
    <div>
      {/* print = the PDF: hide chrome, keep only the report */}
      <style>{`@media print {
        header, footer, aside, .no-print { display: none !important; }
        main { width: 100% !important; } body { background: #fff; }
        .rounded-card { box-shadow: none !important; border: 1px solid #ddd; }
      }`}</style>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold">Analytics &amp; reports</h1>
          <p className="text-sm text-grey">Report for <b>{periodLabel}</b> — stays by check-in date, tours by tour date.</p>
        </div>
        <PrintButton />
      </div>

      <form className="no-print my-4 flex flex-wrap items-center gap-2 text-sm">
        <select name="y" defaultValue={String(y)} className="rounded-xl border-[1.5px] border-line bg-white px-3 py-2">
          {years.map((yy) => <option key={yy} value={yy}>{yy}</option>)}
        </select>
        <select name="m" defaultValue={m ? String(m) : "all"} className="rounded-xl border-[1.5px] border-line bg-white px-3 py-2">
          <option value="all">Whole year</option>
          {MONTHS.map((name, i) => <option key={name} value={i + 1}>{name}</option>)}
        </select>
        <select name="listing" defaultValue={listingId ?? "all"} className="max-w-[280px] rounded-xl border-[1.5px] border-line bg-white px-3 py-2">
          <option value="all">All homes</option>
          {r.listings.map((l) => <option key={l.id} value={l.id}>{l.title}</option>)}
        </select>
        <button className="rounded-pill bg-rosa px-5 py-2 font-bold text-white">Apply</button>
      </form>

      <div className="mb-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {cards.map(([label, v]) => (
          <div key={label} className="rounded-card bg-paper p-4 shadow-soft">
            <div className="text-[11px] font-extrabold uppercase tracking-wide text-grey">{label}</div>
            <div className="mt-1 text-lg font-extrabold">{v}</div>
          </div>
        ))}
      </div>
      <p className="mb-6 text-xs text-grey">
        Net = gross − third-party commissions ({fmtMoney(commissionCents)}) − estimated Stripe fees ({fmtMoney(stripeFeesCents)}, 2.9% + 30&cent; per card payment). Cancelled bookings are excluded from revenue.
      </p>

      <h2 className="mb-2 text-lg font-extrabold">Stays ({r.stays.length})</h2>
      <div className="mb-6 overflow-x-auto rounded-card bg-paper shadow-soft">
        <table className="w-full min-w-[760px] text-sm">
          <thead><tr>
            <th className={th}>#</th><th className={th}>Home</th><th className={th}>Guest</th>
            <th className={th}>Dates</th><th className={th}>Guests</th><th className={th}>Transfer</th>
            <th className={th}>Status</th><th className={th}>Commission</th>
            <th className={`${th} text-right`}>Paid</th><th className={`${th} text-right`}>Total</th>
          </tr></thead>
          <tbody>
            {r.stays.map((s) => (
              <tr key={s.invoiceNo + s.dates} className={s.status === "cancelled" ? "text-grey line-through" : ""}>
                <td className={`${td} font-mono text-xs`}>{s.invoiceNo}</td>
                <td className={td}>{s.title}</td>
                <td className={td}>{s.guestName}</td>
                <td className={`${td} whitespace-nowrap`}>{s.dates}</td>
                <td className={td}>{s.guests}</td>
                <td className={td}>{s.transfer ?? "—"}</td>
                <td className={td}>{s.status}</td>
                <td className={td}>{s.commissionCents ? fmtMoney(s.commissionCents) : "—"}</td>
                <td className={`${td} text-right`}>{fmtMoney(s.paidCents)}</td>
                <td className={`${td} text-right font-bold`}>{fmtMoney(s.totalCents)}</td>
              </tr>
            ))}
            {r.stays.length === 0 && <tr><td className={`${td} text-grey`} colSpan={10}>No stays in this period.</td></tr>}
          </tbody>
        </table>
      </div>

      {!listingId && (
        <>
          <h2 className="mb-2 text-lg font-extrabold">Tours ({r.tours.length})</h2>
          <div className="mb-6 overflow-x-auto rounded-card bg-paper shadow-soft">
            <table className="w-full min-w-[640px] text-sm">
              <thead><tr>
                <th className={th}>#</th><th className={th}>Tour</th><th className={th}>Guest</th>
                <th className={th}>Date</th><th className={th}>Group</th><th className={th}>Status</th>
                <th className={`${th} text-right`}>Paid</th><th className={`${th} text-right`}>Total</th>
              </tr></thead>
              <tbody>
                {r.tours.map((t) => (
                  <tr key={t.invoiceNo + t.date} className={t.status === "cancelled" ? "text-grey line-through" : ""}>
                    <td className={`${td} font-mono text-xs`}>{t.invoiceNo}</td>
                    <td className={td}>{t.title}</td>
                    <td className={td}>{t.guestName}</td>
                    <td className={`${td} whitespace-nowrap`}>{t.date}</td>
                    <td className={td}>{t.groupSize}</td>
                    <td className={td}>{t.status}</td>
                    <td className={`${td} text-right`}>{fmtMoney(t.paidCents)}</td>
                    <td className={`${td} text-right font-bold`}>{fmtMoney(t.totalCents)}</td>
                  </tr>
                ))}
                {r.tours.length === 0 && <tr><td className={`${td} text-grey`} colSpan={8}>No tours in this period.</td></tr>}
              </tbody>
            </table>
          </div>
        </>
      )}

      <h2 className="mb-2 text-lg font-extrabold">Airport transfers ({r.transfers.length})</h2>
      <div className="mb-6 overflow-x-auto rounded-card bg-paper shadow-soft">
        <table className="w-full min-w-[560px] text-sm">
          <thead><tr>
            <th className={th}>Guest</th><th className={th}>Type</th><th className={th}>Date</th>
            <th className={th}>Passengers</th><th className={th}>Home</th><th className={th}>Status</th>
          </tr></thead>
          <tbody>
            {r.transfers.map((t, i) => (
              <tr key={i} className={t.status === "cancelled" ? "text-grey line-through" : ""}>
                <td className={td}>{t.name}</td>
                <td className={td}>{t.kind}</td>
                <td className={`${td} whitespace-nowrap`}>{t.date}</td>
                <td className={td}>{t.passengers ?? "—"}</td>
                <td className={td}>{t.home}</td>
                <td className={td}>{t.status}</td>
              </tr>
            ))}
            {r.transfers.length === 0 && <tr><td className={`${td} text-grey`} colSpan={6}>No transfers in this period.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
