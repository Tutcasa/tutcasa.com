import { NextRequest, NextResponse } from "next/server";
import { createHmac, timingSafeEqual } from "node:crypto";

export const dynamic = "force-dynamic";

/**
 * Stripe webhook: records completed Checkout payments on the booking or
 * tour booking, confirms pending stays, and fires the receipt emails.
 * Signature is verified manually (HMAC-SHA256 over `t.payload`).
 */

function verify(payload: string, header: string | null, secret: string): boolean {
  if (!header) return false;
  const parts = Object.fromEntries(header.split(",").map((p) => p.split("=", 2) as [string, string]));
  const t = parts.t;
  const v1 = parts.v1;
  if (!t || !v1) return false;
  if (Math.abs(Date.now() / 1000 - Number(t)) > 600) return false; // 10-min tolerance
  const expected = createHmac("sha256", secret).update(`${t}.${payload}`).digest("hex");
  const a = Buffer.from(expected);
  const b = Buffer.from(v1);
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function POST(req: NextRequest) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) return NextResponse.json({ error: "not configured" }, { status: 503 });
  const payload = await req.text();
  if (!verify(payload, req.headers.get("stripe-signature"), secret)) {
    return NextResponse.json({ error: "bad signature" }, { status: 400 });
  }

  const event = JSON.parse(payload) as {
    type: string;
    data: { object: { id: string; amount_total?: number; payment_intent?: string;
      metadata?: { kind?: string; invoiceId?: string } } };
  };
  const isSession = event.type === "checkout.session.completed";
  const isIntent = event.type === "payment_intent.succeeded";
  if (!isSession && !isIntent) {
    return NextResponse.json({ received: true });
  }

  const s = event.data.object as { id: string; amount_total?: number; amount_received?: number;
    payment_intent?: string; metadata?: { kind?: string; invoiceId?: string; extraId?: string;
      amountUSD?: string; buyerEmail?: string; recipientEmail?: string; message?: string } };
  const kind = s.metadata?.kind;
  const id = s.metadata?.invoiceId ?? "";
  const paidCents = Number(isSession ? (s.amount_total ?? 0) : (s.amount_received ?? 0));
  // both event shapes resolve to the SAME payment-intent id, so the
  // per-ref idempotency below also dedupes session+intent double-fires
  const ref = String(isSession ? (s.payment_intent ?? s.id) : s.id);

  // gift card purchases carry everything in the session metadata — the
  // card is minted and emailed here (payment_ref dedupes retries)
  if (kind === "gift" && isSession && paidCents > 0 && s.metadata?.buyerEmail) {
    const { fulfillGiftPurchase } = await import("@/modules/giftcards");
    await fulfillGiftPurchase({
      paymentRef: ref,
      amountCents: paidCents,
      buyerEmail: s.metadata.buyerEmail,
      recipientEmail: s.metadata.recipientEmail || undefined,
      message: s.metadata.message || undefined,
    });
    return NextResponse.json({ received: true });
  }

  // early check-in / late check-out: no invoiceId — the extra's own id
  // travels in the metadata. Marks it paid and blocks the adjacent night.
  if (kind === "extra" && paidCents > 0 && s.metadata?.extraId) {
    const { fulfillExtraPayment } = await import("@/modules/extras");
    await fulfillExtraPayment(s.metadata.extraId, ref);
    return NextResponse.json({ received: true });
  }

  if (!/^[0-9a-f-]{36}$/i.test(id) || paidCents <= 0) {
    return NextResponse.json({ received: true });
  }

  if (kind === "stay" || kind === "tour") {
    const { recordPayment } = await import("@/modules/payments/record");
    await recordPayment({ kind, id, paidCents, ref, provider: "stripe" });
  }

  return NextResponse.json({ received: true });
}
