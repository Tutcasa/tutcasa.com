import "server-only";
import { getDb } from "@/lib/db";
import { getListingsRepo } from "@/modules/listings";
import { resolveStayQuote } from "@/modules/pricing/resolve";
import { checkCoupon, tryRedeemCoupon, unredeemCoupon } from "@/modules/coupons";
import { fireAutomations } from "@/modules/emails/dispatch";
import type {
  Booking,
  BookingRequest,
  ReserveResult,
  UnavailableRange,
} from "./types";

const HOLD_MINUTES = 30;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function parseDay(s: string): Date | null {
  if (!DATE_RE.test(s)) return null;
  const d = new Date(`${s}T00:00:00Z`);
  return Number.isNaN(d.getTime()) ? null : d;
}

import { todayLocal } from "@/lib/local-date";

/**
 * Create a pending booking hold. The price is recomputed server-side
 * from the listing's stored rate — the client's numbers are never
 * trusted. Double-booking safety is delegated to the database's
 * exclusion constraint: we simply insert and translate a conflict
 * into a friendly error. No check-then-insert race is possible.
 */
export async function createBookingHold(req: BookingRequest): Promise<ReserveResult> {
  const checkIn = parseDay(req.checkIn);
  const checkOut = parseDay(req.checkOut);
  if (!checkIn || !checkOut || req.checkIn < todayLocal() || req.checkOut <= req.checkIn) {
    return { ok: false, error: "INVALID_DATES" };
  }

  const name = req.guestName?.trim();
  const email = req.guestEmail?.trim();
  if (!name || !email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    return { ok: false, error: "INVALID_CONTACT" };
  }

  const listing = await getListingsRepo().bySlug(req.listingSlug);
  if (!listing) return { ok: false, error: "LISTING_NOT_FOUND" };
  if (req.guests < 1 || req.guests > listing.maxGuests) {
    return { ok: false, error: "TOO_MANY_GUESTS" };
  }

  // full price model: base/seasonal rates + per-date overrides + the
  // admin's fee/discount/deposit configuration
  const quoted = await resolveStayQuote(req.listingSlug, req.checkIn, req.checkOut, req.guests,
    undefined, { commissionPct: req.marketingCommissionPct, addonIds: req.addonIds });
  if (!quoted.ok) {
    return { ok: false, error: quoted.error === "LISTING_NOT_FOUND" ? "LISTING_NOT_FOUND" : quoted.error };
  }
  const q = quoted.quote;

  // coupon: validated server-side with the FINAL guest email. An invalid
  // coupon REJECTS the booking — never silently books at full price while
  // the guest is looking at a discounted total.
  let couponCode: string | null = null;
  let couponDiscountCents = 0;
  let couponCommissionPct = 0;
  if (req.couponCode?.trim()) {
    const cp = await checkCoupon(req.couponCode, {
      nights: q.nights,
      totalCents: q.totalCents,
      listingId: listing.id,
      guestEmail: email,
      saleDiscountCents: q.lengthDiscountCents + q.earlyBirdDiscountCents,
    });
    if (!cp.ok) return { ok: false, error: "COUPON_INVALID" };
    // atomic claim BEFORE the insert — two checkouts can't share the
    // last use of a limited code (given back below if the insert fails)
    if (!(await tryRedeemCoupon(cp.code))) return { ok: false, error: "COUPON_INVALID" };
    couponCode = cp.code;
    couponDiscountCents = cp.discountCents;
    couponCommissionPct = cp.commissionPct ?? 0;
  }
  // a coupon handed to a third party carries its commission % — recorded
  // on the same basis as the manual admin button (guest total excl. tax,
  // after the coupon discount; the deposit is never commissionable)
  const couponCommissionCents = couponCommissionPct > 0
    ? Math.round(Math.max(0, q.totalCents - couponDiscountCents - q.taxCents) * (couponCommissionPct / 100))
    : 0;
  // the security deposit is COLLECTED WITH THE BOOKING (returned after
  // checkout per policy) — it joins the charge, untaxed and un-couponed
  let chargeCents = q.totalCents - couponDiscountCents + q.securityDepositCents;

  // gift card (stored value, combinable with a coupon): claim its value
  // BEFORE the insert, mirroring the coupon; refunded if the insert fails.
  // It covers up to the whole charge; anything left stays on the card.
  let giftCardId: string | null = null;
  let giftCardCents = 0;
  if (req.giftCardCode?.trim()) {
    const { checkGiftCard, redeemGiftCard } = await import("@/modules/giftcards");
    const gc = await checkGiftCard(req.giftCardCode);
    if (!gc.ok || !gc.id) return { ok: false, error: "GIFT_CARD_INVALID" };
    giftCardCents = Math.min(gc.balanceCents ?? 0, chargeCents);
    if (giftCardCents > 0) {
      if (!(await redeemGiftCard(gc.id, giftCardCents, "redeemed on booking"))) {
        return { ok: false, error: "GIFT_CARD_INVALID" };
      }
      giftCardId = gc.id;
      chargeCents -= giftCardCents;
    }
  }

  const db = getDb();
  await db.query("select release_expired_holds()"); // lazy expiry

  // Admin/iCal blocks and calendar-blocked days are not covered by the
  // bookings exclusion constraint — reject overlaps explicitly. (The date
  // picker already hides these; this guards direct/stale submissions.)
  const blocked = await db.query<{ n: string }>(
    `select count(*) as n
       from listing_unavailable_ranges($1) r
      where daterange(r.from_date, r.to_date) && daterange($2::date, $3::date)`,
    [listing.id, req.checkIn, req.checkOut],
  );
  if (Number(blocked.rows[0].n) > 0) {
    return { ok: false, error: "DATES_TAKEN" };
  }

  // Request-to-book homes take a REQUEST, not a payment hold: the owner
  // reviews it, so it must never auto-expire after HOLD_MINUTES.
  const isRequest = !listing.instantBook;

  try {
    const res = await db.query<{ id: string }>(
      `insert into bookings
         (listing_id, guest_name, guest_email, guest_phone, stay, guests,
          status, hold_expires_at, total_cents, currency, price_breakdown, source,
          coupon_code, coupon_discount_cents, no_block, marketing_ref,
          gift_card_id, gift_card_cents)
       values ($1, $2, $3, $4, daterange($5::date, $6::date), $7,
               'pending', case when $8::text is null then null
                               else now() + ($8 || ' minutes')::interval end,
               $9, $10, $11, 'direct', $12, $13, $14, $15, $16, $17)
       returning id`,
      [
        listing.id, name, email, req.guestPhone?.trim() || null,
        req.checkIn, req.checkOut, req.guests,
        isRequest ? null : String(HOLD_MINUTES),
        chargeCents, q.currency,
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
          addonsCents: q.addonsCents,
          addonLines: q.addonLines,
          securityDepositCents: q.securityDepositCents,
          thirdPartyCommissionCents: (q.thirdPartyCommissionCents ?? 0) + couponCommissionCents,
          ...(couponCommissionCents > 0 ? { thirdPartyCommissionPct: couponCommissionPct } : {}),
          couponCode,
          couponDiscountCents,
          giftCardCents,
          requestToBook: isRequest,
          depositInTotal: q.securityDepositCents > 0,
          // the coupon eats the LATER balance first — whatever remains of
          // the discounted total is collected at booking. The security
          // deposit splits like the stay: half now, half with the balance
          // (all now when the booking is pay-in-full).
          dueNowCents: chargeCents
            - Math.max(0, q.schedule.balanceCents - couponDiscountCents - giftCardCents)
            - (q.schedule.balanceCents > 0 ? Math.round(q.securityDepositCents / 2) : 0),
          balanceCents: Math.max(0, q.schedule.balanceCents - couponDiscountCents - giftCardCents)
            + (q.schedule.balanceCents > 0 ? Math.round(q.securityDepositCents / 2) : 0),
          balanceDueDate: q.schedule.balanceDueDate?.toISOString() ?? null,
        }),
        couponCode, couponDiscountCents, listing.keepCalendarClean,
        req.marketingRef ?? null, giftCardId, giftCardCents,
      ],
    );
    // M3: new-booking emails (never block the booking). Only request-to-book
    // homes get the "owner is reviewing your request, no payment taken yet"
    // guest email — an instant-book guest goes straight to Stripe and would be
    // confused by it, so they only get the payment receipt / confirmation once
    // they pay (the deposit-reminder automation nudges an abandoned hold). The
    // team is notified either way.
    fireAutomations(
      isRequest
        ? ["guest_booking_request", "admin_new_booking"]
        : ["admin_new_booking"],
      res.rows[0].id,
    );
    return { ok: true, bookingId: res.rows[0].id };
  } catch (e) {
    if (couponCode) await unredeemCoupon(couponCode).catch(() => {});
    if (giftCardId && giftCardCents > 0) {
      const { refundGiftCard } = await import("@/modules/giftcards");
      await refundGiftCard(giftCardId, giftCardCents, "booking insert failed").catch(() => {});
    }
    const err = e as { code?: string; constraint?: string };
    if (err.code === "23P01" && err.constraint === "no_double_booking") {
      return { ok: false, error: "DATES_TAKEN" };
    }
    throw e;
  }
}

/** Date ranges the picker must disable (dates only — no guest data). */
export async function getUnavailableRanges(listingId: string): Promise<UnavailableRange[]> {
  const db = getDb();
  await db.query("select release_expired_holds()");
  // to_char keeps dates as plain YYYY-MM-DD strings — pg would otherwise
  // return Date objects with timezone shift (off-by-one-day risk).
  const res = await db.query<{ from_date: string; to_date: string }>(
    `select to_char(from_date,'YYYY-MM-DD') as from_date,
            to_char(to_date,'YYYY-MM-DD')   as to_date
       from listing_unavailable_ranges($1)`,
    [listingId],
  );
  return res.rows.map((r) => ({ from: r.from_date, to: r.to_date }));
}

/** IDs of published listings that are NOT bookable for [checkIn, checkOut)
    — any overlap with a booking/hold or blocked/imported range. Used to hide
    unavailable homes from a dated search (previously search ignored dates, so
    fully-blocked homes still showed as bookable). */
export async function blockedListingIdsForRange(
  checkIn: string,
  checkOut: string,
): Promise<Set<string>> {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(checkIn) || !/^\d{4}-\d{2}-\d{2}$/.test(checkOut) || checkOut <= checkIn) {
    return new Set();
  }
  const db = getDb();
  await db.query("select release_expired_holds()");
  const res = await db.query<{ id: string }>(
    `select l.id
       from listings l
      where l.status = 'published'
        and exists (
          select 1 from listing_unavailable_ranges(l.id) r
           where daterange(r.from_date, r.to_date) && daterange($1::date, $2::date)
        )`,
    [checkIn, checkOut],
  );
  return new Set(res.rows.map((r) => r.id));
}

interface BookingRow {
  id: string;
  listing_id: string;
  title: string;
  city: string;
  check_in: string;
  check_out: string;
  guests: number;
  status: Booking["status"];
  hold_expires_at: string | null;
  total_cents: number;
  currency: string;
  price_breakdown: Booking["priceBreakdown"];
  guest_name: string;
  guest_email: string;
  guest_phone: string | null;
  source: string;
  invoice_no: number | null;
  amount_paid_cents: number | null;
  partner_ref: string | null;
  created_at: string;
}

/** Admin: recent stay bookings across all listings. */
export async function listBookings(): Promise<Booking[]> {
  const db = getDb();
  await db.query("select release_expired_holds()");
  const res = await db.query<BookingRow>(
    `select b.id, b.listing_id, l.title, l.city,
            to_char(lower(b.stay),'YYYY-MM-DD') as check_in,
            to_char(upper(b.stay),'YYYY-MM-DD') as check_out,
            b.guests, b.status, b.hold_expires_at, b.total_cents,
            b.currency, b.price_breakdown, b.guest_name, b.guest_email, b.guest_phone,
            b.source, b.partner_ref, b.invoice_no, b.amount_paid_cents, b.created_at
       from bookings b join listings l on l.id = b.listing_id
      order by b.created_at desc limit 200`,
  );
  return res.rows.map((r) => ({
    id: r.id, listingId: r.listing_id, listingTitle: r.title,
    listingCity: r.city, checkIn: r.check_in, checkOut: r.check_out,
    guests: r.guests, status: r.status, holdExpiresAt: r.hold_expires_at,
    totalCents: r.total_cents, currency: r.currency,
    source: r.source, partnerRef: r.partner_ref, invoiceNo: String(r.invoice_no ?? ''), amountPaidCents: r.amount_paid_cents ?? 0,
    priceBreakdown: r.price_breakdown, guestName: r.guest_name,
    guestEmail: r.guest_email, guestPhone: r.guest_phone, createdAt: r.created_at,
  }));
}

export async function getBooking(id: string): Promise<Booking | null> {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
  const db = getDb();
  await db.query("select release_expired_holds()");
  const res = await db.query<BookingRow>(
    `select b.id, b.listing_id, l.title, l.city,
            to_char(lower(b.stay),'YYYY-MM-DD') as check_in,
            to_char(upper(b.stay),'YYYY-MM-DD') as check_out,
            b.guests, b.status, b.hold_expires_at, b.total_cents,
            b.currency, b.price_breakdown, b.guest_name, b.guest_email, b.guest_phone,
            b.source, b.partner_ref, b.invoice_no, b.amount_paid_cents, b.created_at
       from bookings b join listings l on l.id = b.listing_id
      where b.id = $1`,
    [id],
  );
  const r = res.rows[0];
  if (!r) return null;
  return {
    id: r.id,
    listingId: r.listing_id,
    listingTitle: r.title,
    listingCity: r.city,
    checkIn: r.check_in,
    checkOut: r.check_out,
    guests: r.guests,
    status: r.status,
    holdExpiresAt: r.hold_expires_at,
    totalCents: r.total_cents,
    currency: r.currency,
    source: r.source,
    partnerRef: r.partner_ref,
    invoiceNo: String(r.invoice_no ?? ''),
    amountPaidCents: r.amount_paid_cents ?? 0,
    priceBreakdown: r.price_breakdown,
    guestName: r.guest_name,
    guestEmail: r.guest_email,
    guestPhone: r.guest_phone,
    createdAt: r.created_at,
  };
}
