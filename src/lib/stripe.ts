import "server-only";
import { getDb } from "@/lib/db";

/**
 * Stripe Checkout via the REST API (no SDK): the guest is sent to
 * Stripe's hosted payment page; the webhook records the payment.
 * Sessions are created per INVOICE (a stay or tour booking) for
 * whatever is currently due — first payment, balance, or full amount.
 */

const API = "https://api.stripe.com/v1";
const SITE = process.env.SITE_URL ?? "https://tutcasa-platform.vercel.app";

export function stripeConfigured(): boolean {
  return !!process.env.STRIPE_SECRET_KEY;
}

async function stripePost(path: string, params: Record<string, string>): Promise<Record<string, unknown>> {
  const res = await fetch(`${API}${path}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.STRIPE_SECRET_KEY}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams(params),
    signal: AbortSignal.timeout(20_000),
  });
  const data = (await res.json()) as Record<string, unknown> & { error?: { message?: string } };
  if (!res.ok) throw new Error(data.error?.message ?? `Stripe ${res.status}`);
  return data;
}

export interface PayableInvoice {
  kind: "stay" | "tour";
  id: string;
  label: string;
  currency: "USD" | "MXN";
  dueCents: number;      // what THIS session collects
  guestEmail: string;
}

/** What is currently payable on an invoice (stay or tour booking). */
export async function payableForInvoice(id: string): Promise<PayableInvoice | null> {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
  const db = getDb();
  const stay = await db.query(
    `select b.id, b.status, b.total_cents, b.currency,
            coalesce(b.amount_paid_cents,0) as paid, b.guest_email,
            b.price_breakdown, l.title
       from bookings b join listings l on l.id = b.listing_id where b.id=$1`, [id]);
  if (stay.rows[0]) {
    const b = stay.rows[0];
    if (b.status === "cancelled") return null;
    const p = b.price_breakdown ?? {};
    // first payment on an unpaid booking = the dueNow split; afterwards
    // whatever remains of the total
    const remaining = Math.max(0, b.total_cents - b.paid);
    const firstDue = p.dueNowCents != null ? Math.min(Number(p.dueNowCents), remaining) : remaining;
    const dueCents = b.paid === 0 ? firstDue : remaining;
    if (dueCents <= 0) return null;
    return {
      kind: "stay", id: b.id, label: `TutCasa stay — ${b.title}`,
      currency: b.currency === "MXN" ? "MXN" : "USD",
      dueCents, guestEmail: b.guest_email,
    };
  }
  const tour = await db.query(
    `select tb.id, tb.status, tb.total_cents, tb.currency,
            coalesce(tb.amount_paid_cents,0) as paid, tb.guest_email, t.title
       from tour_bookings tb join tours t on t.id = tb.tour_id where tb.id=$1`, [id]);
  if (tour.rows[0]) {
    const b = tour.rows[0];
    if (b.status === "cancelled") return null;
    const dueCents = Math.max(0, b.total_cents - b.paid);
    if (dueCents <= 0) return null;
    return {
      kind: "tour", id: b.id, label: `TutCasa tour — ${b.title}`,
      currency: b.currency === "MXN" ? "MXN" : "USD",
      dueCents, guestEmail: b.guest_email,
    };
  }
  return null;
}

/** Hosted checkout session for the invoice's current amount due. */
export async function createInvoiceCheckoutSession(id: string): Promise<{ url: string } | { error: string }> {
  if (!stripeConfigured()) return { error: "Payments aren't switched on yet." };
  const inv = await payableForInvoice(id);
  if (!inv) return { error: "Nothing is due on this invoice." };
  try {
    const session = await stripePost("/checkout/sessions", {
      mode: "payment",
      "line_items[0][price_data][currency]": inv.currency.toLowerCase(),
      "line_items[0][price_data][product_data][name]": inv.label,
      "line_items[0][price_data][unit_amount]": String(inv.dueCents),
      "line_items[0][quantity]": "1",
      customer_email: inv.guestEmail,
      success_url: `${SITE}/invoice/${inv.id}?paid=1`,
      cancel_url: `${SITE}/invoice/${inv.id}`,
      "metadata[kind]": inv.kind,
      "metadata[invoiceId]": inv.id,
    });
    return { url: String(session.url) };
  } catch (e) {
    console.error("stripe session:", e);
    return { error: "Couldn't start the payment — try again in a moment." };
  }
}
