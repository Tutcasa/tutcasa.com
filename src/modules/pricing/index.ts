import type { Listing } from "@/modules/listings";
import {
  computeQuote,
  defaultPricingConfig,
  uniformNights,
  type Quote,
} from "./engine";

/**
 * Pricing module — computes the "all-in, no hidden fees" quote.
 * The brand promise lives here: one honest number, always computed
 * server-side, never trusted from the client.
 *
 * The math lives in ./engine (pure, unit-tested). This file adapts the
 * Listing shape to the engine. Until the M1 pricing config is wired to the
 * DB (listing_pricing / listing_price_days / listing_addons), listings quote
 * with a default config — identical numbers to the pre-M1 engine.
 */

export * from "./engine";

export function nightsBetween(checkIn: Date, checkOut: Date): number {
  const ms = checkOut.getTime() - checkIn.getTime();
  return Math.round(ms / 86_400_000);
}

export function quote(
  listing: Listing,
  checkIn: Date,
  checkOut: Date,
  guests = 1,
): Quote {
  const nights = nightsBetween(checkIn, checkOut);
  if (nights < 1) throw new Error("INVALID_DATES");
  if (nights < listing.minStay) throw new Error("MIN_STAY_NOT_MET");

  return computeQuote({
    nights: uniformNights(checkIn, checkOut, listing.nightlyCents),
    guests,
    checkIn,
    config: defaultPricingConfig({
      cleaningCents: listing.cleaningCents,
      taxPct: listing.taxPct,
      currency: listing.currency,
    }),
  });
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
