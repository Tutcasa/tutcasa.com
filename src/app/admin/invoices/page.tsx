import { getDb } from "@/lib/db";
import { fmtMoney } from "@/modules/pricing";
import { CopyLink } from "./copy-link";
import { AdminSearch, rowMatches } from "../search-box";
import { DeleteBookingButton } from "../delete-button";
import { tourCommissions } from "@/modules/tours/types";
import { getSetting } from "@/modules/settings";

export const dynamic = "force-dynamic";

interface InvoiceRow {
  id: string;
  invoiceNo: string;
  kind: "stay" | "tour";
  what: string;
  meta: string;
  guestName: string;
  guestEmail: string;
  totalCents: number;
  currency: string;
  status: string;
  createdAt: string;
  /** commission TutCasa PAYS a third party (red) — cents in the invoice currency */
  outCents: number; outPct: number;
  /** commission DUE TO TutCasa (Amanah tours, green) */
  inCents: number; inPct: number | null;
}

const BADGE: Record<string, string> = {
  pending: "bg-sol/15 text-terra",
  confirmed: "bg-cactus/15 text-cactus",
  paid: "bg-cactus/15 text-cactus",
  partner_confirmed: "bg-cielo/15 text-cielo",
  completed: "bg-cielo/15 text-cielo",
  cancelled: "bg-grey/15 text-grey",
};

async function allInvoices(): Promise<InvoiceRow[]> {
  const db = getDb();
  const res = await db.query(
    `select b.id, b.invoice_no, 'stay' as kind,
            l.title || ' — ' || l.city as what,
            to_char(lower(b.stay),'YYYY-MM-DD') || ' → ' || to_char(upper(b.stay),'YYYY-MM-DD') as meta,
            b.guest_name, b.guest_email, b.total_cents, b.currency, b.status, b.created_at,
            coalesce((b.price_breakdown->>'thirdPartyCommissionCents')::numeric, 0) as out_cents,
            coalesce((b.price_breakdown->>'thirdPartyCommissionPct')::numeric, 0) as out_pct,
            null::numeric as tour_pct, null::numeric as partner_pct, null::int as group_size,
            0 as coupon_cents, null::text as source
       from bookings b join listings l on l.id = b.listing_id
     union all
     select tb.id, tb.invoice_no, 'tour' as kind,
            t.title as what,
            to_char(tb.tour_date,'YYYY-MM-DD') || ' · ' || tb.group_size || ' people' as meta,
            tb.guest_name, tb.guest_email, tb.total_cents, tb.currency, tb.status, tb.created_at,
            0, 0, tb.commission_pct, tb.partner_pct, tb.group_size,
            coalesce(tb.coupon_discount_cents, 0), t.source
       from tour_bookings tb join tours t on t.id = tb.tour_id
      order by created_at desc limit 300`,
  );
  return res.rows.map((r) => {
    const tc = r.kind === "tour"
      ? tourCommissions({ totalCents: r.total_cents, couponDiscountCents: r.coupon_cents,
          commissionPct: r.tour_pct, partnerPct: r.partner_pct, groupSize: r.group_size, source: r.source })
      : null;
    return {
      id: r.id, invoiceNo: String(r.invoice_no ?? ""), kind: r.kind, what: r.what,
      meta: r.meta, guestName: r.guest_name, guestEmail: r.guest_email,
      totalCents: r.total_cents, currency: r.currency, status: r.status,
      createdAt: r.created_at,
      outCents: tc ? tc.outCents : Number(r.out_cents), outPct: tc ? tc.outPct : Number(r.out_pct),
      inCents: tc ? tc.inCents : 0, inPct: tc ? tc.inPct : null,
    };
  });
}

export default async function AdminInvoices({
  searchParams,
}: { searchParams: Promise<{ q?: string; tab?: string }> }) {
  const { q = "", tab: rawTab } = await searchParams;
  const tab = rawTab === "stays" || rawTab === "tours" ? rawTab : "all";
  const all = (await allInvoices()).filter((inv) =>
    rowMatches(q, inv.invoiceNo, inv.guestName, inv.guestEmail, inv.what));
  const counts = {
    all: all.length,
    stays: all.filter((i) => i.kind === "stay").length,
    tours: all.filter((i) => i.kind === "tour").length,
  };
  const invoices = tab === "all" ? all : all.filter((i) => (tab === "stays" ? i.kind === "stay" : i.kind === "tour"));
  // commission summary for what's on screen — cancelled bookings owe nothing;
  // peso (tour) amounts convert to USD at the site's rate so it adds up
  const fx = await getSetting("fx");
  const toUsd = (c: number, cur: string) => (cur === "MXN" ? Math.round(c / (fx.mxnPerUsd > 0 ? fx.mxnPerUsd : 17)) : c);
  const live = invoices.filter((i) => i.status !== "cancelled");
  const inUsd = live.reduce((s, i) => s + toUsd(i.inCents, i.currency), 0);
  const outUsd = live.reduce((s, i) => s + toUsd(i.outCents, i.currency), 0);
  const usd = (c: number) => fmtMoney(Math.abs(c), "USD");
  const TABS = [["all", `All (${counts.all})`], ["stays", `Stays (${counts.stays})`], ["tours", `Tours (${counts.tours})`]] as const;
  return (
    <div>
      <h1 className="mb-2 text-2xl font-extrabold">Invoices</h1>
      <p className="mb-5 text-sm text-grey">
        Every booking gets an invoice number and a shareable link — copy it and
        send it straight to the guest, exactly like the old site.
      </p>
      <div className="mb-3 flex flex-wrap gap-1.5">
        {TABS.map(([t, label]) => (
          <a key={t} href={`/admin/invoices?tab=${t}${q ? `&q=${encodeURIComponent(q)}` : ""}`}
            className={`rounded-pill border-[1.5px] px-4 py-1.5 text-sm font-bold ${
              tab === t ? "border-ink bg-ink text-white" : "border-line bg-paper hover:border-rosa hover:text-rosa"}`}>
            {label}
          </a>
        ))}
      </div>
      <AdminSearch placeholder="Search by invoice #, guest or home…" q={q} extra={{ tab }} />
      <div className="overflow-x-auto rounded-card bg-paper shadow-soft">
        <table className="w-full min-w-[860px] text-sm">
          <thead className="border-b border-line text-left text-xs uppercase text-grey">
            <tr>
              <th className="p-3">Invoice #</th><th className="p-3">Booking</th>
              <th className="p-3">Guest</th><th className="p-3">Total</th>
              <th className="p-3" title="Green = owed to TutCasa (Amanah tours). Red = TutCasa pays a third party.">Commission</th>
              <th className="p-3">Status</th><th className="p-3">Invoice link</th>
            </tr>
          </thead>
          <tbody>
            {invoices.map((inv) => (
              <tr key={inv.id} className="border-b border-line/60">
                <td className="p-3 font-mono font-bold">#{inv.invoiceNo}
                  <div className="text-[10px] font-normal uppercase text-grey">{inv.kind}</div>
                </td>
                <td className="p-3 font-semibold">{inv.what}
                  <div className="text-xs font-normal text-grey">{inv.meta}</div>
                </td>
                <td className="p-3">{inv.guestName}
                  <div className="text-xs text-grey">{inv.guestEmail}</div>
                </td>
                <td className="p-3 font-bold">{fmtMoney(inv.totalCents, inv.currency === "MXN" ? "MXN" : "USD")} {inv.currency}</td>
                <td className="p-3 font-bold">
                  {inv.inCents > 0 && (
                    <div className="text-cactus">+{fmtMoney(inv.inCents, inv.currency === "MXN" ? "MXN" : "USD")} · {inv.inPct}%
                      <span className="block text-xs font-semibold">owed to TutCasa</span></div>
                  )}
                  {inv.outCents > 0 && (
                    <div className="text-rosa-deep">&minus;{fmtMoney(inv.outCents, inv.currency === "MXN" ? "MXN" : "USD")} · {inv.outPct}%
                      <span className="block text-xs font-semibold">TutCasa pays</span></div>
                  )}
                  {inv.inCents <= 0 && inv.outCents <= 0 && <span className="text-grey">—</span>}
                </td>
                <td className="p-3">
                  <span className={`rounded-pill px-2.5 py-1 text-xs font-bold ${BADGE[inv.status] ?? ""}`}>{inv.status}</span>
                </td>
                <td className="p-3">
                  <div className="flex items-center gap-3">
                    <CopyLink bookingId={inv.id} />
                    <DeleteBookingButton id={inv.id} kind={inv.kind} compact
                      what={`invoice #${inv.invoiceNo} and its ${inv.kind} booking`} />
                  </div>
                </td>
              </tr>
            ))}
            {invoices.length === 0 && (
              <tr><td colSpan={7} className="p-8 text-center text-grey">No bookings yet — invoices appear here automatically.</td></tr>
            )}
          </tbody>
          {(inUsd > 0 || outUsd > 0) && (
            <tfoot className="border-t-2 border-line text-sm">
              <tr>
                <td colSpan={7} className="p-3">
                  <div className="flex flex-wrap items-center gap-x-6 gap-y-1 font-bold">
                    <span className="text-xs uppercase text-grey">Commissions shown (excl. cancelled)</span>
                    <span className="text-cactus">Owed to TutCasa +{usd(inUsd)}</span>
                    <span className="text-rosa-deep">TutCasa pays &minus;{usd(outUsd)}</span>
                    <span className={inUsd - outUsd >= 0 ? "text-cactus" : "text-rosa-deep"}>
                      Net {inUsd - outUsd >= 0 ? "+" : "−"}{usd(inUsd - outUsd)}
                    </span>
                    {invoices.some((i) => i.currency === "MXN") && (
                      <span className="text-[11px] font-normal text-grey">peso amounts at {fx.mxnPerUsd} MXN/USD</span>
                    )}
                  </div>
                </td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </div>
  );
}
