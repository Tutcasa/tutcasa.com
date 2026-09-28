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

/**
 * Exact Stripe fee (in cents) for a payment-intent id, from the charge's
 * balance transaction. Returns null when it can't be determined (non-pi
 * ref, API error, transaction not settled yet) — callers fall back to
 * the 2.9% + 30¢ estimate.
 */
export async function stripeFeeForPaymentRef(ref: string): Promise<number | null> {
  if (!ref.startsWith("pi_") || !stripeConfigured()) return null;
  try {
    const res = await fetch(
      `${API}/payment_intents/${ref}?expand[]=latest_charge.balance_transaction`,
      {
        headers: { Authorization: `Bearer ${process.env.STRIPE_SECRET_KEY}` },
        signal: AbortSignal.timeout(15_000),
      },
    );
    if (!res.ok) return null;
    const pi = (await res.json()) as {
      latest_charge?: { balance_transaction?: { fee?: number } };
    };
    const fee = pi.latest_charge?.balance_transaction?.fee;
    return typeof fee === "number" && fee >= 0 ? fee : null;
  } catch {
    return null;
  }
}

/** Hosted checkout for a GIFT CARD purchase — the card itself is created
    by the webhook once the payment lands (kind 'gift' in the metadata). */
export async function createGiftCheckoutSession(input: {
  amountUSD: number;
  buyerEmail: string;
  recipientEmail?: string;
  message?: string;
}): Promise<{ url: string } | { error: string }> {
  if (!stripeConfigured()) return { error: "Payments aren't switched on yet." };
  const amount = Math.round(input.amountUSD);
  if (!(amount >= 25 && amount <= 5000)) return { error: "Pick an amount between $25 and $5,000." };
  try {
    const session = await stripePost("/checkout/sessions", {
      mode: "payment",
      "line_items[0][price_data][currency]": "usd",
      "line_items[0][price_data][product_data][name]": `TutCasa gift card — $${amount}`,
      "line_items[0][price_data][unit_amount]": String(amount * 100),
      "line_items[0][quantity]": "1",
      customer_email: input.buyerEmail,
      success_url: `${SITE}/gift-cards?paid=1`,
      cancel_url: `${SITE}/gift-cards`,
      "metadata[kind]": "gift",
      "metadata[amountUSD]": String(amount),
      "metadata[buyerEmail]": input.buyerEmail.slice(0, 200),
      "metadata[recipientEmail]": (input.recipientEmail ?? "").slice(0, 200),
      "metadata[message]": (input.message ?? "").slice(0, 450),
    });
    return { url: String(session.url) };
  } catch (e) {
    console.error("stripe gift session:", e);
    return { error: "Couldn't start the payment — try again in a moment." };
  }
}

export interface PayableInvoice {
  kind: "stay" | "tour";
  id: string;
  label: string;
  currency: "USD" | "MXN";
  dueCents: number;      // what THIS session collects
  guestEmail: string;
}

/** Round a cents amount to a whole currency unit. Every guest-facing total
    is shown with `money()` (0 decimal places, i.e. Math.round), so charging
    the same rounded figure keeps "the price you see is the price you pay"
    literally true — no $851.80-vs-$852 mismatch between the page and the card. */
const roundToUnit = (cents: number) => Math.round(cents / 100) * 100;

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
    const raw = b.paid === 0 ? firstDue : remaining;
    // imported old-site bookings carry cents (16% tax) — charge them exactly
    const dueCents = p.legacy ? raw : roundToUnit(raw);
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
    const dueCents = roundToUnit(Math.max(0, b.total_cents - b.paid));
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

/** PaymentIntent for the embedded Payment Element (same amount logic as
    the hosted session). Returns the client secret + which mode the
    server key is in, so the client can verify the publishable key
    matches before mounting the form. */
export async function createInvoicePaymentIntent(
  id: string,
): Promise<{ clientSecret: string; mode: "test" | "live"; amountCents: number; currency: string } | { error: string }> {
  if (!stripeConfigured()) return { error: "Payments aren't switched on yet." };
  const inv = await payableForInvoice(id);
  if (!inv) return { error: "Nothing is due on this invoice." };
  try {
    const pi = await stripePost("/payment_intents", {
      amount: String(inv.dueCents),
      currency: inv.currency.toLowerCase(),
      "automatic_payment_methods[enabled]": "true",
      receipt_email: inv.guestEmail,
      description: inv.label,
      "metadata[kind]": inv.kind,
      "metadata[invoiceId]": inv.id,
    });
    return {
      clientSecret: String(pi.client_secret),
      mode: process.env.STRIPE_SECRET_KEY!.startsWith("sk_test") ? "test" : "live",
      amountCents: inv.dueCents,
      currency: inv.currency,
    };
  } catch (e) {
    console.error("stripe payment_intent:", e);
    return { error: "Couldn't start the payment — try again in a moment." };
  }
}

/** Hosted checkout for a CONFIRMED early check-in / late check-out. */
export async function createExtraCheckoutSession(
  extraId: string,
): Promise<{ url: string } | { error: string }> {
  if (!stripeConfigured()) return { error: "Payments aren't switched on yet." };
  const { getExtra, EXTRA_LABEL } = await import("@/modules/extras");
  const e = await getExtra(extraId);
  if (!e || e.status !== "confirmed") return { error: "This option isn't payable (or is already paid)." };
  try {
    const session = await stripePost("/checkout/sessions", {
      mode: "payment",
      "line_items[0][price_data][currency]": String(e.currency ?? "USD").toLowerCase(),
      "line_items[0][price_data][product_data][name]":
        `${EXTRA_LABEL[e.kind as "early_checkin" | "late_checkout"]} — ${e.title}`,
      "line_items[0][price_data][unit_amount]": String(e.fee_cents),
      "line_items[0][quantity]": "1",
      customer_email: e.guest_email,
      success_url: `${SITE}/extra/${extraId}?paid=1`,
      cancel_url: `${SITE}/extra/${extraId}`,
      "metadata[kind]": "extra",
      "metadata[extraId]": extraId,
    });
    return { url: String(session.url) };
  } catch (err) {
    console.error("stripe extra session:", err);
    return { error: "Couldn't start the payment — try again in a moment." };
  }
}
