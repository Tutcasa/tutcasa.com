import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getListingsRepo } from "@/modules/listings";
import { allInNightlyCents, fmtMoney } from "@/modules/pricing";
import { getUnavailableRanges } from "@/modules/bookings";
import { BookingWidget } from "@/components/BookingWidget";

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
    title: `${listing.title} — ${listing.city}`,
    description: `${listing.headline} ${listing.propertyType} in ${listing.city} for up to ${listing.maxGuests} guests. All-in pricing from ${fmtMoney(allInNightlyCents(listing))}/night, WhatsApp concierge included.`,
  };
}

const GALLERY_LABELS = ["Living", "Terrace", "Bedroom", "Pool", "View"];

export default async function ListingPage({ params }: Props) {
  const { slug } = await params;
  const listing = await getListingsRepo().bySlug(slug);
  if (!listing) notFound();
  const unavailable = await getUnavailableRanges(listing.id);

  const gradients = ["ph-g1", "ph-g2", "ph-g3", "ph-g4", "ph-g5", "ph-g6"];
  const start = gradients.indexOf(listing.gradient);

  return (
    <div className="mx-auto max-w-[1180px] px-4 sm:px-6">
      <div className="py-6">
        <Link href="/stays" className="font-semibold text-grey hover:text-rosa">
          ← Back to stays
        </Link>
      </div>

      <h1 className="text-3xl font-extrabold sm:text-4xl">{listing.title}</h1>
      <p className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
        <b>★ {listing.rating.toFixed(2)}</b>
        <span className="text-grey">{listing.reviewCount} reviews</span>
        <span className="text-grey">📍 {listing.city}</span>
        <span className="rounded-pill border border-line bg-paper px-3 py-1 text-xs font-bold text-terra">
          {listing.headline}
        </span>
      </p>

      {/* gallery — placeholder gradients until real photography */}
      <div className="mt-6 grid gap-2.5 overflow-hidden rounded-card sm:h-[420px] sm:grid-cols-[2fr_1fr_1fr] sm:grid-rows-2">
        {GALLERY_LABELS.map((label, i) => (
          <div
            key={label}
            className={`relative min-h-40 ${gradients[(start + i) % 6]} ${i === 0 ? "sm:row-span-2" : ""}`}
          >
            <span className="absolute bottom-3 left-3 rounded-pill bg-white/90 px-3 py-1 text-xs font-bold text-ink">
              {label}
            </span>
          </div>
        ))}
      </div>

      <div className="grid gap-10 py-10 lg:grid-cols-[1.6fr_1fr]">
        <div>
          <h2 className="text-xl font-extrabold">
            Entire {listing.propertyType} · {listing.city}
          </h2>
          <p className="mt-1 text-grey">
            {listing.maxGuests} guests · {listing.bedrooms} bedrooms ·{" "}
            {listing.bathrooms} baths
          </p>

          <hr className="my-6 border-line" />
          <h3 className="mb-2 font-display text-lg font-bold">About this place</h3>
          <p className="max-w-[65ch] leading-relaxed">{listing.description}</p>

          <hr className="my-6 border-line" />
          <h3 className="mb-3 font-display text-lg font-bold">What this place offers</h3>
          <ul className="grid gap-2 sm:grid-cols-2">
            {listing.amenities.map((a) => (
              <li key={a} className="flex items-center gap-2 text-sm">
                <span className="text-cactus">✓</span> {a}
              </li>
            ))}
          </ul>

          <hr className="my-6 border-line" />
          <h3 className="mb-3 font-display text-lg font-bold">Good to know</h3>
          <div className="grid gap-3 text-sm sm:grid-cols-2">
            <div><b>Minimum stay</b><br />{listing.minStay} nights</div>
            <div><b>Check-in / out</b><br />From 3:00 PM · until 11:00 AM</div>
            <div><b>Guests</b><br />Up to {listing.maxGuests}</div>
            <div><b>Pricing</b><br />All-in — taxes &amp; cleaning included, no hidden fees</div>
          </div>
        </div>

        {/* booking card */}
        <aside className="h-fit rounded-card bg-paper p-6 shadow-soft lg:sticky lg:top-24">
          <BookingWidget
            slug={listing.slug}
            minStay={listing.minStay}
            maxGuests={listing.maxGuests}
            allInNightlyLabel={fmtMoney(allInNightlyCents(listing))}
            unavailable={unavailable}
          />
        </aside>
      </div>
    </div>
  );
}
