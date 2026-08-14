import "@/styles/demo/index.css";
import { getListingsRepo, type Listing } from "@/modules/listings";
import { HomeHero } from "@/components/home/HomeHero";
import {
  PopularCasas,
  PopularExperiences,
  LovedByGuests,
  FamiliaBand,
  type CasaCardData,
} from "@/components/home/HomeSections";

export const dynamic = "force-dynamic";

/* The demo home features these four, in this order, with these card
   blurbs and gradient classes (g1–g4 are the demo's palette). */
const FEATURED: { slug: string; feature: string; g: string }[] = [
  { slug: "spiritum-marea", feature: "walk-out pool", g: "g1" },
  { slug: "vista-playa", feature: "ocean view", g: "g2" },
  { slug: "casa-selva", feature: "private cenote", g: "g3" },
  { slug: "nile-breeze", feature: "rooftop terrace", g: "g4" },
];

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
  };
}

export default async function HomePage() {
  const listings = await getListingsRepo().listPublished();
  const bySlug = new Map(listings.map((l) => [l.slug, l]));
  const featured = FEATURED.map(({ slug, feature, g }) => {
    const l = bySlug.get(slug);
    return l ? toCard(l, feature, g) : null;
  }).filter((c): c is CasaCardData => c !== null);
  // if the demo's four aren't all published, fill from the top of the list
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
      <PopularExperiences />
      <FamiliaBand />
      <LovedByGuests />
    </div>
  );
}
