import "server-only";
import { todayLocal } from "@/lib/local-date";
import { getDb } from "@/lib/db";
import { resolveStayQuote } from "@/modules/pricing/resolve";

/**
 * Partner booking flow (Amanah Vacations) — hold → confirm → release.
 * Spec: amanah-website/docs/tutcasa-partner-booking-api.md.
 *
 * Holds are bookings rows (status='pending' + hold_expires_at), so the
 * no_double_booking exclusion constraint gives database-level race safety:
 * two overlapping holds/bookings can never both insert. Expiry is lazy —
 * release_expired_holds() cancels stale holds before any availability read.
 *
 * Partner bookings are PAID IN FULL on Amanah (no deposit split) and the
 * security deposit is handled by TutCasa directly with the guest.
 */

const HOLD_MINUTES = 60;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type PartnerHoldResult =
  | {
      ok: true;
      holdId: string;
      expiresAt: string;
      quote: { nights: number; currency: string; total: number; totalCents: number };
    }
  | {
      ok: false;
      error: "NOT_FOUND" | "INVALID_DATES" | "MIN_STAY_NOT_MET" | "MAX_GUESTS_EXCEEDED" | "DATES_TAKEN" | "REQUEST_TO_BOOK";
      /** on REQUEST_TO_BOOK: where the guest can send a booking request instead */
      requestUrl?: string;
    };

export async function createPartnerHold(input: {
  slug: string;
  checkIn: string;
  checkOut: string;
  guests: number;
  partnerRef?: string;
}): Promise<PartnerHoldResult> {
  const today = todayLocal();
  if (!input.checkIn || input.checkIn < today) return { ok: false, error: "INVALID_DATES" };

  // same validation + pricing as the public quote endpoint
  const quoted = await resolveStayQuote(input.slug, input.checkIn, input.checkOut, Math.max(1, input.guests));
  if (!quoted.ok) {
    if (quoted.error === "LISTING_NOT_FOUND") return { ok: false, error: "NOT_FOUND" };
    return { ok: false, error: quoted.error };
  }
  if (input.guests > quoted.listing.maxGuests) return { ok: false, error: "MAX_GUESTS_EXCEEDED" };

  // Request-to-book homes need the owner's approval before any money moves —
  // they can never be sold instantly through a partner. The guest requests
  // via TutCasa instead (admin toggle: "Instant booking" on the listing).
  if (!quoted.listing.instantBook) {
    return { ok: false, error: "REQUEST_TO_BOOK", requestUrl: `/stays/${quoted.listing.slug}` };
  }
  const q = quoted.quote;

  const db = getDb();
  await db.query("select release_expired_holds()"); // lazy expiry

  // manual/iCal blocks + blocked calendar days aren't covered by the
  // exclusion constraint — reject them explicitly (same as guest checkout)
  const blocked = await db.query<{ n: string }>(
    `select count(*) as n
       from listing_unavailable_ranges($1) r
      where daterange(r.from_date, r.to_date) && daterange($2::date, $3::date)`,
    [quoted.listing.id, input.checkIn, input.checkOut],
  );
  if (Number(blocked.rows[0].n) > 0) return { ok: false, error: "DATES_TAKEN" };

  try {
    const res = await db.query<{ id: string; hold_expires_at: string }>(
      `insert into bookings
         (listing_id, guest_name, guest_email, stay, guests, status,
          hold_expires_at, total_cents, currency, price_breakdown, source, partner_ref)
       values ($1, 'Amanah guest (pending payment)', 'pending@amanahvacations.com',
               daterange($2::date, $3::date), $4, 'pending',
               now() + ($5 || ' minutes')::interval, $6, $7, $8, 'amanah', $9)
       returning id, hold_expires_at`,
      [
        quoted.listing.id, input.checkIn, input.checkOut, input.guests,
        String(HOLD_MINUTES), q.totalCents, q.currency,
        JSON.stringify({
          nights: q.nights,
          nightlyCents: q.nightlyCents,
          accommodationCents: q.accommodationCents,
          cleaningCents: q.cleaningCents,
          taxCents: q.taxCents,
          weekendUpliftCents: q.weekendUpliftCents,
          lengthDiscountCents: q.lengthDiscountCents,
          earlyBirdDiscountCents: q.earlyBirdDiscountCents,
          extraGuestFeeCents: q.extraGuestFeeCents,
          cityFeeCents: q.cityFeeCents,
          securityDepositCents: q.securityDepositCents,
          // partner bookings are paid in full — no dueNow/balance schedule
          partnerFullPayment: true,
        }),
        input.partnerRef?.trim() || null,
      ],
    );
    return {
      ok: true,
      holdId: res.rows[0].id,
      expiresAt: new Date(res.rows[0].hold_expires_at).toISOString(),
      quote: { nights: q.nights, currency: q.currency, total: Math.round(q.totalCents / 100), totalCents: q.totalCents },
    };
  } catch (e) {
    const err = e as { code?: string; constraint?: string };
    if (err.code === "23P01" && err.constraint === "no_double_booking") {
      return { ok: false, error: "DATES_TAKEN" };
    }
    throw e;
  }
}

export type PartnerConfirmResult =
  | { ok: true; bookingId: string }
  | { ok: false; error: "HOLD_EXPIRED" | "INVALID_CONTACT" };

export async function confirmPartnerHold(
  holdId: string,
  input: {
    partnerRef?: string;
    guestName: string;
    guestEmail: string;
    guestWhatsapp?: string;
    amountPaid?: number;
    notes?: string;
  },
): Promise<PartnerConfirmResult> {
  if (!UUID.test(holdId)) return { ok: false, error: "HOLD_EXPIRED" };
  const name = input.guestName?.trim();
  const email = input.guestEmail?.trim();
  if (!name || !email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    return { ok: false, error: "INVALID_CONTACT" };
  }

  const db = getDb();
  // atomic: only a LIVE partner hold converts; expired/cancelled never do
  const res = await db.query<{ id: string }>(
    `update bookings set
       status='confirmed', hold_expires_at=null,
       guest_name=$2, guest_email=$3, guest_phone=coalesce($4, guest_phone),
       payment_provider='partner', payment_ref=coalesce($5, partner_ref),
       partner_ref=coalesce($5, partner_ref),
       amount_paid_cents=$6, notes=coalesce($7, notes)
     where id=$1 and source='amanah' and status='pending' and hold_expires_at > now()
     returning id`,
    [holdId, name, email, input.guestWhatsapp?.trim() || null,
     input.partnerRef?.trim() || null,
     Math.max(0, Math.round((input.amountPaid ?? 0) * 100)),
     input.notes?.trim() || null],
  );
  if (res.rows[0]) {
    // M3: team gets the payment record; guest emails stay with Amanah
    const { fireAutomations } = await import("@/modules/emails/dispatch");
    fireAutomations(["admin_payment_receipt"], res.rows[0].id);
    return { ok: true, bookingId: res.rows[0].id };
  }

  // Request-to-book path: the admin already APPROVED (status='confirmed',
  // hold cleared) and Amanah is now reporting the collected payment —
  // record it. Only fills empty payment fields, so a retry can't
  // overwrite a real payment record.
  const approved = await db.query<{ id: string }>(
    `update bookings set
       guest_name=$2, guest_email=$3, guest_phone=coalesce($4, guest_phone),
       payment_provider='partner', payment_ref=coalesce($5, partner_ref),
       partner_ref=coalesce($5, partner_ref),
       amount_paid_cents=$6, notes=coalesce($7, notes)
     where id=$1 and source='amanah' and status='confirmed'
       and coalesce(amount_paid_cents, 0) = 0 and $6 > 0
     returning id`,
    [holdId, name, email, input.guestWhatsapp?.trim() || null,
     input.partnerRef?.trim() || null,
     Math.max(0, Math.round((input.amountPaid ?? 0) * 100)),
     input.notes?.trim() || null],
  );
  if (approved.rows[0]) {
    const { fireAutomations } = await import("@/modules/emails/dispatch");
    fireAutomations(["admin_payment_receipt"], approved.rows[0].id);
    return { ok: true, bookingId: approved.rows[0].id };
  }

  // idempotency: a webhook retry on an already-confirmed hold gets the same id
  const existing = await db.query<{ id: string; status: string }>(
    "select id, status from bookings where id=$1 and source='amanah'", [holdId]);
  if (existing.rows[0]?.status === "confirmed") {
    return { ok: true, bookingId: existing.rows[0].id };
  }
  return { ok: false, error: "HOLD_EXPIRED" };
}

/* ------------------------------------------------------------------ */
/* Request-to-book flow: guest requests on Amanah WITHOUT payment; the */
/* dates are held for 72h while the owner approves (admin Confirm) or  */
/* declines (admin Cancel). Amanah polls the status endpoint and       */
/* collects payment only after approval.                               */
/* ------------------------------------------------------------------ */

const REQUEST_HOLD_HOURS = 72;

export type PartnerRequestResult =
  | {
      ok: true;
      requestId: string;
      status: "pending";
      expiresAt: string;
      quote: { nights: number; currency: string; total: number; totalCents: number };
    }
  | { ok: false; error: "NOT_FOUND" | "INVALID_DATES" | "MIN_STAY_NOT_MET" | "MAX_GUESTS_EXCEEDED" | "DATES_TAKEN" | "INVALID_CONTACT" };

export async function createPartnerRequest(input: {
  slug: string;
  checkIn: string;
  checkOut: string;
  guests: number;
  partnerRef?: string;
  guestName: string;
  guestEmail: string;
  guestWhatsapp?: string;
  notes?: string;
}): Promise<PartnerRequestResult> {
  const name = input.guestName?.trim();
  const email = input.guestEmail?.trim();
  if (!name || !email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    return { ok: false, error: "INVALID_CONTACT" };
  }
  const today = todayLocal();
  if (!input.checkIn || input.checkIn < today) return { ok: false, error: "INVALID_DATES" };

  const quoted = await resolveStayQuote(input.slug, input.checkIn, input.checkOut, Math.max(1, input.guests));
  if (!quoted.ok) {
    if (quoted.error === "LISTING_NOT_FOUND") return { ok: false, error: "NOT_FOUND" };
    return { ok: false, error: quoted.error };
  }
  if (input.guests > quoted.listing.maxGuests) return { ok: false, error: "MAX_GUESTS_EXCEEDED" };
  const q = quoted.quote;

  const db = getDb();
  await db.query("select release_expired_holds()");
  const blocked = await db.query<{ n: string }>(
    `select count(*) as n
       from listing_unavailable_ranges($1) r
      where daterange(r.from_date, r.to_date) && daterange($2::date, $3::date)`,
    [quoted.listing.id, input.checkIn, input.checkOut],
  );
  if (Number(blocked.rows[0].n) > 0) return { ok: false, error: "DATES_TAKEN" };

  try {
    const res = await db.query<{ id: string; hold_expires_at: string }>(
      `insert into bookings
         (listing_id, guest_name, guest_email, guest_phone, stay, guests, status,
          hold_expires_at, total_cents, currency, price_breakdown, source,
          partner_ref, notes)
       values ($1, $2, $3, $4, daterange($5::date, $6::date), $7, 'pending',
               now() + interval '${REQUEST_HOLD_HOURS} hours', $8, $9, $10,
               'amanah', $11, $12)
       returning id, hold_expires_at`,
      [
        quoted.listing.id, name, email, input.guestWhatsapp?.trim() || null,
        input.checkIn, input.checkOut, input.guests,
        q.totalCents, q.currency,
        JSON.stringify({
          nights: q.nights,
          nightlyCents: q.nightlyCents,
          accommodationCents: q.accommodationCents,
          cleaningCents: q.cleaningCents,
          taxCents: q.taxCents,
          lengthDiscountCents: q.lengthDiscountCents,
          extraGuestFeeCents: q.extraGuestFeeCents,
          cityFeeCents: q.cityFeeCents,
          securityDepositCents: q.securityDepositCents,
          partnerFullPayment: true,
          partnerRequest: true, // awaiting owner approval — Amanah pays after
        }),
        input.partnerRef?.trim() || null,
        input.notes?.trim() || null,
      ],
    );
    // M3: team hears about the incoming partner request (guest emails = Amanah)
    const { fireAutomations } = await import("@/modules/emails/dispatch");
    fireAutomations(["admin_new_booking"], res.rows[0].id);
    return {
      ok: true,
      requestId: res.rows[0].id,
      status: "pending",
      expiresAt: new Date(res.rows[0].hold_expires_at).toISOString(),
      quote: { nights: q.nights, currency: q.currency, total: Math.round(q.totalCents / 100), totalCents: q.totalCents },
    };
  } catch (e) {
    const err = e as { code?: string; constraint?: string };
    if (err.code === "23P01" && err.constraint === "no_double_booking") {
      return { ok: false, error: "DATES_TAKEN" };
    }
    throw e;
  }
}

/* NOTE: createPartnerRequest also notifies the team (below, after insert). */

export interface PartnerBookingStatus {
  ok: true;
  bookingId: string;
  /** pending = awaiting owner approval; confirmed = approved (collect payment);
      cancelled = declined or expired */
  status: "pending" | "confirmed" | "cancelled" | "completed";
  partnerRef: string | null;
  total: number;
  totalCents: number;
  currency: string;
  amountPaid: number;
  amountPaidCents: number;
  expiresAt: string | null;
}

export async function getPartnerBookingStatus(id: string): Promise<PartnerBookingStatus | null> {
  if (!UUID.test(id)) return null;
  const db = getDb();
  await db.query("select release_expired_holds()"); // expired requests read as cancelled
  const res = await db.query(
    `select id, status, partner_ref, total_cents, currency, amount_paid_cents, hold_expires_at
       from bookings where id=$1 and source='amanah'`,
    [id],
  );
  const b = res.rows[0];
  if (!b) return null;
  return {
    ok: true,
    bookingId: b.id,
    status: b.status,
    partnerRef: b.partner_ref,
    total: Math.round(b.total_cents / 100),
    totalCents: b.total_cents,
    currency: b.currency,
    amountPaid: Math.round((b.amount_paid_cents ?? 0) / 100),
    amountPaidCents: b.amount_paid_cents ?? 0,
    expiresAt: b.hold_expires_at ? new Date(b.hold_expires_at).toISOString() : null,
  };
}

/** Idempotent — releasing an unknown/expired/already-released hold is fine. */
export async function releasePartnerHold(holdId: string): Promise<void> {
  if (!UUID.test(holdId)) return;
  await getDb().query(
    `update bookings set status='cancelled'
      where id=$1 and source='amanah' and status='pending'`,
    [holdId],
  );
}
