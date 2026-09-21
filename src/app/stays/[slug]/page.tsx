import "@/styles/demo/property.css";
import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { after } from "next/server";
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
  searchParams: Promise<{ ci?: string; co?: string }>;
}

// Availability must always be fresh — render per-request.
export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const listing = await getListingsRepo().bySlug(slug);
  if (!listing) return {};
  return {
    title: { absolute: `${listing.title} · TutCasa` },
    description: `${listing.headline} ${listing.propertyType} in ${listing.city} for up to ${listing.maxGuests} guests. All-in pricing, our team on WhatsApp.`,
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
          ${Math.round((l.nightlyCents * (1 + l.taxPct / 100)) / 100).toLocaleString("en-US")}{" "}
          <span style={{ color: "var(--grey)", fontWeight: 500, fontSize: 12 }}>/ night</span>
        </div>
      </div>
    </Link>
  );
}

export default async function ListingPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const q = await searchParams;
  const DATE = /^\d{4}-\d{2}-\d{2}$/;
  const initialCi = q.ci && DATE.test(q.ci) ? q.ci : "";
  const initialCo = q.co && DATE.test(q.co) ? q.co : "";
  const repo = getListingsRepo();
  const listing = await repo.bySlug(slug);
  if (!listing) notFound();
  const [unavailable, all, contact, adv, addonRows, feeRows, reviewRows] = await Promise.all([
    getUnavailableRanges(listing.id),
    repo.listPublished(),
    getSetting("contact"),
    advertisedNightly(listing.id).catch(() => null),
    (await import("@/lib/db")).getDb().query(
      "select id, name, price_cents, mode from listing_addons where listing_id=$1 and active order by sort",
      [listing.id],
    ),
    (await import("@/lib/db")).getDb().query(
      "select coalesce(early_checkin_cents,0) as early, coalesce(late_checkout_cents,0) as late from listing_pricing where listing_id=$1",
      [listing.id],
    ),
    (await import("@/lib/db")).getDb().query(
      `select guest_name, rating, body,
              to_char(coalesce(stayed_at, created_at::date), 'FMMonth YYYY') as when_label
         from listing_reviews
        where listing_id=$1 and status='published'
        order by created_at desc limit 40`,
      [listing.id],
    ),
  ]);

  // channel feeds older than a few hours re-pull in the background, so
  // imported Airbnb/VRBO blocks stay fresh between the hourly cron runs
  after(async () => {
    const { syncStaleFeeds } = await import("@/modules/ical");
    await syncStaleFeeds(listing.id).catch(() => {});
  });

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
    region: listing.region ?? "",
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
    // neighborhood + city beats stored coords: geocoding gated communities
    // (e.g. Mareazul) often lands downtown, while Google resolves the
    // area name itself correctly — and it stays approximate, never house-level
    mapQ: listing.region
      ? `${listing.region}, ${listing.city}`
      : hasPin(listing) ? roundedPin(listing) : `${listing.title}, ${listing.city}`,
    minStay: listing.minStay,
    desc: listing.description,
    amen: listing.amenities,
    bedTypes: listing.bedTypes,
    checkinFrom: listing.checkinFrom,
    checkoutUntil: listing.checkoutUntil,
    houseRules: listing.houseRules,
    cancellationPolicy: listing.cancellationPolicy,
    otherRules: listing.otherRules,
    faqs: listing.faqs,
    allowChildren: listing.allowChildren,
    allowSmoking: listing.allowSmoking,
    allowParty: listing.allowParty,
    allowPets: listing.allowPets,
    unavailable,
    guestReviews: reviewRows.rows.map((r) => ({
      n: r.guest_name as string,
      d: r.when_label as string,
      t: r.body as string,
      r: Number(r.rating),
    })),
    addons: addonRows.rows.map((a) => ({
      id: a.id as string, name: a.name as string,
      priceCents: a.price_cents as number, mode: a.mode as string,
    })),
    earlyCheckinCents: Number(feeRows.rows[0]?.early ?? 0),
    lateCheckoutCents: Number(feeRows.rows[0]?.late ?? 0),
    whatsapp: contact.whatsapp,
    initialCi,
    initialCo,
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
