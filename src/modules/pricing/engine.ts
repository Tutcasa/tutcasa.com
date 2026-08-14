/**
 * Pricing engine — the full TutCasa price model (client feature spec parity).
 *
 * Pure module: no imports, no I/O. Callers resolve per-night rates from the DB
 * (base rate → seasonal rate → listing_price_days override) and pass them in;
 * the engine only computes. All money is integer cents; every intermediate
 * money value is rounded with Math.round.
 *
 * Computation order (matches the old WpRentals site's behavior):
 *   1. per-night accommodation, weekend nights (Sat/Sun) marked up by weekendPct
 *   2. length-of-stay discount — 30+ nights → monthly, else 7+ → weekly
 *   3. early-bird discount — booked ≥ earlyBirdMinDays before check-in
 *   4. fees — extra-guest (per guest over the included count, per night),
 *      cleaning (single | per_night), city fee (single | per_night)
 *   5. add-ons — flat | per_night | per_guest | per_guest_night
 *   6. tax on everything above ("taxes applied all over website")
 *   7. security deposit — refundable hold, NOT taxed, NOT in totalCents
 *   8. payment schedule — depositPct due now, balance due secondPaymentDays
 *      before check-in
 */

export type FeeMode = "single" | "per_night";
export type AddonMode = "flat" | "per_night" | "per_guest" | "per_guest_night";

/** One night of the stay with its already-resolved base rate. */
export interface NightRate {
  /** YYYY-MM-DD (the night's date, i.e. the check-in date of that night) */
  date: string;
  nightlyCents: number;
}

export interface PricingConfig {
  /** extra % added to Sat/Sun nights (0 = off) */
  weekendPct: number;
  /** fee per guest per night, charged for guests beyond extraGuestAfter */
  extraGuestCents: number;
  /** guests included before the extra-guest fee applies */
  extraGuestAfter: number;
  cleaningCents: number;
  cleaningFeeMode: FeeMode;
  cityFeeCents: number;
  cityFeeMode: FeeMode;
  /** refundable hold — reported separately, never taxed, never in total */
  securityDepositCents: number;
  /** % off accommodation for 7+ night stays */
  weeklyDiscountPct: number;
  /** % off accommodation for 30+ night stays (wins over weekly) */
  monthlyDiscountPct: number;
  /** % off accommodation when booked early enough */
  earlyBirdPct: number;
  earlyBirdMinDays: number;
  /** % of total due at booking; 100 = pay in full */
  depositPct: number;
  /** days before check-in the balance is due (when depositPct < 100) */
  secondPaymentDays: number;
  taxPct: number;
  currency: string;
}

/** An add-on the guest selected, with its pricing rule. */
export interface AddonSelection {
  name: string;
  priceCents: number;
  mode: AddonMode;
}

export interface QuoteInput {
  /** resolved per-night rates, in check-in → check-out order (≥ 1 night) */
  nights: NightRate[];
  guests: number;
  config: PricingConfig;
  addons?: AddonSelection[];
  /** when the booking is being made — drives early-bird (default: now) */
  bookedAt?: Date;
  /** check-in date — drives early-bird + second-payment due date */
  checkIn: Date;
}

export interface AddonLine extends AddonSelection {
  totalCents: number;
}

export interface PaymentSchedule {
  /** amount to charge at booking time */
  dueNowCents: number;
  /** remaining balance (0 when depositPct = 100) */
  balanceCents: number;
  /** when the balance is due; null when there is no balance */
  balanceDueDate: Date | null;
}

export interface Quote {
  // ---- legacy fields (kept stable for existing callers) ----
  nights: number;
  nightlyCents: number; // first night's base rate (display: "from $X/night")
  accommodationCents: number; // after weekend markup, before discounts
  cleaningCents: number;
  taxCents: number;
  totalCents: number;
  currency: string;
  // ---- full breakdown ----
  weekendUpliftCents: number; // portion of accommodation from weekend markup
  lengthDiscountCents: number;
  lengthDiscountKind: "monthly" | "weekly" | null;
  earlyBirdDiscountCents: number;
  extraGuestFeeCents: number;
  cityFeeCents: number;
  addonLines: AddonLine[];
  addonsCents: number;
  securityDepositCents: number; // refundable — excluded from totalCents
  schedule: PaymentSchedule;
}

const DAY_MS = 86_400_000;

export function defaultPricingConfig(
  partial?: Partial<PricingConfig>,
): PricingConfig {
  return {
    weekendPct: 0,
    extraGuestCents: 0,
    extraGuestAfter: 0,
    cleaningCents: 0,
    cleaningFeeMode: "single",
    cityFeeCents: 0,
    cityFeeMode: "single",
    securityDepositCents: 0,
    weeklyDiscountPct: 0,
    monthlyDiscountPct: 0,
    earlyBirdPct: 0,
    earlyBirdMinDays: 0,
    depositPct: 100,
    secondPaymentDays: 0,
    taxPct: 0,
    currency: "USD",
    ...partial,
  };
}

/** Saturday or Sunday night (UTC calendar day of the night's date). */
export function isWeekendNight(date: string): boolean {
  const dow = new Date(`${date}T00:00:00Z`).getUTCDay();
  return dow === 0 || dow === 6;
}

function feeTotal(cents: number, mode: FeeMode, nights: number): number {
  return mode === "per_night" ? cents * nights : cents;
}

function addonTotal(a: AddonSelection, nights: number, guests: number): number {
  switch (a.mode) {
    case "flat":
      return a.priceCents;
    case "per_night":
      return a.priceCents * nights;
    case "per_guest":
      return a.priceCents * guests;
    case "per_guest_night":
      return a.priceCents * guests * nights;
  }
}

export function computeQuote(input: QuoteInput): Quote {
  const { nights, guests, config, checkIn } = input;
  const n = nights.length;
  if (n < 1) throw new Error("INVALID_DATES");
  if (guests < 1) throw new Error("INVALID_GUESTS");
  const bookedAt = input.bookedAt ?? new Date();

  // 1. accommodation with weekend markup
  let accommodationCents = 0;
  let weekendUpliftCents = 0;
  for (const night of nights) {
    let rate = night.nightlyCents;
    if (config.weekendPct > 0 && isWeekendNight(night.date)) {
      const uplift = Math.round(rate * (config.weekendPct / 100));
      weekendUpliftCents += uplift;
      rate += uplift;
    }
    accommodationCents += rate;
  }

  // 2. length-of-stay discount (monthly wins over weekly)
  let lengthDiscountCents = 0;
  let lengthDiscountKind: Quote["lengthDiscountKind"] = null;
  if (n >= 30 && config.monthlyDiscountPct > 0) {
    lengthDiscountCents = Math.round(
      accommodationCents * (config.monthlyDiscountPct / 100),
    );
    lengthDiscountKind = "monthly";
  } else if (n >= 7 && config.weeklyDiscountPct > 0) {
    lengthDiscountCents = Math.round(
      accommodationCents * (config.weeklyDiscountPct / 100),
    );
    lengthDiscountKind = "weekly";
  }

  // 3. early-bird discount (on accommodation net of length discount)
  let earlyBirdDiscountCents = 0;
  if (config.earlyBirdPct > 0) {
    const daysAhead = Math.floor(
      (checkIn.getTime() - bookedAt.getTime()) / DAY_MS,
    );
    if (daysAhead >= config.earlyBirdMinDays) {
      earlyBirdDiscountCents = Math.round(
        (accommodationCents - lengthDiscountCents) * (config.earlyBirdPct / 100),
      );
    }
  }

  const accommodationNetCents =
    accommodationCents - lengthDiscountCents - earlyBirdDiscountCents;

  // 4. fees
  const extraGuests = Math.max(0, guests - config.extraGuestAfter);
  const extraGuestFeeCents =
    config.extraGuestCents > 0 ? extraGuests * config.extraGuestCents * n : 0;
  const cleaningCents = feeTotal(config.cleaningCents, config.cleaningFeeMode, n);
  const cityFeeCents = feeTotal(config.cityFeeCents, config.cityFeeMode, n);

  // 5. add-ons
  const addonLines: AddonLine[] = (input.addons ?? []).map((a) => ({
    ...a,
    totalCents: addonTotal(a, n, guests),
  }));
  const addonsCents = addonLines.reduce((s, a) => s + a.totalCents, 0);

  // 6. tax on the whole taxable amount
  const taxableCents =
    accommodationNetCents +
    extraGuestFeeCents +
    cleaningCents +
    cityFeeCents +
    addonsCents;
  const taxCents = Math.round(taxableCents * (config.taxPct / 100));
  const totalCents = taxableCents + taxCents;

  // 8. payment schedule
  const dueNowCents =
    config.depositPct >= 100
      ? totalCents
      : Math.round(totalCents * (config.depositPct / 100));
  const balanceCents = totalCents - dueNowCents;
  const balanceDueDate =
    balanceCents > 0
      ? new Date(checkIn.getTime() - config.secondPaymentDays * DAY_MS)
      : null;

  return {
    nights: n,
    nightlyCents: nights[0].nightlyCents,
    accommodationCents,
    cleaningCents,
    taxCents,
    totalCents,
    currency: config.currency,
    weekendUpliftCents,
    lengthDiscountCents,
    lengthDiscountKind,
    earlyBirdDiscountCents,
    extraGuestFeeCents,
    cityFeeCents,
    addonLines,
    addonsCents,
    securityDepositCents: config.securityDepositCents,
    schedule: { dueNowCents, balanceCents, balanceDueDate },
  };
}

/** Build the per-night list for a date range from a uniform rate. */
export function uniformNights(
  checkIn: Date,
  checkOut: Date,
  nightlyCents: number,
): NightRate[] {
  const out: NightRate[] = [];
  for (
    let t = checkIn.getTime();
    t < checkOut.getTime() - DAY_MS / 2; // guard against DST-ish drift
    t += DAY_MS
  ) {
    out.push({
      date: new Date(t).toISOString().slice(0, 10),
      nightlyCents,
    });
  }
  return out;
}
