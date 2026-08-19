import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getDb } from "@/lib/db";
import { fmtMoney } from "@/modules/pricing";
import { InvoiceActions } from "./invoice-actions";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: { absolute: "TutCasa — Invoice" },
  robots: { index: false, follow: false },
};

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

interface InvoiceData {
  invoiceNo: string;
  createdAt: string;
  status: string;
  guestName: string;
  guestEmail: string;
  title: string;
  meta: string;
  lines: { label: string; cents: number }[];
  couponCode: string | null;
  couponDiscountCents: number;
  totalCents: number;
  currency: string;
  dueNowCents: number | null;
  balanceCents: number | null;
  balanceDueDate: string | null;
  securityDepositCents: number;
}

async function loadInvoice(id: string): Promise<InvoiceData | null> {
  if (!UUID.test(id)) return null;
  const db = getDb();

  const stay = await db.query(
    `select b.invoice_no, b.created_at, b.status, b.guest_name, b.guest_email,
            b.guests, b.total_cents, b.currency, b.price_breakdown,
            b.coupon_code, b.coupon_discount_cents,
            to_char(lower(b.stay),'YYYY-MM-DD') as check_in,
            to_char(upper(b.stay),'YYYY-MM-DD') as check_out,
            l.title, l.city
       from bookings b join listings l on l.id = b.listing_id
      where b.id = $1`,
    [id],
  );
  if (stay.rows[0]) {
    const b = stay.rows[0];
    const p = b.price_breakdown ?? {};
    const lines: { label: string; cents: number }[] = [
      { label: `Accommodation — ${p.nights ?? "?"} nights`, cents: p.accommodationCents ?? 0 },
    ];
    if (p.lengthDiscountCents > 0) lines.push({ label: "Length-of-stay discount", cents: -p.lengthDiscountCents });
    if (p.earlyBirdDiscountCents > 0) lines.push({ label: "Early-bird discount", cents: -p.earlyBirdDiscountCents });
    if (p.extraGuestFeeCents > 0) lines.push({ label: "Extra guests", cents: p.extraGuestFeeCents });
    if (p.cleaningCents > 0) lines.push({ label: "Cleaning fee", cents: p.cleaningCents });
    if (p.cityFeeCents > 0) lines.push({ label: "City fee", cents: p.cityFeeCents });
    if (p.taxCents > 0) lines.push({ label: "Taxes", cents: p.taxCents });
    return {
      invoiceNo: String(b.invoice_no ?? ""), createdAt: b.created_at, status: b.status,
      guestName: b.guest_name, guestEmail: b.guest_email,
      title: `${b.title} — ${b.city}`,
      meta: `${b.check_in} → ${b.check_out} · ${b.guests} guests`,
      lines,
      couponCode: b.coupon_code, couponDiscountCents: b.coupon_discount_cents ?? 0,
      totalCents: b.total_cents, currency: b.currency,
      // derive the balance from the REAL total so old bookings whose stored
      // schedule predates the coupon fix still show correct numbers
      dueNowCents: p.dueNowCents != null ? Math.min(p.dueNowCents, b.total_cents) : null,
      balanceCents: p.dueNowCents != null
        ? Math.max(0, b.total_cents - Math.min(p.dueNowCents, b.total_cents))
        : (p.balanceCents ?? null),
      balanceDueDate: p.balanceDueDate ? String(p.balanceDueDate).slice(0, 10) : null,
      securityDepositCents: p.securityDepositCents ?? 0,
    };
  }

  const tour = await db.query(
    `select tb.invoice_no, tb.created_at, tb.status, tb.guest_name, tb.guest_email,
            tb.group_size, tb.total_cents, tb.currency,
            to_char(tb.tour_date,'YYYY-MM-DD') as tour_date,
            tb.coupon_code, tb.coupon_discount_cents, t.title
       from tour_bookings tb join tours t on t.id = tb.tour_id
      where tb.id = $1`,
    [id],
  );
  if (tour.rows[0]) {
    const b = tour.rows[0];
    return {
      invoiceNo: String(b.invoice_no ?? ""), createdAt: b.created_at, status: b.status,
      guestName: b.guest_name, guestEmail: b.guest_email,
      title: b.title, meta: `${b.tour_date} · ${b.group_size} people`,
      lines: [{ label: "Tour booking", cents: b.total_cents }],
      couponCode: b.coupon_code, couponDiscountCents: b.coupon_discount_cents ?? 0,
      totalCents: b.total_cents, currency: b.currency,
      dueNowCents: null, balanceCents: null, balanceDueDate: null,
      securityDepositCents: 0,
    };
  }
  return null;
}

const BADGE: Record<string, string> = {
  pending: "bg-sol/15 text-terra",
  confirmed: "bg-cactus/15 text-cactus",
  paid: "bg-cactus/15 text-cactus",
  partner_confirmed: "bg-cielo/15 text-cielo",
  completed: "bg-cielo/15 text-cielo",
  cancelled: "bg-grey/15 text-grey",
};

export default async function InvoicePage({
  params,
}: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const inv = await loadInvoice(id);
  if (!inv) notFound();

  const money = (c: number) => fmtMoney(Math.abs(c), inv.currency === "MXN" ? "MXN" : "USD");

  return (
    <div className="mx-auto max-w-[680px] px-4 py-10 print:py-2">
      <div className="rounded-card bg-paper p-8 shadow-soft print:shadow-none">
        <div className="mb-6 flex items-start justify-between">
          <div>
            <div className="font-display text-2xl font-extrabold text-rosa">TutCasa</div>
            <div className="text-xs text-grey">Asking in your own house</div>
          </div>
          <div className="text-right">
            <div className="text-xs font-bold uppercase tracking-wide text-grey">Invoice</div>
            <div className="font-mono text-lg font-extrabold">#{inv.invoiceNo}</div>
            <div className="text-xs text-grey">{new Date(inv.createdAt).toLocaleDateString()}</div>
          </div>
        </div>

        <div className="mb-6 grid gap-4 sm:grid-cols-2">
          <div>
            <div className="text-[11px] font-extrabold uppercase tracking-wider text-grey">Billed to</div>
            <div className="font-bold">{inv.guestName}</div>
            <div className="text-sm text-grey">{inv.guestEmail}</div>
          </div>
          <div>
            <div className="text-[11px] font-extrabold uppercase tracking-wider text-grey">Status</div>
            <span className={`rounded-pill px-2.5 py-1 text-xs font-bold ${BADGE[inv.status] ?? ""}`}>{inv.status}</span>
          </div>
        </div>

        <div className="mb-1 font-bold">{inv.title}</div>
        <div className="mb-4 text-sm text-grey">{inv.meta}</div>

        <div className="border-t border-line">
          {inv.lines.map((l, i) => (
            <div key={i} className="flex justify-between border-b border-line/60 py-2 text-sm">
              <span>{l.label}</span>
              <span className={l.cents < 0 ? "font-semibold text-cactus" : ""}>
                {l.cents < 0 ? "−" : ""}{money(l.cents)}
              </span>
            </div>
          ))}
          {inv.couponCode && (
            <div className="flex justify-between border-b border-line/60 py-2 text-sm font-semibold text-cactus">
              <span>Coupon {inv.couponCode}</span>
              <span>−{money(inv.couponDiscountCents)}</span>
            </div>
          )}
          <div className="flex justify-between py-3 text-lg font-extrabold">
            <span>Total</span><span>{money(inv.totalCents)} {inv.currency}</span>
          </div>
        </div>

        {inv.balanceCents != null && inv.balanceCents > 0 && (
          <div className="mt-2 rounded-xl bg-crema p-3 text-sm">
            <div className="flex justify-between font-bold text-cactus">
              <span>Due at booking</span><span>{money(inv.dueNowCents ?? 0)}</span>
            </div>
            <div className="flex justify-between">
              <span>Balance{inv.balanceDueDate ? ` — due by ${inv.balanceDueDate}` : ""}</span>
              <span>{money(inv.balanceCents)}</span>
            </div>
          </div>
        )}
        {inv.securityDepositCents > 0 && (
          <p className="mt-3 text-xs text-grey">
            A security deposit of {money(inv.securityDepositCents)} applies.
          </p>
        )}

        <p className="mt-6 text-xs text-grey">
          Questions about this invoice? Contact us on WhatsApp — we&rsquo;re at your service 24/7.
        </p>

        <InvoiceActions bookingId={id} defaultEmail={inv.guestEmail} />
      </div>
    </div>
  );
}
