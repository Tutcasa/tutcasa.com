import "@/styles/demo/property.css";
import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { getListingsRepo, type Listing } from "@/modules/listings";
import { allInNightlyCents } from "@/modules/pricing";
import { effectiveNightlyTodayCents } from "@/modules/pricing/resolve";
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
  const [unavailable, all, contact, todayNightly] = await Promise.all([
    getUnavailableRanges(listing.id),
    repo.listPublished(),
    getSetting("contact"),
    effectiveNightlyTodayCents(listing.id).catch(() => null),
  ]);

  const g = demoGradient(listing, 6);
  const start = Math.max(0, GS.indexOf(g));
  const city = displayCityCountry(listing);

  /* similar homes: same city first, then the rest (demo sort) */
  const similar = all
    .filter((l) => l.slug !== listing.slug)
    .sort((a, b) => (a.city === listing.city ? 0 : 1) - (b.city === listing.city ? 0 : 1))
    .slice(0, 4);

  const data: PdData = {
    slug: listing.slug,
    name: listing.title,
    city,
    typeLabel: propertyTypeLabel(listing),
    beds: listing.bedrooms,
    baths: listing.bathrooms,
    guests: listing.maxGuests,
    priceLabel: Math.round((todayNightly ?? allInNightlyCents(listing)) / 100).toLocaleString("en-US"),
    rate: listing.rating.toFixed(2),
    reviews: listing.reviewCount,
    lat: listing.lat,
    lng: listing.lng,
    minStay: listing.minStay,
    desc: listing.description,
    amen: listing.amenities,
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
