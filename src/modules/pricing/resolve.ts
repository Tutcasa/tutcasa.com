import { getDb } from "@/lib/db";
import {
  computeQuote,
  defaultPricingConfig,
  type FeeMode,
  type NightRate,
  type Quote,
} from "./engine";

/**
 * Server-side quote resolver — the bridge between the admin's pricing
 * configuration and the pure engine. Loads, per listing:
 *   base + seasonal rates (listing_rates)
 *   the fee/discount/deposit schedule   (listing_pricing)
 *   per-date overrides & blocked nights (listing_price_days)
 * builds the night-by-night rate list and lets the engine do the math.
 * Guests never see a price the server didn't compute from the database.
 */

export type StayQuoteError =
  | "LISTING_NOT_FOUND"
  | "INVALID_DATES"
  | "MIN_STAY_NOT_MET"
  | "DATES_TAKEN";

export type StayQuoteResult =
  | {
      ok: true;
      quote: Quote;
      listing: { id: string; slug: string; title: string; city: string; maxGuests: number; instantBook: boolean };
    }
  | { ok: false; error: StayQuoteError };

const DAY_MS = 86_400_000;
const YMD = /^\d{4}-\d{2}-\d{2}$/;

export async function resolveStayQuote(
  slug: string,
  checkIn: string,
  checkOut: string,
  guests: number,
  bookedAt?: Date,
): Promise<StayQuoteResult> {
  if (!YMD.test(checkIn) || !YMD.test(checkOut) || checkOut <= checkIn) {
    return { ok: false, error: "INVALID_DATES" };
  }

  const db = getDb();
  const listingRes = await db.query(
    `select l.id, l.slug, l.title, l.city, l.max_guests, l.min_stay,
            coalesce(l.instant_book,false) as instant_book,
            p.weekend_pct, p.weekend_cents, p.weekly_nightly_cents,
            p.monthly_nightly_cents, p.extra_guest_cents, p.extra_guest_after,
            p.cleaning_fee_mode, p.city_fee_cents, p.city_fee_mode,
            p.security_deposit_cents, p.weekly_discount_pct,
            p.monthly_discount_pct, p.early_bird_pct, p.early_bird_min_days,
            p.deposit_pct, p.second_payment_days
       from listings l
       left join listing_pricing p on p.listing_id = l.id
      where l.slug = $1 and l.status in ('published','unlisted')`,
    [slug],
  );
  const L = listingRes.rows[0];
  if (!L) return { ok: false, error: "LISTING_NOT_FOUND" };

  const [ratesRes, daysRes] = await Promise.all([
    db.query(
      `select nightly_cents, cleaning_cents, tax_pct, currency,
              season is null as is_base,
              to_char(lower(season),'YYYY-MM-DD') as from_day,
              to_char(upper(season),'YYYY-MM-DD') as to_day
         from listing_rates where listing_id = $1`,
      [L.id],
    ),
    db.query(
      `select to_char(day,'YYYY-MM-DD') as day, nightly_cents, min_stay, is_blocked
         from listing_price_days
        where listing_id = $1 and day >= $2::date and day < $3::date`,
      [L.id, checkIn, checkOut],
    ),
  ]);

  const base = ratesRes.rows.find((r) => r.is_base);
  if (!base) return { ok: false, error: "LISTING_NOT_FOUND" }; // unpriced listing
  const seasons = ratesRes.rows.filter((r) => !r.is_base);
  const byDay = new Map(daysRes.rows.map((d) => [d.day, d]));

  // night-by-night rates: per-date override → seasonal rate → base rate
  const nights: NightRate[] = [];
  let minStay: number = L.min_stay;
  const start = new Date(`${checkIn}T00:00:00Z`).getTime();
  const end = new Date(`${checkOut}T00:00:00Z`).getTime();
  for (let t = start; t < end; t += DAY_MS) {
    const day = new Date(t).toISOString().slice(0, 10);
    const o = byDay.get(day);
    if (o?.is_blocked) return { ok: false, error: "DATES_TAKEN" };
    if (o?.min_stay != null) minStay = Math.max(minStay, o.min_stay);
    const season = seasons.find((s) => day >= s.from_day && day < s.to_day);
    nights.push({
      date: day,
      nightlyCents: o?.nightly_cents ?? season?.nightly_cents ?? base.nightly_cents,
    });
  }
  if (nights.length < minStay) return { ok: false, error: "MIN_STAY_NOT_MET" };

  const quote = computeQuote({
    nights,
    guests,
    checkIn: new Date(`${checkIn}T00:00:00Z`),
    bookedAt,
    config: defaultPricingConfig({
      cleaningCents: base.cleaning_cents,
      taxPct: Number(base.tax_pct),
      currency: base.currency,
      weekendPct: Number(L.weekend_pct ?? 0),
      weekendCents: L.weekend_cents ?? 0,
      weeklyNightlyCents: L.weekly_nightly_cents ?? 0,
      monthlyNightlyCents: L.monthly_nightly_cents ?? 0,
      extraGuestCents: L.extra_guest_cents ?? 0,
      extraGuestAfter: L.extra_guest_after ?? 0,
      cleaningFeeMode: (L.cleaning_fee_mode ?? "single") as FeeMode,
      cityFeeCents: L.city_fee_cents ?? 0,
      cityFeeMode: (L.city_fee_mode ?? "single") as FeeMode,
      securityDepositCents: L.security_deposit_cents ?? 0,
      weeklyDiscountPct: Number(L.weekly_discount_pct ?? 0),
      monthlyDiscountPct: Number(L.monthly_discount_pct ?? 0),
      earlyBirdPct: Number(L.early_bird_pct ?? 0),
      earlyBirdMinDays: L.early_bird_min_days ?? 0,
      depositPct: Number(L.deposit_pct ?? 100),
      secondPaymentDays: L.second_payment_days ?? 0,
    }),
  });

  return {
    ok: true,
    quote,
    listing: { id: L.id, slug: L.slug, title: L.title, city: L.city, maxGuests: L.max_guests, instantBook: L.instant_book },
  };
}
