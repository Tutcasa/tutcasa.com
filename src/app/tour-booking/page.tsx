import "@/styles/demo/checkout.css";
import type { Metadata } from "next";
import { tourBySlug, priceForActivity, tierTotalMXN } from "@/modules/tours";
import { CheckoutClient, type CheckoutLine, type CheckoutPayload } from "@/components/checkout/CheckoutClient";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: { absolute: "TutCasa — Checkout" },
  robots: { index: false },
};

interface Params {
  tour?: string;
  date?: string;
  n?: string;
  addons?: string; // JSON string[] of addon names
  acts?: string; // JSON string[] of activity names (BYO / my-tour)
  dates?: string;
}

function parseNames(raw?: string): string[] {
  if (!raw) return [];
  try {
    const v = JSON.parse(raw);
    return Array.isArray(v) ? v.filter((x) => typeof x === "string").slice(0, 40) : [];
  } catch {
    return [];
  }
}

function dateLong(v?: string): string {
  if (!v) return "—";
  return new Date(v + "T00:00:00").toLocaleDateString("en-US", { day: "numeric", month: "long", year: "numeric" });
}

export default async function TourCheckoutPage({
  searchParams,
}: {
  searchParams: Promise<Params>;
}) {
  const q = await searchParams;
  const lines: CheckoutLine[] = [];
  let payload: CheckoutPayload = { kind: "none" };
  const dates = q.dates;

  const n = Math.min(20, Math.max(1, parseInt(q.n ?? "1", 10) || 1));

  if (q.tour && q.date) {
    // tour checkout — tour + add-on prices come from the server catalog
    const tour = await tourBySlug(q.tour);
    if (tour && (tour.priceCents > 0 || tour.groupPrices)) {
      // EXACTLY the numbers createTourBooking will charge: group size
      // clamped to the tour's limits, Amanah tier total when tiers exist
      const g = Math.min(tour.maxGroup ?? 6, Math.max(tour.minGroup ?? 1, n));
      const tierTotal = tierTotalMXN(tour.groupPrices, g);
      const tourTotal = tierTotal ?? Math.round(tour.priceCents / 100) * g;
      lines.push({
        n: tour.title,
        m: `${dateLong(q.date)} · ${g} ${g > 1 ? "people" : "person"}${tierTotal != null ? " · group rate" : ""}`,
        a: tourTotal,
      });
      const addonNames = parseNames(q.addons);
      const noteParts: string[] = [];
      for (const name of addonNames) {
        const p = priceForActivity(name);
        if (p != null) {
          lines.push({ n: "+ " + name, m: `Added activity · ${g} ${g > 1 ? "people" : "person"}`, a: p * g });
          noteParts.push(`${name} (${p} MXN/person)`);
        } else {
          lines.push({ n: "+ " + name, m: "On request — we’ll quote you personally", a: 0 });
          noteParts.push(`${name} (on request)`);
        }
      }
      payload = {
        kind: "tour",
        slug: tour.slug,
        date: q.date,
        groupSize: g,
        addons: addonNames,
        notes: noteParts.length ? "Add-ons: " + noteParts.join(", ") : undefined,
      };
    }
  } else {
    // BYO / my-tour activity cart — priced from the server catalog;
    // confirmed as a quote request (no backing tour entity yet)
    for (const name of parseNames(q.acts)) {
      const p = priceForActivity(name);
      if (p != null) lines.push({ n: name, m: `Activity · ${p.toLocaleString("en-US")} MXN/person × ${n}`, a: p * n });
      else lines.push({ n: name, m: "On request — we’ll quote you personally", a: 0 });
    }
  }

  return (
    <div className="pg-checkout">
      <CheckoutClient lines={lines} currency="MXN" dates={dates} payload={payload} />
    </div>
  );
}
