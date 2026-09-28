"use server";

import { headers } from "next/headers";
import { overLimit } from "@/lib/rate-limit";

import { resolveStayQuote, type StayQuoteError } from "@/modules/pricing/resolve";
import type { Quote } from "@/modules/pricing";
import { createBookingHold, type ReserveResult } from "@/modules/bookings";
import { checkCoupon } from "@/modules/coupons";

export type QuoteResult =
  | { ok: true; quote: Quote }
  | { ok: false; error: StayQuoteError; minStay?: number };

/**
 * Live price quote — always recomputed server-side from the stored
 * rates + the admin's pricing configuration (fees, discounts, deposits).
 */
export async function getQuoteAction(
  slug: string,
  checkIn: string,
  checkOut: string,
  guests = 2,
  addonIds?: string[],
): Promise<QuoteResult> {
  const res = await resolveStayQuote(slug, checkIn, checkOut, Math.max(1, guests), undefined,
    { commissionPct: (await (await import("@/modules/partners")).visitorCommission())?.pct, addonIds });
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
  giftCardCode?: string;
  extras?: string[];
  addonIds?: string[];
}): Promise<ReserveResult> {
  const ip = (await headers()).get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  if (overLimit(`reserve:${ip}`, 8, 10 * 60 * 1000)) return { ok: false, error: "DATES_TAKEN" };
  const via = await (await import("@/modules/partners")).visitorCommission();
  return createBookingHold({
    ...input,
    marketingRef: via?.code,
    marketingCommissionPct: via?.pct,
  });
}

export type CouponResult =
  | { ok: true; code: string; discount: number;
      /** the stay's lines WITHOUT the sale discounts the coupon replaces */
      lines?: { n: string; m: string; a: number }[] }
  | { ok: false; message: string };

/** Validate a coupon against a live stay quote (server-side, always). */
export async function validateCouponAction(
  code: string,
  slug: string,
  checkIn: string,
  checkOut: string,
  guests: number,
  guestEmail?: string,
  addonIds?: string[],
): Promise<CouponResult> {
  const ip = (await headers()).get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  if (overLimit(`coupon:${ip}`, 15, 10 * 60 * 1000)) {
    return { ok: false, message: "Too many coupon attempts — try again in a few minutes." };
  }
  const pct = (await (await import("@/modules/partners")).visitorCommission())?.pct;
  // the coupon replaces any sale discount, so validate against the plain
  // (undiscounted) price and tell the checkout how much sale discount it
  // must add back to its running total
  const res = await resolveStayQuote(slug, checkIn, checkOut, Math.max(1, guests), undefined,
    { commissionPct: pct, noSaleDiscounts: true, addonIds });
  if (!res.ok) return { ok: false, message: "Add valid dates first." };

  const cp = await checkCoupon(code, {
    nights: res.quote.nights,
    totalCents: res.quote.totalCents,
    listingId: res.listing.id,
    guestEmail,
    saleDiscountCents: 0,
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
  const { stayCheckoutLines } = await import("@/modules/pricing/checkout-lines");
  return {
    ok: true, code: cp.code, discount: Math.round(cp.discountCents / 100),
    lines: stayCheckoutLines(res.quote, { guests: Math.max(1, guests), checkIn, checkOut }),
  };
}

/** Checkout: validate a gift card code and report its balance. */
export async function validateGiftCardAction(code: string): Promise<{
  ok: boolean; last4?: string; balanceUSD?: number; message?: string;
}> {
  const { checkGiftCard } = await import("@/modules/giftcards");
  const res = await checkGiftCard(String(code ?? ""));
  if (!res.ok) {
    return {
      ok: false,
      message: res.reason === "EMPTY" ? "That gift card has no balance left."
        : res.reason === "EXPIRED" ? "That gift card has expired."
        : "We couldn\u2019t find that gift card \u2014 check the code.",
    };
  }
  return { ok: true, last4: res.last4, balanceUSD: Math.round((res.balanceCents ?? 0) / 100) };
}
