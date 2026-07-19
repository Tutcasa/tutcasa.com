"use server";

import { getListingsRepo } from "@/modules/listings";
import { quote, type Quote } from "@/modules/pricing";
import { createBookingHold, type ReserveResult } from "@/modules/bookings";

export type QuoteResult =
  | { ok: true; quote: Quote }
  | { ok: false; error: "INVALID_DATES" | "MIN_STAY_NOT_MET" | "LISTING_NOT_FOUND" };

/** Live price quote — always recomputed from the stored rate. */
export async function getQuoteAction(
  slug: string,
  checkIn: string,
  checkOut: string,
): Promise<QuoteResult> {
  const listing = await getListingsRepo().bySlug(slug);
  if (!listing) return { ok: false, error: "LISTING_NOT_FOUND" };
  try {
    const q = quote(listing, new Date(`${checkIn}T00:00:00Z`), new Date(`${checkOut}T00:00:00Z`));
    return { ok: true, quote: q };
  } catch (e) {
    const msg = (e as Error).message;
    return { ok: false, error: msg === "MIN_STAY_NOT_MET" ? "MIN_STAY_NOT_MET" : "INVALID_DATES" };
  }
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
