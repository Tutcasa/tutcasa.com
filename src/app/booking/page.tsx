import "@/styles/demo/checkout.css";
import type { Metadata } from "next";
import { getListingsRepo } from "@/modules/listings";
import { quote, nightsBetween } from "@/modules/pricing";
import { displayCityCountry } from "@/lib/demo-parity";
import { CheckoutClient, type CheckoutLine, type CheckoutPayload } from "@/components/checkout/CheckoutClient";

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

  if (q.stay && q.ci && q.co) {
    // stay checkout — price is ALWAYS recomputed server-side
    const listing = await getListingsRepo().bySlug(q.stay);
    const guests = Math.max(1, parseInt(q.guests ?? "2", 10) || 2);
    if (listing) {
      try {
        const qt = quote(listing, new Date(`${q.ci}T00:00:00Z`), new Date(`${q.co}T00:00:00Z`));
        const nights = nightsBetween(new Date(`${q.ci}T00:00:00Z`), new Date(`${q.co}T00:00:00Z`));
        lines = [{
          n: `${listing.title} — ${displayCityCountry(listing).split(",")[0]}`,
          m: `${nights} nights · ${guests} guests · ${q.ci} → ${q.co}`,
          a: Math.round(qt.totalCents / 100),
        }];
        currency = "USD";
        dates = `${q.ci} → ${q.co}`;
        payload = { kind: "stay", slug: listing.slug, ci: q.ci, co: q.co, guests };
      } catch {
        // invalid dates / min-stay — fall through to the empty cart
      }
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
      <CheckoutClient lines={lines} currency={currency} dates={dates} payload={payload} />
    </div>
  );
}
