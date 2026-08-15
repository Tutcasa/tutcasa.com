// Pricing engine tests — run with: npm run test:pricing
// (compiles src/modules/pricing/engine.ts standalone, then executes this file)
import test from "node:test";
import assert from "node:assert/strict";
import {
  computeQuote,
  defaultPricingConfig,
  uniformNights,
  isWeekendNight,
} from "../.test-build/engine.js";

const D = (s) => new Date(`${s}T00:00:00Z`);
// 2026-08-14 = Friday, 15 = Saturday, 16 = Sunday
const CI = D("2026-08-14");
const CO = D("2026-08-17"); // 3 nights: Fri, Sat, Sun

function base(over = {}) {
  return {
    nights: uniformNights(CI, CO, 10_000),
    guests: 2,
    checkIn: CI,
    bookedAt: D("2026-08-01"),
    config: defaultPricingConfig({ taxPct: 16, cleaningCents: 5_000 }),
    ...over,
  };
}

test("legacy parity: nightly*nights + cleaning + tax", () => {
  const q = computeQuote(base());
  assert.equal(q.nights, 3);
  assert.equal(q.nightlyCents, 10_000);
  assert.equal(q.accommodationCents, 30_000);
  assert.equal(q.cleaningCents, 5_000);
  assert.equal(q.taxCents, Math.round(35_000 * 0.16)); // 5600
  assert.equal(q.totalCents, 40_600);
  assert.equal(q.currency, "USD");
  // pay-in-full default
  assert.equal(q.schedule.dueNowCents, 40_600);
  assert.equal(q.schedule.balanceCents, 0);
  assert.equal(q.schedule.balanceDueDate, null);
});

test("weekend nights (Sat+Sun) get the weekendPct markup", () => {
  assert.equal(isWeekendNight("2026-08-14"), false); // Fri
  assert.equal(isWeekendNight("2026-08-15"), true); // Sat
  assert.equal(isWeekendNight("2026-08-16"), true); // Sun
  const q = computeQuote(
    base({ config: defaultPricingConfig({ weekendPct: 20 }) }),
  );
  // Fri 10000 + Sat 12000 + Sun 12000
  assert.equal(q.accommodationCents, 34_000);
  assert.equal(q.weekendUpliftCents, 4_000);
  assert.equal(q.totalCents, 34_000);
});

test("weekly discount at 7+ nights", () => {
  const q = computeQuote(
    base({
      nights: uniformNights(D("2026-09-07"), D("2026-09-14"), 10_000),
      checkIn: D("2026-09-07"),
      config: defaultPricingConfig({ weeklyDiscountPct: 10 }),
    }),
  );
  assert.equal(q.lengthDiscountKind, "weekly");
  assert.equal(q.lengthDiscountCents, 7_000);
  assert.equal(q.totalCents, 63_000);
});

test("monthly discount wins over weekly at 30+ nights", () => {
  const q = computeQuote(
    base({
      nights: uniformNights(D("2026-09-01"), D("2026-10-01"), 10_000),
      checkIn: D("2026-09-01"),
      config: defaultPricingConfig({
        weeklyDiscountPct: 10,
        monthlyDiscountPct: 20,
      }),
    }),
  );
  assert.equal(q.nights, 30);
  assert.equal(q.lengthDiscountKind, "monthly");
  assert.equal(q.lengthDiscountCents, 60_000);
});

test("early-bird applies only when booked far enough ahead", () => {
  const cfg = defaultPricingConfig({ earlyBirdPct: 5, earlyBirdMinDays: 60 });
  const far = computeQuote(
    base({ config: cfg, bookedAt: D("2026-05-01"), checkIn: CI }),
  );
  assert.equal(far.earlyBirdDiscountCents, Math.round(30_000 * 0.05));
  const near = computeQuote(
    base({ config: cfg, bookedAt: D("2026-08-01"), checkIn: CI }),
  );
  assert.equal(near.earlyBirdDiscountCents, 0);
});

test("early-bird stacks after length discount", () => {
  const q = computeQuote(
    base({
      nights: uniformNights(D("2026-11-01"), D("2026-11-08"), 10_000),
      checkIn: D("2026-11-01"),
      bookedAt: D("2026-08-01"),
      config: defaultPricingConfig({
        weeklyDiscountPct: 10,
        earlyBirdPct: 5,
        earlyBirdMinDays: 60,
      }),
    }),
  );
  assert.equal(q.lengthDiscountCents, 7_000);
  assert.equal(q.earlyBirdDiscountCents, Math.round(63_000 * 0.05)); // 3150
  assert.equal(q.totalCents, 70_000 - 7_000 - 3_150);
});

test("extra-guest fee charges guests beyond the included count", () => {
  const q = computeQuote(
    base({
      guests: 4,
      config: defaultPricingConfig({
        extraGuestCents: 1_500,
        extraGuestAfter: 2,
      }),
    }),
  );
  // 2 extra guests × 1500 × 3 nights
  assert.equal(q.extraGuestFeeCents, 9_000);
  const included = computeQuote(
    base({
      guests: 2,
      config: defaultPricingConfig({
        extraGuestCents: 1_500,
        extraGuestAfter: 2,
      }),
    }),
  );
  assert.equal(included.extraGuestFeeCents, 0);
});

test("cleaning and city fees honor single vs per_night", () => {
  const q = computeQuote(
    base({
      config: defaultPricingConfig({
        cleaningCents: 2_000,
        cleaningFeeMode: "per_night",
        cityFeeCents: 1_000,
        cityFeeMode: "single",
      }),
    }),
  );
  assert.equal(q.cleaningCents, 6_000);
  assert.equal(q.cityFeeCents, 1_000);
});

test("add-on modes: flat, per_night, per_guest, per_guest_night", () => {
  const q = computeQuote(
    base({
      guests: 3,
      addons: [
        { name: "Airport pickup", priceCents: 5_000, mode: "flat" },
        { name: "Crib", priceCents: 500, mode: "per_night" },
        { name: "Welcome pack", priceCents: 1_000, mode: "per_guest" },
        { name: "Breakfast", priceCents: 800, mode: "per_guest_night" },
      ],
      config: defaultPricingConfig(),
    }),
  );
  const by = Object.fromEntries(q.addonLines.map((a) => [a.name, a.totalCents]));
  assert.equal(by["Airport pickup"], 5_000);
  assert.equal(by["Crib"], 1_500); // 500 × 3 nights
  assert.equal(by["Welcome pack"], 3_000); // 1000 × 3 guests
  assert.equal(by["Breakfast"], 7_200); // 800 × 3 × 3
  assert.equal(q.addonsCents, 16_700);
});

test("tax covers accommodation, fees and add-ons", () => {
  const q = computeQuote(
    base({
      guests: 3,
      addons: [{ name: "Pickup", priceCents: 5_000, mode: "flat" }],
      config: defaultPricingConfig({
        taxPct: 16,
        cleaningCents: 5_000,
        cityFeeCents: 1_000,
        extraGuestCents: 1_000,
        extraGuestAfter: 2,
      }),
    }),
  );
  const taxable = 30_000 + 3_000 + 5_000 + 1_000 + 5_000;
  assert.equal(q.taxCents, Math.round(taxable * 0.16));
  assert.equal(q.totalCents, taxable + q.taxCents);
});

test("security deposit is reported but never taxed or totaled", () => {
  const q = computeQuote(
    base({
      config: defaultPricingConfig({
        taxPct: 16,
        cleaningCents: 5_000,
        securityDepositCents: 20_000,
      }),
    }),
  );
  assert.equal(q.securityDepositCents, 20_000);
  assert.equal(q.totalCents, 40_600); // identical to no-deposit total
});

test("deposit split: dueNow + balance = total, balance due date honored", () => {
  const q = computeQuote(
    base({
      config: defaultPricingConfig({
        taxPct: 16,
        cleaningCents: 5_000,
        depositPct: 30,
        secondPaymentDays: 14,
      }),
    }),
  );
  assert.equal(q.schedule.dueNowCents, Math.round(40_600 * 0.3));
  assert.equal(
    q.schedule.dueNowCents + q.schedule.balanceCents,
    q.totalCents,
  );
  assert.equal(
    q.schedule.balanceDueDate.toISOString().slice(0, 10),
    "2026-07-31", // 14 days before 2026-08-14
  );
});

test("invalid input throws", () => {
  assert.throws(() => computeQuote(base({ nights: [] })), /INVALID_DATES/);
  assert.throws(() => computeQuote(base({ guests: 0 })), /INVALID_GUESTS/);
});

test("uniformNights produces one entry per night with correct dates", () => {
  const nights = uniformNights(CI, CO, 10_000);
  assert.deepEqual(
    nights.map((n) => n.date),
    ["2026-08-14", "2026-08-15", "2026-08-16"],
  );
});

test("fixed weekend nightly replaces the rate (wins over pct)", () => {
  const q = computeQuote(
    base({ config: defaultPricingConfig({ weekendPct: 50, weekendCents: 15_000 }) }),
  );
  // Fri 10000 + Sat 15000 + Sun 15000
  assert.equal(q.accommodationCents, 40_000);
  assert.equal(q.weekendUpliftCents, 10_000);
});

test("fixed weekly nightly re-prices a 7+ stay (never an increase)", () => {
  const q = computeQuote(
    base({
      nights: uniformNights(D("2026-09-07"), D("2026-09-14"), 10_000),
      checkIn: D("2026-09-07"),
      config: defaultPricingConfig({ weeklyDiscountPct: 5, weeklyNightlyCents: 9_000 }),
    }),
  );
  assert.equal(q.lengthDiscountKind, "weekly");
  assert.equal(q.lengthDiscountCents, 7_000); // 70000 - 9000*7
  assert.equal(q.totalCents, 63_000);
  // a replacement HIGHER than the rate never increases the price
  const higher = computeQuote(
    base({
      nights: uniformNights(D("2026-09-07"), D("2026-09-14"), 10_000),
      checkIn: D("2026-09-07"),
      config: defaultPricingConfig({ weeklyNightlyCents: 12_000 }),
    }),
  );
  assert.equal(higher.lengthDiscountCents, 0);
});

test("fixed monthly nightly wins over weekly at 30+ nights", () => {
  const q = computeQuote(
    base({
      nights: uniformNights(D("2026-09-01"), D("2026-10-01"), 10_000),
      checkIn: D("2026-09-01"),
      config: defaultPricingConfig({ weeklyNightlyCents: 9_000, monthlyNightlyCents: 8_000 }),
    }),
  );
  assert.equal(q.lengthDiscountKind, "monthly");
  assert.equal(q.lengthDiscountCents, 60_000); // 300000 - 8000*30
});
