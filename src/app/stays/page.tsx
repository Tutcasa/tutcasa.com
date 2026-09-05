import "@/styles/demo/stays.css";
import type { Metadata } from "next";
import { getListingsRepo, type Listing } from "@/modules/listings";
import { blockedListingIdsForRange } from "@/modules/bookings";
import { StaysClient, type StayCard } from "@/components/stays/StaysClient";
import { demoGradient, displayCity, stayTokens } from "@/lib/demo-parity";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: { absolute: "TutCasa — Stays" },
  description:
    "Browse our curated collection of vacation homes across Mexico, Egypt & Florida. All-in pricing, best rate guaranteed, free airport pickup included.",
};

function toCard(l: Listing): StayCard {
  return {
    slug: l.slug,
    name: l.title,
    city: displayCity(l),
    tokens: stayTokens(l),
    type: l.propertyType,
    guests: l.maxGuests,
    // haystack for keyword amenity filters (amenities are free text)
    hay: [l.amenities.join(" "), l.headline, l.description].join(" ").toLowerCase(),
    instant: l.instantBook,
    selfCi: l.selfCheckIn,
    pets: l.allowPets,
    beds: l.bedrooms,
    rate: l.rating.toFixed(2),
    reviews: l.reviewCount,
    price: Math.round((l.nightlyCents * (1 + l.taxPct / 100)) / 100), // all-in, like the label says
    lat: l.lat,
    lng: l.lng,
    // approximate pin only — never the street address (shared after booking)
    mapQ: Number.isFinite(l.lat) && Number.isFinite(l.lng) && (l.lat !== 0 || l.lng !== 0)
      ? `${l.lat.toFixed(3)},${l.lng.toFixed(3)}`
      : `${l.title}, ${l.city}`,
    g: demoGradient(l, 4),
    tag: l.headline,
    photos: l.photos.map((ph) => ph.url),
  };
}

export default async function StaysPage({
  searchParams,
}: {
  searchParams: Promise<{ match?: string; dest?: string; vibe?: string; ci?: string; co?: string }>;
}) {
  const q = await searchParams;
  const ci = (q.ci ?? "").trim();
  const co = (q.co ?? "").trim();
  const listings = await getListingsRepo().listPublished();
  // when the guest searches specific dates, hide homes with no availability
  // for that range (previously search ignored dates entirely)
  const datedSearch = /^\d{4}-\d{2}-\d{2}$/.test(ci) && /^\d{4}-\d{2}-\d{2}$/.test(co) && co > ci;
  const blocked = datedSearch ? await blockedListingIdsForRange(ci, co) : new Set<string>();
  const available = datedSearch ? listings.filter((l) => !blocked.has(l.id)) : listings;
  return (
    <div className="pg-stays">
      <StaysClient
        props={available.map(toCard)}
        initial={{
          match: q.match === "1",
          dest: (q.dest ?? "").trim(),
          vibe: (q.vibe ?? "").trim(),
          ci: q.ci ?? "",
          co: q.co ?? "",
        }}
      />
    </div>
  );
}
