"use server";

import { headers } from "next/headers";
import { overLimit } from "@/lib/rate-limit";

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
  const ip = (await headers()).get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  if (overLimit(`reserve:${ip}`, 8, 10 * 60 * 1000)) return { ok: false, error: "DATES_TAKEN" };
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
  guestEmail?: string,
): Promise<CouponResult> {
  const ip = (await headers()).get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  if (overLimit(`coupon:${ip}`, 15, 10 * 60 * 1000)) {
    return { ok: false, message: "Too many coupon attempts — try again in a few minutes." };
  }
  const res = await resolveStayQuote(slug, checkIn, checkOut, Math.max(1, guests));
  if (!res.ok) return { ok: false, message: "Add valid dates first." };
  const cp = await checkCoupon(code, {
    nights: res.quote.nights,
    totalCents: res.quote.totalCents,
    listingId: res.listing.id,
    guestEmail,
    saleDiscountCents: res.quote.lengthDiscountCents + res.quote.earlyBirdDiscountCents,
  });
  if (!cp.ok) {
    const msg =
      cp.reason === "EXPIRED" ? "That coupon has expired."
      : cp.reason === "USED_UP" ? "That coupon has reached its usage limit."
      : cp.reason === "MIN_NIGHTS" ? `That coupon needs a stay of ${cp.minNights}+ nights.`
      : cp.reason === "LISTING_ONLY" ? "That coupon is only valid for a different home."
      : cp.reason === "USER_LIMIT" ? "You've already used this coupon the maximum number of times."
      : cp.reason === "WRONG_EMAIL" ? "That coupon is tied to a different email address."
      : cp.reason === "NEEDS_EMAIL" ? "Enter your email above first — this coupon is tied to a specific email."
      : cp.reason === "NO_SALE_STACK" ? "That coupon can't be combined with a stay that already has a discount."
      : "We don't recognize that coupon code.";
    return { ok: false, message: msg };
  }
  return { ok: true, code: cp.code, discount: Math.round(cp.discountCents / 100) };
}
