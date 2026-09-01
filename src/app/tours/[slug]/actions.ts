"use server";

import { headers } from "next/headers";
import { overLimit } from "@/lib/rate-limit";

import { createTourBooking, type TourReserveResult } from "@/modules/tours";

export async function reserveTourAction(input: {
  tourSlug: string;
  tourDate: string;
  groupSize: number;
  guestName: string;
  guestEmail: string;
  guestPhone?: string;
  addons?: string[];
  notes?: string;
  couponCode?: string;
}): Promise<TourReserveResult> {
  const ip = (await headers()).get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  if (overLimit(`reserve:${ip}`, 8, 10 * 60 * 1000)) return { ok: false, error: "INVALID_DATE" };
  return createTourBooking(input);
}

export interface TourCouponResult {
  ok: boolean;
  code?: string;
  /** whole display units of the tour currency */
  discount?: number;
  message?: string;
}

/** Validate a coupon against a tour cart (mirrors the stay validator). */
export async function validateTourCouponAction(
  code: string,
  tourSlug: string,
  groupSize: number,
  addons?: string[],
  guestEmail?: string,
): Promise<TourCouponResult> {
  const ip = (await headers()).get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  if (overLimit(`coupon:${ip}`, 15, 10 * 60 * 1000)) {
    return { ok: false, message: "Too many coupon attempts — try again in a few minutes." };
  }
  const { quoteTourTotal } = await import("@/modules/tours");
  const q = await quoteTourTotal(tourSlug, Math.max(1, groupSize), addons);
  if (!q) return { ok: false, message: "This tour can't be priced — contact us instead." };
  const { checkCoupon } = await import("@/modules/coupons");
  const cp = await checkCoupon(code, { nights: 0, totalCents: q.totalCents, guestEmail });
  if (!cp.ok) {
    const msg =
      cp.reason === "EXPIRED" ? "That coupon has expired."
      : cp.reason === "USED_UP" ? "That coupon has reached its usage limit."
      : cp.reason === "MIN_NIGHTS" ? "That coupon is for stays only."
      : cp.reason === "LISTING_ONLY" ? "That coupon only works for a specific home."
      : cp.reason === "NEEDS_EMAIL" ? "Enter your email above first — this coupon is personal."
      : cp.reason === "WRONG_EMAIL" ? "That coupon is tied to a different email address."
      : cp.reason === "USER_LIMIT" ? "You have already used this coupon."
      : cp.reason === "NO_SALE_STACK" ? "That coupon can't be combined with sale prices."
      : "That coupon doesn't exist or is switched off.";
    return { ok: false, message: msg };
  }
  return { ok: true, code: cp.code, discount: Math.round(cp.discountCents / 100) };
}
