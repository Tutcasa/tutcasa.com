"use server";

import { resolveStayQuote, type StayQuoteError } from "@/modules/pricing/resolve";
import type { Quote } from "@/modules/pricing";
import { createBookingHold, type ReserveResult } from "@/modules/bookings";

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
}): Promise<ReserveResult> {
  return createBookingHold(input);
}
