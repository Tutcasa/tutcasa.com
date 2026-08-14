import { getDb } from "@/lib/db";
import { fmtMoney } from "@/modules/pricing";

export const dynamic = "force-dynamic";

interface OrderRow {
  id: string;
  invoiceNo: string;
  what: string;
  meta: string;
  guestName: string;
  status: string;
  currency: string;
  totalCents: number;
  breakdown: Record<string, number | string | null>;
  couponCode: string | null;
  couponDiscountCents: number;
  provider: string | null;
  createdAt: string;
}

async function allOrders(): Promise<OrderRow[]> {
  const res = await getDb().query(
    `select b.id, b.invoice_no, b.status, b.total_cents, b.currency,
            b.price_breakdown, b.coupon_code, b.coupon_discount_cents,
            b.payment_provider, b.created_at, b.guest_name, b.guests,
            to_char(lower(b.stay),'YYYY-MM-DD') || ' → ' || to_char(upper(b.stay),'YYYY-MM-DD') as dates,
            l.title, l.city
       from bookings b join listings l on l.id = b.listing_id
      where b.status <> 'cancelled'
      order by b.created_at desc limit 200`,
  );
  return res.rows.map((r) => ({
    id: r.id, invoiceNo: String(r.invoice_no ?? ""),
    what: `${r.title} — ${r.city}`,
    meta: `${r.dates} · ${r.guests} guests`,
    guestName: r.guest_name, status: r.status, currency: r.currency,
    totalCents: r.total_cents, breakdown: r.price_breakdown ?? {},
    couponCode: r.coupon_code, couponDiscountCents: r.coupon_discount_cents ?? 0,
    provider: r.payment_provider, createdAt: r.created_at,
  }));
}

const LINES: [string, string][] = [
  ["accommodationCents", "Accommodation"],
  ["lengthDiscountCents", "Stay discount"],
  ["earlyBirdDiscountCents", "Early bird"],
  ["extraGuestFeeCents", "Extra guests"],
  ["cleaningCents", "Cleaning"],
  ["cityFeeCents", "City fee"],
  ["taxCents", "Taxes"],
];

export default async function AdminOrders() {
  const orders = await allOrders();
  return (
    <div>
      <h1 className="mb-2 text-2xl font-extrabold">Payments &amp; orders</h1>
      <p className="mb-5 text-sm text-grey">
        The full financial breakdown behind every booking — what the old site
        kept under WooCommerce → Orders. Real card payments switch on with
        Stripe at the payments milestone.
      </p>
      <div className="grid gap-3">
        {orders.map((o) => {
          const isDiscount = (k: string) => k.includes("Discount") || k.includes("length");
          return (
            <details key={o.id} className="rounded-card bg-paper p-4 shadow-soft">
              <summary className="flex cursor-pointer flex-wrap items-center justify-between gap-2">
                <div>
                  <span className="font-mono text-xs font-bold">#{o.invoiceNo}</span>{" "}
                  <b>{o.what}</b>
                  <span className="ml-2 text-xs text-grey">{o.meta} · {o.guestName}</span>
                </div>
                <div className="flex items-center gap-2">
                  <b>{fmtMoney(o.totalCents)}</b>
                  <span className={`rounded-pill px-2.5 py-1 text-xs font-bold ${o.status === "confirmed" || o.status === "completed" ? "bg-cactus/15 text-cactus" : "bg-sol/15 text-terra"}`}>
                    {o.status}
                  </span>
                </div>
              </summary>
              <div className="mt-3 grid gap-1 border-t border-line pt-3 text-sm sm:max-w-[420px]">
                {LINES.map(([key, label]) => {
                  const v = Number(o.breakdown[key] ?? 0);
                  if (!v) return null;
                  const neg = isDiscount(key);
                  return (
                    <div key={key} className="flex justify-between">
                      <span>{label}</span>
                      <span className={neg ? "font-semibold text-cactus" : ""}>{neg ? "−" : ""}{fmtMoney(v)}</span>
                    </div>
                  );
                })}
                {o.couponCode && (
                  <div className="flex justify-between font-semibold text-cactus">
                    <span>Coupon {o.couponCode}</span><span>−{fmtMoney(o.couponDiscountCents)}</span>
                  </div>
                )}
                <div className="flex justify-between border-t border-line pt-1 font-extrabold">
                  <span>Total</span><span>{fmtMoney(o.totalCents)}</span>
                </div>
                {Number(o.breakdown.balanceCents ?? 0) > 0 && (
                  <div className="flex justify-between text-xs text-grey">
                    <span>Deposit {fmtMoney(Number(o.breakdown.dueNowCents ?? 0))} · balance {fmtMoney(Number(o.breakdown.balanceCents ?? 0))}
                      {o.breakdown.balanceDueDate ? ` due ${String(o.breakdown.balanceDueDate).slice(0, 10)}` : ""}</span>
                  </div>
                )}
                <div className="text-xs text-grey">
                  Payment: {o.provider ?? "not charged yet (preview checkout)"} · {new Date(o.createdAt).toLocaleString()}
                </div>
              </div>
            </details>
          );
        })}
        {orders.length === 0 && (
          <div className="rounded-card bg-paper p-8 text-center text-grey shadow-soft">No orders yet.</div>
        )}
      </div>
    </div>
  );
}
