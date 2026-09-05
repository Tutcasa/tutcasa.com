import "@/styles/demo/checkout.css";
import type { Metadata } from "next";
import { resolveStayQuote } from "@/modules/pricing/resolve";
import { todayLocal } from "@/lib/local-date";
import { CheckoutClient, type CheckoutLine, type CheckoutPayload, type CheckoutSchedule } from "@/components/checkout/CheckoutClient";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: { absolute: "TutCasa — Checkout" },
  robots: { index: false },
};

interface Params {
  stay?: string;
  ci?: string;
  co?: string;
  guests?: string;
  items?: string; // demo cart contract (gift cards)
}

export default async function BookingCheckoutPage({
  searchParams,
}: {
  searchParams: Promise<Params>;
}) {
  const q = await searchParams;
  let lines: CheckoutLine[] = [];
  let currency: "USD" | "MXN" = "MXN";
  let dates: string | undefined;
  let payload: CheckoutPayload = { kind: "none" };

  let schedule: CheckoutSchedule | undefined;
  let requestToBook = false;

  if (q.stay && q.ci && q.co) {
    // stay checkout — price is ALWAYS recomputed server-side from the
    // stored rates + the admin's full pricing configuration
    const guests = Math.max(1, parseInt(q.guests ?? "2", 10) || 2);
    const { visitorCommission } = await import("@/modules/partners");
    const via = await visitorCommission();
    const res = await resolveStayQuote(q.stay, q.ci, q.co, guests, undefined, { commissionPct: via?.pct });
    // guard the same rules createBookingHold enforces, so a tampered URL
    // (past dates, over-capacity) can't render a payable summary that would
    // only fail at submit. Blocked/invalid dates already fail resolveStayQuote.
    const validStay =
      res.ok &&
      q.ci >= todayLocal() &&
      q.co > q.ci &&
      guests <= res.listing.maxGuests;
    if (validStay && res.ok) {
      const qt = res.quote;
      const d = (c: number) => Math.round(c / 100);
      lines = [{
        n: `${res.listing.title} — ${res.listing.city}`,
        m: `${qt.nights} nights · ${guests} guests · ${q.ci} → ${q.co}`,
        a: d(qt.accommodationCents - qt.weekendUpliftCents),
      }];
      if (qt.weekendUpliftCents > 0) {
        lines.push({ n: "Weekend rates", m: "Sat & Sun nights", a: d(qt.weekendUpliftCents) });
      }
      if (qt.lengthDiscountCents > 0) lines.push({
        n: qt.lengthDiscountKind === "monthly" ? "Monthly stay discount" : "Weekly stay discount",
        m: "", a: -d(qt.lengthDiscountCents),
      });
      if (qt.earlyBirdDiscountCents > 0) lines.push({ n: "Early-bird discount", m: "", a: -d(qt.earlyBirdDiscountCents) });
      if (qt.extraGuestFeeCents > 0) lines.push({ n: "Extra guests", m: "", a: d(qt.extraGuestFeeCents) });
      if (qt.cleaningCents > 0) lines.push({ n: "Cleaning fee", m: "", a: d(qt.cleaningCents) });
      if (qt.cityFeeCents > 0) lines.push({ n: "City fee", m: "", a: d(qt.cityFeeCents) });
      // tax as the closing line, sized so the lines sum exactly to the total
      const soFar = lines.reduce((a, l) => a + l.a, 0);
      lines.push({ n: "Taxes", m: "", a: d(qt.totalCents) - soFar });
      if (qt.securityDepositCents > 0) {
        lines.push({ n: "Security deposit", m: "returned after checkout per policy", a: d(qt.securityDepositCents) });
      }
      currency = "USD";
      dates = `${q.ci} → ${q.co}`;
      payload = { kind: "stay", slug: res.listing.slug, ci: q.ci, co: q.co, guests };
      // request-to-book homes take a request — no payment step at checkout
      requestToBook = !res.listing.instantBook;
      schedule = {
        // the deposit rides with the first payment (checkout derives
        // "due today" = total - balance, so it lands there automatically)
        dueNow: d(qt.schedule.dueNowCents),
        balance: d(qt.schedule.balanceCents),
        balanceBy: qt.schedule.balanceDueDate?.toISOString().slice(0, 10),
      };
    }
  } else if (q.items) {
    // demo cart contract (gift cards): display-only, no charge is taken
    try {
      const parsed = JSON.parse(q.items) as { n?: unknown; m?: unknown; a?: unknown }[];
      if (Array.isArray(parsed)) {
        lines = parsed
          .filter((it) => typeof it?.n === "string")
          .map((it) => ({
            n: String(it.n).slice(0, 120),
            m: typeof it.m === "string" ? it.m.slice(0, 160) : "",
            a: Math.max(0, Math.round(Number(it.a) || 0)),
          }));
      }
    } catch {}
  }

  return (
    <div className="pg-checkout">
      <CheckoutClient lines={lines} currency={currency} dates={dates} payload={payload} schedule={schedule} requestToBook={requestToBook} />
    </div>
  );
}
