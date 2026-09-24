import "server-only";
import { payableForInvoice } from "@/lib/stripe";

/**
 * PayPal Checkout (Orders v2, REST — no SDK), alongside Stripe. Same
 * shape as the Stripe hosted page: we create an order for exactly what
 * the invoice says is due, the guest approves on PayPal, and on return
 * OUR server captures it. Amount, currency and invoice id are read back
 * from PayPal's capture response — never from the browser.
 * PAYPAL_ENV=live switches from the sandbox.
 */

const API = process.env.PAYPAL_ENV === "live"
  ? "https://api-m.paypal.com"
  : "https://api-m.sandbox.paypal.com";
const SITE = process.env.SITE_URL ?? "https://tutcasa-platform.vercel.app";

export function paypalConfigured(): boolean {
  return !!(process.env.PAYPAL_CLIENT_ID && process.env.PAYPAL_CLIENT_SECRET);
}

async function token(): Promise<string> {
  const basic = Buffer.from(`${process.env.PAYPAL_CLIENT_ID}:${process.env.PAYPAL_CLIENT_SECRET}`).toString("base64");
  const res = await fetch(`${API}/v1/oauth2/token`, {
    method: "POST",
    headers: { Authorization: `Basic ${basic}`, "Content-Type": "application/x-www-form-urlencoded" },
    body: "grant_type=client_credentials",
    signal: AbortSignal.timeout(15_000),
  });
  if (!res.ok) throw new Error(`PayPal auth ${res.status}`);
  return ((await res.json()) as { access_token: string }).access_token;
}

async function pp(path: string, init: RequestInit = {}): Promise<Record<string, unknown>> {
  const res = await fetch(`${API}${path}`, {
    ...init,
    headers: { Authorization: `Bearer ${await token()}`, "Content-Type": "application/json", ...init.headers },
    signal: AbortSignal.timeout(20_000),
  });
  const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  if (!res.ok) {
    const issue = (data.details as { issue?: string }[] | undefined)?.[0]?.issue;
    throw Object.assign(new Error(issue ?? `PayPal ${res.status}`), { issue });
  }
  return data;
}

/** Create a PayPal order → approval URL. `kind` + `customId` travel with
    the order and come back on capture to say what was paid for. */
async function createOrder(o: {
  kind: "stay" | "tour" | "gift" | "extra";
  customId: string;
  label: string;
  currency: string;
  cents: number;
  cancelUrl: string;
}): Promise<{ url: string } | { error: string }> {
  try {
    const order = await pp("/v2/checkout/orders", {
      method: "POST",
      body: JSON.stringify({
        intent: "CAPTURE",
        purchase_units: [{
          reference_id: o.kind,
          custom_id: o.customId,
          description: o.label.slice(0, 127),
          amount: { currency_code: o.currency, value: (o.cents / 100).toFixed(2) },
        }],
        payment_source: {
          paypal: {
            experience_context: {
              brand_name: "TutCasa",
              user_action: "PAY_NOW",
              shipping_preference: "NO_SHIPPING",
              return_url: `${SITE}/api/paypal/return`,
              cancel_url: o.cancelUrl,
            },
          },
        },
      }),
    });
    const link = (order.links as { rel: string; href: string }[] | undefined)
      ?.find((l) => l.rel === "payer-action" || l.rel === "approve");
    return link ? { url: link.href } : { error: "PayPal didn't return an approval link." };
  } catch (e) {
    console.error("paypal create:", e);
    return { error: "Couldn't start PayPal — try again in a moment, or pay by card." };
  }
}

/** Stay / tour invoice: whatever is currently due. */
export async function createPayPalOrder(invoiceId: string): Promise<{ url: string } | { error: string }> {
  if (!paypalConfigured()) return { error: "PayPal isn't switched on yet." };
  const inv = await payableForInvoice(invoiceId);
  if (!inv) return { error: "Nothing is due on this invoice." };
  return createOrder({ kind: inv.kind, customId: inv.id, label: inv.label, currency: inv.currency,
    cents: inv.dueCents, cancelUrl: `${SITE}/invoice/${inv.id}` });
}

/** Gift card purchase — details parked in pending_paypal until capture. */
export async function createPayPalGiftOrder(g: {
  amountUSD: number; buyerEmail: string; recipientEmail?: string; message?: string;
}): Promise<{ url: string } | { error: string }> {
  if (!paypalConfigured()) return { error: "PayPal isn't switched on yet." };
  const amount = Math.round(g.amountUSD);
  if (!(amount >= 25 && amount <= 5000)) return { error: "Pick an amount between $25 and $5,000." };
  const { getDb } = await import("@/lib/db");
  const row = await getDb().query<{ id: string }>(
    "insert into pending_paypal (kind, data) values ('gift', $1) returning id",
    [JSON.stringify({ buyerEmail: g.buyerEmail, recipientEmail: g.recipientEmail ?? null, message: g.message ?? null })]);
  return createOrder({ kind: "gift", customId: row.rows[0].id, label: `TutCasa gift card — $${amount}`,
    currency: "USD", cents: amount * 100, cancelUrl: `${SITE}/gift-cards` });
}

/** Confirmed early check-in / late check-out. */
export async function createPayPalExtraOrder(extraId: string): Promise<{ url: string } | { error: string }> {
  if (!paypalConfigured()) return { error: "PayPal isn't switched on yet." };
  const { getExtra, EXTRA_LABEL } = await import("@/modules/extras");
  const e = await getExtra(extraId);
  if (!e || e.status !== "confirmed") return { error: "This option isn't payable (or is already paid)." };
  return createOrder({ kind: "extra", customId: extraId,
    label: `${EXTRA_LABEL[e.kind as "early_checkin" | "late_checkout"]} — ${e.title}`,
    currency: String(e.currency ?? "USD"), cents: Number(e.fee_cents), cancelUrl: `${SITE}/extra/${extraId}` });
}

export interface PayPalCapture {
  kind: "stay" | "tour" | "gift" | "extra";
  /** booking id (stay/tour), extra id, or pending_paypal id (gift) */
  customId: string;
  paidCents: number;
  ref: string;         // the capture id
  feeCents: number | null;
}

/** Capture an approved order (idempotent: an already-captured order is
    read back instead). Everything returned comes from PayPal. */
export async function capturePayPalOrder(orderId: string): Promise<PayPalCapture | null> {
  if (!paypalConfigured() || !/^[A-Z0-9]{6,40}$/.test(orderId)) return null;
  let order: Record<string, unknown>;
  try {
    order = await pp(`/v2/checkout/orders/${orderId}/capture`, { method: "POST", body: "{}" });
  } catch (e) {
    if ((e as { issue?: string }).issue !== "ORDER_ALREADY_CAPTURED") {
      console.error("paypal capture:", e);
      return null;
    }
    order = await pp(`/v2/checkout/orders/${orderId}`);
  }
  const unit = (order.purchase_units as Record<string, unknown>[] | undefined)?.[0];
  const cap = ((unit?.payments as { captures?: Record<string, unknown>[] } | undefined)?.captures ?? [])
    .find((c) => c.status === "COMPLETED");
  if (!unit || !cap) return null;
  const kind = String(unit.reference_id);
  if (!["stay", "tour", "gift", "extra"].includes(kind)) return null;
  const amount = cap.amount as { value: string };
  const fee = (cap.seller_receivable_breakdown as { paypal_fee?: { value: string } } | undefined)?.paypal_fee?.value;
  return {
    kind: kind as PayPalCapture["kind"],
    customId: String(cap.custom_id ?? unit.custom_id ?? ""),
    paidCents: Math.round(Number(amount.value) * 100),
    ref: String(cap.id),
    feeCents: fee != null ? Math.round(Number(fee) * 100) : null,
  };
}
