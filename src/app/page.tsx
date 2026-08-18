import "@/styles/demo/index.css";
import { getListingsRepo, type Listing } from "@/modules/listings";
import { listTours } from "@/modules/tours";
import { HomeHero } from "@/components/home/HomeHero";
import { NewsletterBand } from "@/components/home/NewsletterBand";
import {
  PopularCasas,
  PopularExperiences,
  LovedByGuests,
  FamiliaBand,
  type CasaCardData,
} from "@/components/home/HomeSections";

export const dynamic = "force-dynamic";

/* Card blurbs + gradients the demo uses for its known homes (g1–g4 are
   the demo's palette). WHICH homes appear is the admin's "featured"
   toggle; this map only styles the ones it recognizes. */
const CARD_STYLE: Record<string, { feature: string; g: string }> = {
  "spiritum-marea": { feature: "walk-out pool", g: "g1" },
  "vista-playa": { feature: "ocean view", g: "g2" },
  "casa-selva": { feature: "private cenote", g: "g3" },
  "nile-breeze": { feature: "rooftop terrace", g: "g4" },
  "casa-sol": { feature: "screened pool", g: "g3" },
};

function displayCity(l: Listing): string {
  return l.country === "EG" ? `${l.city}, Egypt` : l.city;
}

function toCard(l: Listing, feature?: string, g?: string): CasaCardData {
  const city = displayCity(l);
  // the demo home only styles g1–g4; anything else falls back to g1
  const fromListing = l.gradient.replace(/^ph-/, "");
  const grad = g ?? (/^g[1-4]$/.test(fromListing) ? fromListing : "g1");
  return {
    slug: l.slug,
    name: l.title,
    meta: `${city} · ${l.bedrooms} beds · ${feature ?? `sleeps ${l.maxGuests}`}`,
    wishMeta: city,
    price: Math.round(l.nightlyCents / 100),
    rate: l.rating.toFixed(2),
    tag: l.headline,
    g: grad,
    photo: l.photos[0]?.url ?? null,
  };
}

export default async function HomePage() {
  const [listings, tours] = await Promise.all([
    getListingsRepo().listPublished(),
    listTours({ category: "tour" }),
  ]);
  const expItems = tours
    .filter((t) => t.photoUrl)
    .slice(0, 6)
    .map((t) => ({
      name: t.title,
      sub: `${t.durationLabel || "Full day"} · ${t.city ?? "Riviera Maya"}`,
      img: t.photoUrl,
      priceLabel: t.priceCents > 0 ? `from $${Math.round(t.priceCents / 100).toLocaleString("en-US")} MXN` : "on request",
    }));
  // the admin's "featured" toggle decides the homepage strip
  const featured: CasaCardData[] = listings
    .filter((l) => l.featured)
    .map((l) => toCard(l, CARD_STYLE[l.slug]?.feature, CARD_STYLE[l.slug]?.g));
  // never show an empty strip — fill from the top of the list
  if (featured.length < 4) {
    for (const l of listings) {
      if (featured.length >= 4) break;
      if (!featured.some((c) => c.slug === l.slug)) featured.push(toCard(l));
    }
  }

  return (
    <div className="pg-index">
      <HomeHero />

      <section className="trust wrap">
        <div className="trust-grid">
          <div className="t-card"><div className="big"><span className="r">&#9733; 4.9</span></div><p>average rating from 100+ verified five-star reviews</p></div>
          <div className="t-card"><div className="big"><span className="c">500+</span></div><p>guests hosted</p></div>
          <div className="t-card"><div className="big"><span className="t">$0</span></div><p>hidden fees &mdash; the price you see is the price you pay</p></div>
          <div className="t-card"><div className="big"><span className="s">Free</span></div><p>airport pickup + WhatsApp concierge on every booking</p></div>
        </div>
      </section>

      <PopularCasas casas={featured} />
      <PopularExperiences items={expItems} />
      <FamiliaBand />
      <LovedByGuests />
      <NewsletterBand />
    </div>
  );
}
