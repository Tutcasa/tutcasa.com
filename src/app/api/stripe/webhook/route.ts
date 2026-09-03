import { NextRequest, NextResponse } from "next/server";
import { createHmac, timingSafeEqual } from "node:crypto";
import { getDb } from "@/lib/db";

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
    payment_intent?: string; metadata?: { kind?: string; invoiceId?: string } };
  const kind = s.metadata?.kind;
  const id = s.metadata?.invoiceId ?? "";
  const paidCents = Number(isSession ? (s.amount_total ?? 0) : (s.amount_received ?? 0));
  // both event shapes resolve to the SAME payment-intent id, so the
  // per-ref idempotency below also dedupes session+intent double-fires
  const ref = String(isSession ? (s.payment_intent ?? s.id) : s.id);
  if (!/^[0-9a-f-]{36}$/i.test(id) || paidCents <= 0) {
    return NextResponse.json({ received: true });
  }

  const db = getDb();
  if (kind === "stay") {
    // idempotent per payment ref: never double-count a retried webhook
    const upd = await db.query<{ prev_status: string }>(
      `with old as (select status from bookings where id = $1)
       update bookings set
         amount_paid_cents = coalesce(amount_paid_cents,0) + $2,
         payment_provider = 'stripe',
         payment_ref = $3,
         status = case when status = 'pending' then 'confirmed' else status end,
         hold_expires_at = null
       where id = $1 and status <> 'cancelled'
         and (payment_ref is distinct from $3)
       returning (select status from old) as prev_status`,
      [id, paidCents, ref],
    );
    if (upd.rows[0]) {
      const { fireAutomations } = await import("@/modules/emails/dispatch");
      const wasPending = upd.rows[0].prev_status === "pending";
      fireAutomations(
        wasPending
          ? ["guest_booking_confirmed", "guest_payment_receipt", "admin_payment_receipt"]
          : ["guest_payment_receipt", "admin_payment_receipt"],
        id,
      );
      const { rewardReferrerForBooking } = await import("@/modules/growth");
      void rewardReferrerForBooking(id).catch(() => {});
    }
  } else if (kind === "tour") {
    await db.query(
      `update tour_bookings set
         amount_paid_cents = coalesce(amount_paid_cents,0) + $2,
         payment_ref = $3,
         status = case when status = 'pending' then 'paid' else status end
       where id = $1 and status <> 'cancelled'
         and (payment_ref is distinct from $3)`,
      [id, paidCents, ref],
    );
  }

  return NextResponse.json({ received: true });
}
