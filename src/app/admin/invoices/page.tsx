import { getDb } from "@/lib/db";
import { fmtMoney } from "@/modules/pricing";
import { CopyLink } from "./copy-link";

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
            b.guest_name, b.guest_email, b.total_cents, b.currency, b.status, b.created_at
       from bookings b join listings l on l.id = b.listing_id
     union all
     select tb.id, tb.invoice_no, 'tour' as kind,
            t.title as what,
            to_char(tb.tour_date,'YYYY-MM-DD') || ' · ' || tb.group_size || ' people' as meta,
            tb.guest_name, tb.guest_email, tb.total_cents, tb.currency, tb.status, tb.created_at
       from tour_bookings tb join tours t on t.id = tb.tour_id
      order by created_at desc limit 300`,
  );
  return res.rows.map((r) => ({
    id: r.id, invoiceNo: String(r.invoice_no ?? ""), kind: r.kind, what: r.what,
    meta: r.meta, guestName: r.guest_name, guestEmail: r.guest_email,
    totalCents: r.total_cents, currency: r.currency, status: r.status,
    createdAt: r.created_at,
  }));
}

export default async function AdminInvoices() {
  const invoices = await allInvoices();
  return (
    <div>
      <h1 className="mb-2 text-2xl font-extrabold">Invoices</h1>
      <p className="mb-5 text-sm text-grey">
        Every booking gets an invoice number and a shareable link — copy it and
        send it straight to the guest, exactly like the old site.
      </p>
      <div className="overflow-x-auto rounded-card bg-paper shadow-soft">
        <table className="w-full min-w-[860px] text-sm">
          <thead className="border-b border-line text-left text-xs uppercase text-grey">
            <tr>
              <th className="p-3">Invoice #</th><th className="p-3">Booking</th>
              <th className="p-3">Guest</th><th className="p-3">Total</th>
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
                <td className="p-3">
                  <span className={`rounded-pill px-2.5 py-1 text-xs font-bold ${BADGE[inv.status] ?? ""}`}>{inv.status}</span>
                </td>
                <td className="p-3"><CopyLink bookingId={inv.id} /></td>
              </tr>
            ))}
            {invoices.length === 0 && (
              <tr><td colSpan={6} className="p-8 text-center text-grey">No bookings yet — invoices appear here automatically.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
