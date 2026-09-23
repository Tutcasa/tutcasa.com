import type { Quote } from "./engine";

/**
 * The checkout's line items for a stay quote — one builder used by both
 * the checkout page and the coupon validator, so applying a coupon
 * redraws EXACTLY the same list minus the sale discounts it replaces.
 */
export interface StayLine { n: string; m: string; a: number }

export function stayCheckoutLines(
  qt: Quote,
  ctx: { guests: number; checkIn: string; checkOut: string },
): StayLine[] {
  const d = (c: number) => Math.round(c / 100);
  const custom = qt.weekendUpliftCents > 0 || qt.nightlyCents * qt.nights !== qt.accommodationCents;
  const lines: StayLine[] = [{
    n: "Accommodation",
    m: `${qt.nights} nights · ${ctx.guests} guests · ${ctx.checkIn} → ${ctx.checkOut}${custom ? " · custom nightly rates" : ""}`,
    a: d(qt.accommodationCents),
  }];
  if (qt.lengthDiscountCents > 0) lines.push({
    n: qt.lengthDiscountKind === "monthly" ? "Monthly stay discount" : "Weekly stay discount",
    m: "", a: -d(qt.lengthDiscountCents),
  });
  if (qt.earlyBirdDiscountCents > 0) lines.push({ n: "Early-bird discount", m: "", a: -d(qt.earlyBirdDiscountCents) });
  if (qt.extraGuestFeeCents > 0) lines.push({ n: "Extra guests", m: "", a: d(qt.extraGuestFeeCents) });
  if (qt.cleaningCents > 0) lines.push({ n: "Cleaning fee", m: "", a: d(qt.cleaningCents) });
  if (qt.cityFeeCents > 0) lines.push({ n: "City fee", m: "", a: d(qt.cityFeeCents) });
  for (const a of qt.addonLines) lines.push({ n: a.name, m: "extra option", a: d(a.totalCents) });
  // tax closes the list, sized so the lines sum exactly to the total
  const soFar = lines.reduce((sum, l) => sum + l.a, 0);
  lines.push({ n: "Taxes", m: "", a: d(qt.totalCents) - soFar });
  if (qt.securityDepositCents > 0) lines.push({ n: "Security deposit", m: "", a: d(qt.securityDepositCents) });
  return lines;
}
