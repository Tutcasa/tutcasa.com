"use server";

import { revalidatePath } from "next/cache";
import { getDb } from "@/lib/db";
import type { BookingStatus } from "@/modules/bookings";
import { requireAdmin } from "@/lib/admin-auth";

export interface BookingFormState { ok: boolean; message: string }

function revalidate() {
  revalidatePath("/admin/bookings");
  revalidatePath("/admin");
}

/** Allowed manual transitions (money safety: no resurrecting cancelled stays). */
const ALLOWED: Record<BookingStatus, BookingStatus[]> = {
  pending: ["confirmed", "cancelled"],
  confirmed: ["completed", "cancelled"],
  cancelled: [],
  completed: [],
};

export async function setBookingStatusAction(
  id: string,
  to: BookingStatus,
): Promise<void> {
  await requireAdmin();
  const db = getDb();
  const cur = await db.query<{ status: BookingStatus; future: boolean; coupon_code: string | null }>(
    `select status, upper(stay) > current_date as future, coupon_code
       from bookings where id=$1`, [id]);
  const row = cur.rows[0];
  const from = row?.status;
  if (!from || !ALLOWED[from].includes(to)) return;
  // a FUTURE stay must never be "completed" — that would drop it out of
  // the double-booking constraint and reopen its nights for sale
  if (to === "completed" && row.future) return;
  // confirming clears the hold — the dates are now committed
  await db.query(
    `update bookings set status=$2,
            hold_expires_at = case when $2='confirmed' then null else hold_expires_at end
      where id=$1`,
    [id, to],
  );
  if (to === "cancelled" && row.coupon_code) {
    // give the coupon use back — the discount was never actually spent
    const { unredeemCoupon } = await import("@/modules/coupons");
    await unredeemCoupon(row.coupon_code).catch(() => {});
  }
  if (to === "confirmed") {
    // M3: acceptance email with the invoice link (guest + team copy)
    const { fireAutomations } = await import("@/modules/emails/dispatch");
    fireAutomations(["guest_booking_confirmed"], id);
    // loyalty: if the booking used a referral coupon, reward the referrer
    const { rewardReferrerForBooking } = await import("@/modules/growth");
    void rewardReferrerForBooking(id).catch(() => {});
  }
  revalidate();
}

/**
 * Permanently delete a stay booking (and its invoice/order — they are the
 * same row). Child records go with it: emails log, review, transfer,
 * referral reward; gift-card ledger lines are kept for accounting but
 * unlinked. An unused coupon redemption is given back.
 */
export async function deleteBookingAction(id: string): Promise<void> {
  await requireAdmin();
  const db = getDb();
  const res = await db.query<{ coupon_code: string | null; status: string }>(
    `with n as (delete from notifications_log where booking_id = $1),
          g as (update gift_card_ledger set booking_id = null where booking_id = $1),
          r as (delete from reviews where booking_id = $1)
     delete from bookings where id = $1
     returning coupon_code, status`,
    [id],
  );
  const row = res.rows[0];
  if (row?.coupon_code && row.status !== "cancelled") {
    const { unredeemCoupon } = await import("@/modules/coupons");
    await unredeemCoupon(row.coupon_code).catch(() => {});
  }
  revalidate();
  revalidatePath("/admin/invoices");
  revalidatePath("/admin/orders");
}

/**
 * Record a payment on a booking (bank transfer, card link, cash…).
 * Adds to amount_paid and sends the payment receipts to the guest and
 * the team — step 5/6 of the request-to-book flow.
 */
export async function recordPaymentAction(
  _prev: BookingFormState,
  formData: FormData,
): Promise<BookingFormState> {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  const amountUSD = Number(formData.get("amountUSD") ?? 0);
  if (!id || !Number.isFinite(amountUSD) || amountUSD <= 0) {
    return { ok: false, message: "Enter the amount that was paid." };
  }
  const res = await getDb().query<{ amount_paid_cents: number; total_cents: number }>(
    `update bookings set
       amount_paid_cents = coalesce(amount_paid_cents, 0) + $2,
       payment_provider = coalesce(payment_provider, 'manual')
     where id = $1 and status in ('pending','confirmed','completed')
     returning amount_paid_cents, total_cents`,
    [id, Math.round(amountUSD * 100)],
  );
  const row = res.rows[0];
  if (!row) return { ok: false, message: "Booking not found (or cancelled)." };
  const { fireAutomations } = await import("@/modules/emails/dispatch");
  fireAutomations(["guest_payment_receipt", "admin_payment_receipt"], id);
  revalidate();
  const paid = Math.round(row.amount_paid_cents / 100);
  const total = Math.round(row.total_cents / 100);
  return {
    ok: true,
    message: `Payment recorded — $${paid.toLocaleString("en-US")} of $${total.toLocaleString("en-US")} paid. Receipts sent to the guest and the team.`,
  };
}

/** Postgres exclusion-constraint violation (booking overlap). */
const isOverlap = (e: unknown) =>
  typeof e === "object" && e !== null && (e as { code?: string }).code === "23P01";

/**
 * Create a booking by hand — phone/WhatsApp/walk-in reservations (the old
 * site's "internal calendar where I can make bookings"). Price auto-quotes
 * from the full pricing model when the total is left blank; the admin can
 * override it. Manual bookings never auto-expire.
 */
export async function createManualBookingAction(
  _prev: BookingFormState,
  formData: FormData,
): Promise<BookingFormState> {
  await requireAdmin();
  const listingId = String(formData.get("listingId") ?? "");
  const checkIn = String(formData.get("checkIn") ?? "");
  const checkOut = String(formData.get("checkOut") ?? "");
  const guests = Number(formData.get("guests") ?? 0);
  const guestName = String(formData.get("guestName") ?? "").trim();
  const guestEmail = String(formData.get("guestEmail") ?? "").trim();
  const status = String(formData.get("status")) === "pending" ? "pending" : "confirmed";
  const totalRaw = String(formData.get("totalUSD") ?? "").trim();

  if (!listingId || !guestName) return { ok: false, message: "Pick a home and enter the guest's name." };
  if (!checkIn || !checkOut || checkOut <= checkIn) {
    return { ok: false, message: "Check-out must be after check-in." };
  }
  if (guests < 1) return { ok: false, message: "At least one guest." };

  const db = getDb();
  const listing = await db.query<{ slug: string; keep_calendar_clean: boolean }>(
    "select slug, coalesce(keep_calendar_clean,false) as keep_calendar_clean from listings where id=$1", [listingId]);
  if (!listing.rows[0]) return { ok: false, message: "That home no longer exists." };

  // auto-quote with the real pricing model; a typed total overrides it
  const { resolveStayQuote } = await import("@/modules/pricing/resolve");
  const quoted = await resolveStayQuote(listing.rows[0].slug, checkIn, checkOut, guests, undefined, { skipAvailability: true });
  let totalCents: number;
  let breakdown: object | null = null;
  if (totalRaw !== "") {
    const t = Number(totalRaw);
    if (!Number.isFinite(t) || t < 0) return { ok: false, message: "The total must be a number (or blank to auto-price)." };
    totalCents = Math.round(t * 100);
    // an overridden total gets an HONEST breakdown (one line that sums to
    // the total) — never the auto-quote's lines next to a different total
    breakdown = {
      nights: quoted.ok ? quoted.quote.nights : undefined,
      accommodationCents: totalCents,
      adminOverride: true,
    };
  } else if (quoted.ok) {
    const q = quoted.quote;
    totalCents = q.totalCents + q.securityDepositCents;
    breakdown = {
      nights: q.nights, nightlyCents: q.nightlyCents,
      accommodationCents: q.accommodationCents, cleaningCents: q.cleaningCents,
      taxCents: q.taxCents, lengthDiscountCents: q.lengthDiscountCents,
      extraGuestFeeCents: q.extraGuestFeeCents, cityFeeCents: q.cityFeeCents,
      securityDepositCents: q.securityDepositCents,
      depositInTotal: q.securityDepositCents > 0,
    };
  } else {
    const why = quoted.error === "DATES_TAKEN"
      ? "Those dates are already booked or blocked."
      : quoted.error === "MIN_STAY_NOT_MET"
        ? "Below this home's minimum stay — type a total to override the auto-price, or extend the dates."
        : "Couldn't auto-price those dates — check them, or type a total.";
    if (quoted.error !== "MIN_STAY_NOT_MET" || totalRaw === "") {
      return { ok: false, message: why };
    }
    totalCents = 0; // unreachable (totalRaw handled above) — keeps TS happy
  }

  try {
    await db.query(
      `insert into bookings
         (listing_id, guest_name, guest_email, guest_phone, stay, guests,
          status, total_cents, currency, price_breakdown, source, payment_provider, no_block)
       values ($1,$2,$3,$4, daterange($5::date,$6::date,'[)'), $7, $8, $9,'USD',$10,'manual',$11)`,
      [listingId, guestName, guestEmail || "manual@tutcasa.com",
       String(formData.get("guestPhone") ?? "").trim() || null,
       checkIn, checkOut, guests, status, totalCents,
       breakdown ? JSON.stringify(breakdown) : null,
       listing.rows[0].keep_calendar_clean],
    );
  } catch (e) {
    if (isOverlap(e)) return { ok: false, message: "Those dates collide with another booking on that home." };
    throw e;
  }
  revalidate();
  revalidatePath("/stays");
  return { ok: true, message: `Booking created (${status}) — ${checkIn} → ${checkOut}.` };
}

/**
 * Edit a booking — guest details, dates, party size, total, or even the home
 * itself (feature-spec parity with the old WpRentals admin).
 */
export async function updateBookingAction(
  _prev: BookingFormState,
  formData: FormData,
): Promise<BookingFormState> {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  const listingId = String(formData.get("listingId") ?? "");
  const guestName = String(formData.get("guestName") ?? "").trim();
  const guestEmail = String(formData.get("guestEmail") ?? "").trim();
  const checkIn = String(formData.get("checkIn") ?? "");
  const checkOut = String(formData.get("checkOut") ?? "");
  const guests = Number(formData.get("guests") ?? 0);
  const totalUSD = Number(formData.get("totalUSD") ?? 0);

  if (!id || !listingId || !guestName || !guestEmail) {
    return { ok: false, message: "Guest name and email are required." };
  }
  if (!checkIn || !checkOut || checkOut <= checkIn) {
    return { ok: false, message: "Check-out must be after check-in." };
  }
  if (guests < 1) return { ok: false, message: "At least one guest." };
  if (totalUSD < 0) return { ok: false, message: "Total can't be negative." };

  try {
    await getDb().query(
      `update bookings set
         listing_id=$2, guest_name=$3, guest_email=$4, guest_phone=$5,
         stay=daterange($6::date, $7::date, '[)'), guests=$8,
         -- a changed total replaces the stored line items with one honest
         -- line, so the invoice always sums to what the admin typed
         price_breakdown = case when total_cents <> $9 then
           jsonb_build_object('nights', price_breakdown->'nights',
                              'accommodationCents', $9::bigint,
                              'adminOverride', true)
           else price_breakdown end,
         total_cents=$9
       where id=$1`,
      [id, listingId, guestName, guestEmail,
       String(formData.get("guestPhone") ?? "").trim() || null,
       checkIn, checkOut, guests, Math.round(totalUSD * 100)],
    );
  } catch (e) {
    if (isOverlap(e)) {
      return { ok: false, message: "Those dates collide with another booking on that home." };
    }
    throw e;
  }
  revalidate();
  return { ok: true, message: "Booking updated." };
}
