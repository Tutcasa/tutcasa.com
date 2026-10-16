import { getDb } from "@/lib/db";
import {
  computeQuote,
  defaultPricingConfig,
  type FeeMode,
  type NightRate,
  type Quote, weekendRate } from "./engine";

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
  /** minStay: the minimum that applies to THESE dates (season / PriceLabs / home) */
  | { ok: false; error: StayQuoteError; minStay?: number };

const DAY_MS = 86_400_000;
const YMD = /^\d{4}-\d{2}-\d{2}$/;

export async function resolveStayQuote(
  slug: string,
  checkIn: string,
  checkOut: string,
  guests: number,
  bookedAt?: Date,
  opts?: {
    skipAvailability?: boolean; applyCommission?: boolean; commissionPct?: number; addonIds?: string[];
    /** coupon in play: the coupon is the ONLY discount — early-bird and
        weekly/monthly pricing are switched off (owner's rule: never stack) */
    noSaleDiscounts?: boolean;
  },
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
            p.deposit_pct, p.second_payment_days, p.third_party_commission_pct,
            p.early_checkin_cents, p.late_checkout_cents
       from listings l
       left join listing_pricing p on p.listing_id = l.id
      where l.slug = $1 and l.status in ('published','unlisted')`,
    [slug],
  );
  const L = listingRes.rows[0];
  if (!L) return { ok: false, error: "LISTING_NOT_FOUND" };

  const [ratesRes, daysRes] = await Promise.all([
    db.query(
      `select nightly_cents, cleaning_cents, tax_pct, currency, min_stay,
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

  // third-party marketing commission. Partner-API bookings (applyCommission)
  // use the LISTING's pct as a price MARK-UP; visitor-attributed bookings
  // (?via=CODE links) pass the PARTNER's pct explicitly. Additionally, when
  // the listing's pricing has a commission % set, EVERY other booking
  // RECORDS that % (admin-side bookkeeping — the guest price is untouched);
  // see the fallback after the quote below.
  const commissionPct = opts?.applyCommission
    ? Number(L.third_party_commission_pct ?? 0)
    : Number(opts?.commissionPct ?? 0);
  const withCommission = (cents: number) =>
    commissionPct > 0 ? Math.round(cents * (1 + commissionPct / 100)) : cents;
  let commissionCents = 0;

  // night-by-night rates: per-date override → seasonal rate → base rate
  const nights: NightRate[] = [];
  // the stay needs the highest per-night minimum (each night: its season's
  // minimum if the admin set one — that overrides the home's and PriceLabs' —
  // otherwise the home's minimum or PriceLabs' for that date, whichever is higher)
  let minStay = 0;
  const start = new Date(`${checkIn}T00:00:00Z`).getTime();
  const end = new Date(`${checkOut}T00:00:00Z`).getTime();
  for (let t = start; t < end; t += DAY_MS) {
    const day = new Date(t).toISOString().slice(0, 10);
    const o = byDay.get(day);
    if (o?.is_blocked) return { ok: false, error: "DATES_TAKEN" };
    const season = seasons.find((s) => day >= s.from_day && day < s.to_day);
    const nightMin = season?.min_stay != null
      ? season.min_stay
      : Math.max(L.min_stay ?? 1, o?.min_stay ?? 0);
    minStay = Math.max(minStay, nightMin);
    const hostRate = o?.nightly_cents ?? season?.nightly_cents ?? base.nightly_cents;
    const guestRate = withCommission(hostRate);
    commissionCents += guestRate - hostRate;
    nights.push({ date: day, nightlyCents: guestRate });
  }
  if (nights.length < minStay) return { ok: false, error: "MIN_STAY_NOT_MET", minStay };

  // blocked ranges & existing bookings: a quote must never price dates a
  // guest cannot actually book (admins may skip to quote over own blocks)
  if (!opts?.skipAvailability) {
    const clash = await db.query(
      `select 1 from listing_unavailable_ranges($1) r
        where daterange(r.from_date, r.to_date) && daterange($2::date, $3::date)
        limit 1`,
      [L.id, checkIn, checkOut],
    );
    if (clash.rows[0]) return { ok: false, error: "DATES_TAKEN" };
  }

  // guest-selected extra options — priced server-side from the listing's
  // own add-on rows (ids from the client are never trusted for prices)
  let addons: { name: string; priceCents: number; mode: import("./engine").AddonMode }[] | undefined;
  if (opts?.addonIds?.length) {
    const ar = await db.query(
      `select name, price_cents, mode from listing_addons
        where listing_id=$1 and active and id = any($2::uuid[]) order by sort`,
      [L.id, opts.addonIds.filter((x) => /^[0-9a-f-]{36}$/i.test(x))],
    );
    addons = ar.rows.map((r) => ({
      name: r.name as string,
      priceCents: r.price_cents as number,
      mode: r.mode as import("./engine").AddonMode,
    }));

  }

  const quote = computeQuote({
    nights,
    guests,
    addons,
    checkIn: new Date(`${checkIn}T00:00:00Z`),
    bookedAt,
    config: defaultPricingConfig({
      cleaningCents: base.cleaning_cents,
      taxPct: Number(base.tax_pct),
      currency: base.currency,
      weekendPct: Number(L.weekend_pct ?? 0),
      weekendCents: L.weekend_cents ?? 0,
      weeklyNightlyCents: opts?.noSaleDiscounts ? 0 : (L.weekly_nightly_cents ?? 0),
      monthlyNightlyCents: opts?.noSaleDiscounts ? 0 : (L.monthly_nightly_cents ?? 0),
      extraGuestCents: L.extra_guest_cents ?? 0,
      extraGuestAfter: L.extra_guest_after ?? 0,
      cleaningFeeMode: (L.cleaning_fee_mode ?? "single") as FeeMode,
      cityFeeCents: L.city_fee_cents ?? 0,
      cityFeeMode: (L.city_fee_mode ?? "single") as FeeMode,
      securityDepositCents: L.security_deposit_cents ?? 0,
      weeklyDiscountPct: opts?.noSaleDiscounts ? 0 : Number(L.weekly_discount_pct ?? 0),
      monthlyDiscountPct: opts?.noSaleDiscounts ? 0 : Number(L.monthly_discount_pct ?? 0),
      earlyBirdPct: opts?.noSaleDiscounts ? 0 : Number(L.early_bird_pct ?? 0),
      earlyBirdMinDays: L.early_bird_min_days ?? 0,
      depositPct: Number(L.deposit_pct ?? 100),
      secondPaymentDays: L.second_payment_days ?? 0,
    }),
  });

  quote.thirdPartyCommissionCents = commissionCents;

  // listing-level commission % applies to EVERY booking automatically:
  // when no partner/affiliate commission was marked up above, RECORD the
  // listing's pct (of the pre-tax total) for the admin books — the guest
  // price is untouched
  if (!commissionCents) {
    const autoPct = Number(L.third_party_commission_pct ?? 0);
    if (autoPct > 0) {
      quote.thirdPartyCommissionCents = Math.max(
        0, Math.round((quote.totalCents - quote.taxCents) * (autoPct / 100)));
    }
  }

  return {
    ok: true,
    quote,
    listing: { id: L.id, slug: L.slug, title: L.title, city: L.city, maxGuests: L.max_guests, instantBook: L.instant_book },
  };
}

/** Is the night before check-in / the night of check-out day free of
    other bookings and blocks? (unavailable ranges are [from, to) nights) */
export async function adjacentNightsFree(
  listingId: string, checkIn: string, checkOut: string,
): Promise<{ before: boolean; after: boolean }> {
  const r = await getDb().query<{ before_busy: boolean; after_busy: boolean }>(
    `select
       exists(select 1 from listing_unavailable_ranges($1) u
               where daterange(u.from_date, u.to_date) @> ($2::date - 1)) as before_busy,
       exists(select 1 from listing_unavailable_ranges($1) u
               where daterange(u.from_date, u.to_date) @> $3::date) as after_busy`,
    [listingId, checkIn, checkOut],
  );
  return { before: !r.rows[0].before_busy, after: !r.rows[0].after_busy };
}

/**
 * The guest calendar's day prices: what each bookable night costs BEFORE
 * taxes — same order as quotes (per-date/PriceLabs → season → base) plus the
 * weekend rule. Blocked days are left out. Also each upcoming season's real
 * "from" price over its dates (on PriceLabs homes that's PriceLabs' price,
 * not the season number typed in admin).
 */
export async function guestCalendarPrices(listingId: string, days = 730): Promise<{
  days: Record<string, number>;
  seasons: { label: string; from: string; to: string; minCents: number; maxCents: number }[];
}> {
  const db = getDb();
  const [eff, cfg, seasons] = await Promise.all([
    db.query<{ day: string; n: number }>(
      `with base as (select nightly_cents from listing_rates where listing_id=$1 and season is null)
       select to_char(gs.day,'YYYY-MM-DD') as day, coalesce(pd.nightly_cents, sr.nightly_cents, b.nightly_cents) as n
         from generate_series(current_date, current_date + ($2 || ' days')::interval, interval '1 day') gs(day)
        cross join base b
         left join listing_price_days pd on pd.listing_id=$1 and pd.day = gs.day::date
         left join lateral (
                select r.nightly_cents from listing_rates r
                 where r.listing_id=$1 and r.season is not null and r.season @> gs.day::date
                 order by lower(r.season) desc limit 1) sr on true
        where not coalesce(pd.is_blocked, false)`,
      [listingId, String(days)]),
    db.query<{ weekend_cents: number | null; weekend_pct: string | null }>(
      "select weekend_cents, weekend_pct from listing_pricing where listing_id=$1", [listingId]),
    db.query<{ label: string | null; f: string; t: string }>(
      `select label, to_char(greatest(lower(season), current_date),'YYYY-MM-DD') as f,
              to_char(upper(season) - 1,'YYYY-MM-DD') as t
         from listing_rates where listing_id=$1 and season is not null and upper(season) > current_date
        order by lower(season)`, [listingId]),
  ]);
  const wk = { weekendCents: Number(cfg.rows[0]?.weekend_cents ?? 0), weekendPct: Number(cfg.rows[0]?.weekend_pct ?? 0) };
  const daysMap: Record<string, number> = {};
  for (const r of eff.rows) if (r.n != null) daysMap[r.day] = weekendRate(Number(r.n), r.day, wk);
  const out = [];
  for (const s of seasons.rows) {
    const prices = Object.entries(daysMap).filter(([d]) => d >= s.f && d <= s.t).map(([, c]) => c);
    if (!prices.length) continue; // fully booked/blocked or beyond the window
    out.push({ label: s.label || "Season", from: s.f, to: s.t, minCents: Math.min(...prices), maxCents: Math.max(...prices) });
  }
  return { days: daysMap, seasons: out };
}

export interface AdvertisedNightly {
  /** the CHEAPEST pre-tax nightly across the next 12 months (override →
      season → base) — powers "from $X / night" so period prices show */
  minCents: number;
  /** true when some upcoming period is priced differently */
  varies: boolean;
  taxPct: number;
  cleaningCents: number;
}

/** Advertised nightly pricing for the listing page's booking box.
    Computes the per-day EFFECTIVE rate (override → season → base) for
    each of the next 365 days and takes min/max over bookable days —
    so "from $X" is always a price some real date actually costs.
    Returns null when the listing has no base rate row. */
export async function advertisedNightly(listingId: string): Promise<AdvertisedNightly | null> {
  const db = getDb();
  const res = await db.query(
    `with base as (
       select nightly_cents, tax_pct, cleaning_cents from listing_rates
        where listing_id=$1 and season is null),
     eff as (
       select coalesce(pd.nightly_cents, sr.nightly_cents, b.nightly_cents) as n
         from generate_series(current_date, current_date + interval '364 days', interval '1 day') gs(day)
        cross join base b
         left join listing_price_days pd
                on pd.listing_id=$1 and pd.day = gs.day::date
         left join lateral (
                select r.nightly_cents from listing_rates r
                 where r.listing_id=$1 and r.season is not null and r.season @> gs.day::date
                 order by lower(r.season) desc limit 1) sr on true
        where not coalesce(pd.is_blocked, false))
     select (select min(n) from eff) as min_cents,
            (select max(n) from eff) as max_cents,
            (select tax_pct from base) as tax_pct,
            (select cleaning_cents from base) as cleaning_cents`,
    [listingId],
  );
  const r = res.rows[0];
  if (!r || r.min_cents == null) return null;
  return {
    minCents: Number(r.min_cents),
    varies: Number(r.max_cents) !== Number(r.min_cents),
    taxPct: Number(r.tax_pct ?? 0),
    cleaningCents: Number(r.cleaning_cents ?? 0),
  };
}
