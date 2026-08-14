"use server";

import { resolveStayQuote, type StayQuoteError } from "@/modules/pricing/resolve";
import type { Quote } from "@/modules/pricing";
import { createBookingHold, type ReserveResult } from "@/modules/bookings";
import { checkCoupon } from "@/modules/coupons";

export type QuoteResult =
  | { ok: true; quote: Quote }
  | { ok: false; error: StayQuoteError };

/**
 * Live price quote — always recomputed server-side from the stored
 * rates + the admin's pricing configuration (fees, discounts, deposits).
 */
export async function getQuoteAction(
  slug: string,
  checkIn: string,
  checkOut: string,
  guests = 2,
): Promise<QuoteResult> {
  const res = await resolveStayQuote(slug, checkIn, checkOut, Math.max(1, guests));
  if (!res.ok) return res;
  return { ok: true, quote: res.quote };
}

export async function reserveAction(input: {
  listingSlug: string;
  checkIn: string;
  checkOut: string;
  guests: number;
  guestName: string;
  guestEmail: string;
  guestPhone?: string;
  couponCode?: string;
}): Promise<ReserveResult> {
  return createBookingHold(input);
}

export type CouponResult =
  | { ok: true; code: string; discount: number } // discount in display units
  | { ok: false; message: string };

/** Validate a coupon against a live stay quote (server-side, always). */
export async function validateCouponAction(
  code: string,
  slug: string,
  checkIn: string,
  checkOut: string,
  guests: number,
): Promise<CouponResult> {
  const res = await resolveStayQuote(slug, checkIn, checkOut, Math.max(1, guests));
  if (!res.ok) return { ok: false, message: "Add valid dates first." };
  const cp = await checkCoupon(code, res.quote.nights, res.quote.totalCents);
  if (!cp.ok) {
    const msg =
      cp.reason === "EXPIRED" ? "That coupon has expired."
      : cp.reason === "USED_UP" ? "That coupon has reached its usage limit."
      : cp.reason === "MIN_NIGHTS" ? `That coupon needs a stay of ${cp.minNights}+ nights.`
      : "We don't recognize that coupon code.";
    return { ok: false, message: msg };
  }
  return { ok: true, code: cp.code, discount: Math.round(cp.discountCents / 100) };
}
