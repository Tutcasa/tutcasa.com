import type { Listing } from "@/modules/listings";

/**
 * Pricing module — computes the "all-in, no hidden fees" quote.
 * The brand promise lives here: one honest number, always computed
 * server-side, never trusted from the client.
 */

export interface Quote {
  nights: number;
  nightlyCents: number;
  accommodationCents: number;
  cleaningCents: number;
  taxCents: number;
  totalCents: number;
  currency: string;
}

export function nightsBetween(checkIn: Date, checkOut: Date): number {
  const ms = checkOut.getTime() - checkIn.getTime();
  return Math.round(ms / 86_400_000);
}

export function quote(listing: Listing, checkIn: Date, checkOut: Date): Quote {
  const nights = nightsBetween(checkIn, checkOut);
  if (nights < 1) throw new Error("INVALID_DATES");
  if (nights < listing.minStay) throw new Error("MIN_STAY_NOT_MET");

  const accommodationCents = listing.nightlyCents * nights;
  const cleaningCents = listing.cleaningCents;
  const taxCents = Math.round(
    (accommodationCents + cleaningCents) * (listing.taxPct / 100),
  );

  return {
    nights,
    nightlyCents: listing.nightlyCents,
    accommodationCents,
    cleaningCents,
    taxCents,
    totalCents: accommodationCents + cleaningCents + taxCents,
    currency: listing.currency,
  };
}

/** Display helper: cents → "$1,234" (whole dollars, brand style). */
export function fmtMoney(cents: number, currency = "USD"): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(cents / 100);
}

/** The advertised all-in nightly price used on cards (base + tax share). */
export function allInNightlyCents(listing: Listing): number {
  return Math.round(listing.nightlyCents * (1 + listing.taxPct / 100));
}
