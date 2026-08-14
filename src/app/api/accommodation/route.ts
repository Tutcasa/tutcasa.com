import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export const dynamic = "force-dynamic";

/**
 * Public accommodation catalog — consumed by amanahvacations.com's
 * accommodation section (server-side fetch). Published listings only;
 * read-only; no guest data. See docs/ACCOMMODATION_API.md.
 */
export async function GET() {
  const res = await getDb().query(
    `select l.slug, l.title, l.city, l.country, l.region, l.property_type,
            l.max_guests, l.bedrooms, l.bathrooms, l.headline, l.description,
            l.amenities, l.min_stay, l.size_sqft,
            coalesce(l.instant_book,false) as instant_book,
            coalesce(l.featured,false) as featured,
            l.rating_cached, l.review_count_cached,
            to_char(l.checkin_from,'HH24:MI') as checkin_from,
            to_char(l.checkout_until,'HH24:MI') as checkout_until,
            r.nightly_cents, r.cleaning_cents, r.tax_pct, r.currency,
            coalesce(p.photos, '[]'::json) as photos
       from listings l
       left join listing_rates r on r.listing_id = l.id and r.season is null
       left join lateral (
         select json_agg(json_build_object('url', url, 'alt', alt) order by sort) as photos
           from listing_photos where listing_id = l.id
       ) p on true
      where l.status = 'published'
      order by l.featured desc, l.title`,
  );

  const listings = res.rows.map((r) => ({
    slug: r.slug,
    title: r.title,
    city: r.city,
    country: r.country,
    region: r.region,
    propertyType: r.property_type,
    maxGuests: r.max_guests,
    bedrooms: r.bedrooms,
    bathrooms: Number(r.bathrooms),
    headline: r.headline ?? "",
    description: r.description ?? "",
    amenities: r.amenities ?? [],
    minStay: r.min_stay,
    sizeSqft: r.size_sqft,
    instantBook: r.instant_book,
    featured: r.featured,
    rating: Number(r.rating_cached),
    reviewCount: r.review_count_cached,
    checkinFrom: r.checkin_from,
    checkoutUntil: r.checkout_until,
    pricing: {
      nightly: Math.round((r.nightly_cents ?? 0) / 100),
      cleaningFee: Math.round((r.cleaning_cents ?? 0) / 100),
      taxPct: Number(r.tax_pct ?? 0),
      // advertised all-in nightly (base + tax share) — matches TutCasa cards
      allInNightly: Math.round(((r.nightly_cents ?? 0) * (1 + Number(r.tax_pct ?? 0) / 100)) / 100),
      currency: r.currency ?? "USD",
    },
    photos: r.photos,
    detailUrl: `/api/accommodation/${r.slug}`,
    bookUrl: `/stays/${r.slug}`,
  }));

  return NextResponse.json(
    { listings, count: listings.length },
    {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600",
      },
    },
  );
}
