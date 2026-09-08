import "@/styles/demo/index.css";
import { getListingsRepo, type Listing } from "@/modules/listings";
import { listTours } from "@/modules/tours";
import { HomeHero, type WizardMatch } from "@/components/home/HomeHero";
import { NewsletterBand } from "@/components/home/NewsletterBand";
import { getSetting } from "@/modules/settings";
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

/** real bed count = the beds the admin listed; bedrooms is the fallback */
function bedsOf(l: Listing): number {
  const n = l.bedTypes.reduce((s, b) => s + (b.count || 0), 0);
  return n > 0 ? n : l.bedrooms;
}

function toCard(l: Listing, feature?: string, g?: string): CasaCardData {
  const city = l.region ? `${displayCity(l)} · ${l.region}` : displayCity(l);
  // the demo home only styles g1–g4; anything else falls back to g1
  const fromListing = l.gradient.replace(/^ph-/, "");
  const grad = g ?? (/^g[1-4]$/.test(fromListing) ? fromListing : "g1");
  return {
    slug: l.slug,
    name: l.title,
    meta: `${city} · ${bedsOf(l)} beds · ${feature ?? `sleeps ${l.maxGuests}`}`,
    wishMeta: city,
    price: Math.round((l.nightlyCents * (1 + l.taxPct / 100)) / 100), // all-in, like the label says
    rate: l.rating.toFixed(2),
    tag: l.headline,
    g: grad,
    photo: l.photos[0]?.url ?? null,
  };
}

export default async function HomePage() {
  const [listings, tours, gReviews] = await Promise.all([
    getListingsRepo().listPublished(),
    listTours({ category: "tour" }),
    getSetting("google_reviews_cache"),
  ]);
  const expItems = tours
    .filter((t) => t.photoUrl)
    .slice(0, 6)
    .map((t) => ({
      name: t.title,
      sub: `${t.durationLabel || "Full day"} · ${t.city ?? "Riviera Maya"}`,
      img: t.photoUrl,
      priceMXN: t.priceCents > 0 ? Math.round(t.priceCents / 100) : null,
      currency: t.currency === "USD" ? "USD" as const : "MXN" as const,
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

  // the guided-wizard result cards are REAL published homes (was hardcoded to
  // 8 demo names whose "View details" 404'd). The client adds homes → they
  // appear here automatically.
  const wizardMatches: WizardMatch[] = listings.map((l) => {
    const fromListing = l.gradient.replace(/^ph-/, "");
    return {
      slug: l.slug,
      name: l.title,
      meta: `${l.bedrooms} beds · ${CARD_STYLE[l.slug]?.feature ?? l.headline ?? `sleeps ${l.maxGuests}`} · ★ ${l.rating.toFixed(2)}`,
      price: Math.round((l.nightlyCents * (1 + l.taxPct / 100)) / 100),
      city: displayCity(l),
      country: l.country,
      region: l.region ?? "",
      photos: l.photos.map((ph) => ph.url),
      g: /^g[1-6]$/.test(fromListing) ? fromListing : "g1",
    };
  });

  return (
    <div className="pg-index">
      <HomeHero matches={wizardMatches} />

      <PopularCasas casas={featured} />
      <PopularExperiences items={expItems} />
      <FamiliaBand />
      <LovedByGuests live={gReviews.reviews} />
      <NewsletterBand />
    </div>
  );
}
