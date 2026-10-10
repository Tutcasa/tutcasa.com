import "server-only";
import { getDb } from "@/lib/db";

/**
 * Record a completed payment on a stay or tour booking — the ONE path for
 * every provider (Stripe webhook, PayPal capture), so receipts, pending →
 * confirmed, referral rewards and fee tracking behave identically.
 * Idempotent per payment ref: a retried webhook / revisited return URL
 * never double-counts. Returns true when this call recorded the payment.
 */
export async function recordPayment(p: {
  kind: "stay" | "tour";
  id: string;
  paidCents: number;
  ref: string;
  provider: "stripe" | "paypal";
  /** exact processor fee when the provider reports it inline (PayPal) */
  feeCents?: number | null;
}): Promise<boolean> {
  const db = getDb();
  if (!/^[0-9a-f-]{36}$/i.test(p.id) || !(p.paidCents > 0)) return false;

  if (p.kind === "stay") {
    const upd = await db.query<{ prev_status: string }>(
      `with old as (select status from bookings where id = $1)
       update bookings set
         amount_paid_cents = coalesce(amount_paid_cents,0) + $2,
         payment_provider = $4,
         payment_ref = $3,
         status = case when status = 'pending' then 'confirmed' else status end,
         hold_expires_at = null
       where id = $1 and status <> 'cancelled'
         and (payment_ref is distinct from $3)
       returning (select status from old) as prev_status`,
      [p.id, p.paidCents, p.ref, p.provider],
    );
    if (!upd.rows[0]) return false;
    await recordFee("bookings", p);
    const { fireAutomations } = await import("@/modules/emails/dispatch");
    fireAutomations(
      upd.rows[0].prev_status === "pending"
        ? ["guest_booking_confirmed", "guest_payment_receipt", "admin_payment_receipt"]
        : ["guest_payment_receipt", "admin_payment_receipt"],
      p.id,
      { paymentCents: p.paidCents },
    );
    const { rewardReferrerForBooking } = await import("@/modules/growth");
    void rewardReferrerForBooking(p.id).catch(() => {});
    return true;
  }

  const upd = await db.query<{ prev_status: string }>(
    `with old as (select status from tour_bookings where id = $1)
     update tour_bookings set
       amount_paid_cents = coalesce(amount_paid_cents,0) + $2,
       payment_provider = $4,
       payment_ref = $3,
       status = case when status = 'pending' then 'paid' else status end
     where id = $1 and status <> 'cancelled'
       and (payment_ref is distinct from $3)
     returning (select status from old) as prev_status`,
    [p.id, p.paidCents, p.ref, p.provider],
  );
  if (!upd.rows[0]) return false;
  await recordFee("tour_bookings", p);
  const { sendTourPaidGuestEmail, notifyPaidTourBooking } = await import("@/modules/notifications");
  // first payment = the moment Amanah + the team hear of an instant tour,
  // and the guest gets "you're booked" (later payments don't repeat them)
  if (upd.rows[0].prev_status === "pending") {
    await notifyPaidTourBooking(p.id);
    await sendTourPaidGuestEmail(p.id);
  }
  return true;
}

/** Exact processor fee, summed across deposit + balance charges. Stripe's
    comes from its balance transaction; PayPal reports it on the capture.
    (The column predates PayPal — it holds whichever processor's fee.) */
async function recordFee(table: "bookings" | "tour_bookings", p: { id: string; ref: string; provider: string; feeCents?: number | null }) {
  try {
    let fee = p.feeCents ?? null;
    if (fee == null && p.provider === "stripe") {
      const { stripeFeeForPaymentRef } = await import("@/lib/stripe");
      fee = await stripeFeeForPaymentRef(p.ref);
    }
    if (fee == null) return;
    await getDb().query(
      `update ${table} set stripe_fee_cents = coalesce(stripe_fee_cents,0) + $2 where id = $1`,
      [p.id, fee]);
  } catch (e) {
    console.error("processor fee:", e);
  }
}
