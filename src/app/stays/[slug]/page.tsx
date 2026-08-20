import "@/styles/demo/property.css";
import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { getListingsRepo, type Listing } from "@/modules/listings";
import { advertisedNightly } from "@/modules/pricing";
import { getUnavailableRanges } from "@/modules/bookings";
import { getSetting } from "@/modules/settings";
import { T } from "@/lib/i18n";
import { demoGradient, displayCityCountry, propertyTypeLabel } from "@/lib/demo-parity";
import { PdGrid, type PdData } from "@/components/property/PdGrid";
import { PropertyGallery } from "@/components/property/PropertyGallery";

interface Props {
  params: Promise<{ slug: string }>;
}

// Availability must always be fresh — render per-request.
export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const listing = await getListingsRepo().bySlug(slug);
  if (!listing) return {};
  return {
    title: { absolute: `${listing.title} · TutCasa` },
    description: `${listing.headline} ${listing.propertyType} in ${listing.city} for up to ${listing.maxGuests} guests. All-in pricing, WhatsApp concierge included.`,
  };
}

const GALLERY_LABELS = ["Living", "Terrace", "Bedroom", "Pool", "View"];
const GS = ["g1", "g2", "g3", "g4", "g5", "g6"];

/** Coordinates exist and aren't the 0,0 placeholder. */
const hasPin = (l: { lat: number; lng: number }) =>
  Number.isFinite(l.lat) && Number.isFinite(l.lng) && (l.lat !== 0 || l.lng !== 0);
/** ~100 m precision — accurate area without revealing the exact house. */
const roundedPin = (l: { lat: number; lng: number }) =>
  `${l.lat.toFixed(3)},${l.lng.toFixed(3)}`;

function SimilarCard({ l }: { l: Listing }) {
  return (
    <Link className="sim" href={`/stays/${l.slug}`}>
      <div className={`ph ${demoGradient(l, 6)}`} style={l.photos[0] ? { position: "relative", overflow: "hidden" } : undefined}>
        {l.photos[0] && (
          <Image src={l.photos[0].url} alt="" fill sizes="300px" style={{ objectFit: "cover" }} />
        )}
      </div>
      <div className="b">
        <h4>{l.title}</h4>
        <div className="m">&#128205; {displayCityCountry(l)} &middot; {l.bedrooms} bd</div>
        <div className="pr">
          ${Math.round(l.nightlyCents / 100).toLocaleString("en-US")}{" "}
          <span style={{ color: "var(--grey)", fontWeight: 500, fontSize: 12 }}>/ night</span>
        </div>
      </div>
    </Link>
  );
}

export default async function ListingPage({ params }: Props) {
  const { slug } = await params;
  const repo = getListingsRepo();
  const listing = await repo.bySlug(slug);
  if (!listing) notFound();
  const [unavailable, all, contact, adv] = await Promise.all([
    getUnavailableRanges(listing.id),
    repo.listPublished(),
    getSetting("contact"),
    advertisedNightly(listing.id).catch(() => null),
  ]);

  const g = demoGradient(listing, 6);
  const start = Math.max(0, GS.indexOf(g));
  const city = displayCityCountry(listing);

  /* similar homes: same city first, then the rest (demo sort) */
  const similar = all
    .filter((l) => l.slug !== listing.slug)
    .sort((a, b) => (a.city === listing.city ? 0 : 1) - (b.city === listing.city ? 0 : 1))
    .slice(0, 4);

  // pre-tax nightly for the static breakdown; all-in for the headline
  const pretax = adv?.minCents ?? listing.nightlyCents;
  const taxPct = adv?.taxPct ?? listing.taxPct;
  const allIn = Math.round(pretax * (1 + taxPct / 100));
  const data: PdData = {
    slug: listing.slug,
    name: listing.title,
    city,
    typeLabel: propertyTypeLabel(listing),
    beds: listing.bedrooms,
    baths: listing.bathrooms,
    guests: listing.maxGuests,
    priceLabel: Math.round(allIn / 100).toLocaleString("en-US"),
    allInNightly: Math.round(allIn / 100),
    priceVaries: adv?.varies ?? false,
    nightlyPretax: Math.round(pretax / 100),
    cleaningFee: Math.round((adv?.cleaningCents ?? listing.cleaningCents) / 100),
    taxPct,
    rate: listing.rating.toFixed(2),
    reviews: listing.reviewCount,
    lat: listing.lat,
    lng: listing.lng,
    // approximate map pin: coordinates rounded to ~100 m (the exact
    // address is only shared after booking, as the page promises); the
    // admin's address itself never appears in the embed URL
    // no pin yet → search the map for the home's NAME in its city (finds
    // the complex, e.g. "Mareazul") instead of dropping on the city centre
    mapQ: hasPin(listing) ? roundedPin(listing) : `${listing.title}, ${listing.city}`,
    minStay: listing.minStay,
    desc: listing.description,
    amen: listing.amenities,
    bedTypes: listing.bedTypes,
    checkinFrom: listing.checkinFrom,
    checkoutUntil: listing.checkoutUntil,
    houseRules: listing.houseRules,
    cancellationPolicy: listing.cancellationPolicy,
    otherRules: listing.otherRules,
    allowChildren: listing.allowChildren,
    allowSmoking: listing.allowSmoking,
    allowParty: listing.allowParty,
    allowPets: listing.allowPets,
    unavailable,
    whatsapp: contact.whatsapp,
  };

  return (
    <div className="pg-property">
      <div className="pdp">
        <Link className="pd-back" href="/stays">&larr; <T k="pd_back" /></Link>
        <div className="pd-head">
          <h1>{listing.title}</h1>
          <div className="pd-sub">
            <span>&#9733; <b>{listing.rating.toFixed(2)}</b></span><span>&middot;</span>
            <span><b>{listing.reviewCount}</b> <T k="pd_reviews" /></span><span>&middot;</span>
            <span>&#128205; <span>{city}</span></span>
            <span className="pd-badge">{listing.headline}</span>
          </div>
        </div>
        <PropertyGallery
          photos={listing.photos.map((p) => ({ url: p.url, alt: p.alt ?? "" }))}
          title={listing.title}
          labels={GALLERY_LABELS}
          gs={GS}
          gStart={start}
        />
        <PdGrid p={data} />
        <div className="pd-sec">
          <T as="h2" k="pd_similar" />
          <div className="pd-similar">
            {similar.map((l) => <SimilarCard key={l.slug} l={l} />)}
          </div>
        </div>
      </div>
    </div>
  );
}
