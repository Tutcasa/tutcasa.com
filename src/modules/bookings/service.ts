import "server-only";
import { getDb } from "@/lib/db";
import { getListingsRepo } from "@/modules/listings";
import { resolveStayQuote } from "@/modules/pricing/resolve";
import { checkCoupon, redeemCoupon } from "@/modules/coupons";
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

function todayUtc(): string {
  return new Date().toISOString().slice(0, 10);
}

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
  if (!checkIn || !checkOut || req.checkIn < todayUtc() || req.checkOut <= req.checkIn) {
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
  const quoted = await resolveStayQuote(req.listingSlug, req.checkIn, req.checkOut, req.guests);
  if (!quoted.ok) {
    return { ok: false, error: quoted.error === "LISTING_NOT_FOUND" ? "LISTING_NOT_FOUND" : quoted.error };
  }
  const q = quoted.quote;

  // coupon: validated server-side; silently ignored when invalid so a stale
  // code never blocks a booking (the guest saw the validation at checkout)
  let couponCode: string | null = null;
  let couponDiscountCents = 0;
  if (req.couponCode?.trim()) {
    const cp = await checkCoupon(req.couponCode, q.nights, q.totalCents);
    if (cp.ok) { couponCode = cp.code; couponDiscountCents = cp.discountCents; }
  }
  const chargeCents = q.totalCents - couponDiscountCents;

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

  try {
    const res = await db.query<{ id: string }>(
      `insert into bookings
         (listing_id, guest_name, guest_email, guest_phone, stay, guests,
          status, hold_expires_at, total_cents, currency, price_breakdown, source,
          coupon_code, coupon_discount_cents)
       values ($1, $2, $3, $4, daterange($5::date, $6::date), $7,
               'pending', now() + ($8 || ' minutes')::interval,
               $9, $10, $11, 'direct', $12, $13)
       returning id`,
      [
        listing.id, name, email, req.guestPhone?.trim() || null,
        req.checkIn, req.checkOut, req.guests, String(HOLD_MINUTES),
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
          securityDepositCents: q.securityDepositCents,
          couponCode,
          couponDiscountCents,
          dueNowCents: Math.max(0, q.schedule.dueNowCents - couponDiscountCents),
          balanceCents: q.schedule.balanceCents,
          balanceDueDate: q.schedule.balanceDueDate?.toISOString() ?? null,
        }),
        couponCode, couponDiscountCents,
      ],
    );
    if (couponCode) await redeemCoupon(couponCode);
    return { ok: true, bookingId: res.rows[0].id };
  } catch (e) {
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
  source: string;
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
            b.currency, b.price_breakdown, b.guest_name, b.guest_email,
            b.source, b.partner_ref, b.created_at
       from bookings b join listings l on l.id = b.listing_id
      order by b.created_at desc limit 200`,
  );
  return res.rows.map((r) => ({
    id: r.id, listingId: r.listing_id, listingTitle: r.title,
    listingCity: r.city, checkIn: r.check_in, checkOut: r.check_out,
    guests: r.guests, status: r.status, holdExpiresAt: r.hold_expires_at,
    totalCents: r.total_cents, currency: r.currency,
    source: r.source, partnerRef: r.partner_ref,
    priceBreakdown: r.price_breakdown, guestName: r.guest_name,
    guestEmail: r.guest_email, createdAt: r.created_at,
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
            b.currency, b.price_breakdown, b.guest_name, b.guest_email,
            b.source, b.partner_ref, b.created_at
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
    priceBreakdown: r.price_breakdown,
    guestName: r.guest_name,
    guestEmail: r.guest_email,
    createdAt: r.created_at,
  };
}
