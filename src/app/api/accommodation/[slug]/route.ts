import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { getUnavailableRanges } from "@/modules/bookings";
import { resolveStayQuote } from "@/modules/pricing/resolve";

export const dynamic = "force-dynamic";

/**
 * Accommodation detail + live availability, and (with ?checkIn=&checkOut=
 * &guests=) a live server-computed quote. Consumed by amanahvacations.com.
 * See docs/ACCOMMODATION_API.md.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const db = getDb();
  const res = await db.query(
    `select l.id, l.slug, l.title, l.city, l.country, l.region, l.property_type,
            l.max_guests, l.bedrooms, l.bathrooms, l.headline, l.description,
            l.amenities, l.min_stay, l.size_sqft,
            coalesce(l.instant_book,false) as instant_book,
            l.rating_cached, l.review_count_cached,
            to_char(l.checkin_from,'HH24:MI') as checkin_from,
            to_char(l.checkout_until,'HH24:MI') as checkout_until,
            coalesce(l.faqs,'[]'::jsonb) as faqs,
            coalesce(l.cancellation_policy,'') as cancellation_policy,
            coalesce(l.house_rules,'') as house_rules,
            r.nightly_cents, r.cleaning_cents, r.tax_pct, r.currency,
            coalesce(p.photos, '[]'::json) as photos
       from listings l
       left join listing_rates r on r.listing_id = l.id and r.season is null
       left join lateral (
         select json_agg(json_build_object('url', url, 'alt', alt) order by sort) as photos
           from listing_photos where listing_id = l.id
       ) p on true
      where l.slug = $1 and l.status in ('published','unlisted')`,
    [slug],
  );
  const L = res.rows[0];
  if (!L) {
    return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
  }

  const unavailable = await getUnavailableRanges(L.id);

  // optional live quote
  const sp = req.nextUrl.searchParams;
  const checkIn = sp.get("checkIn");
  const checkOut = sp.get("checkOut");
  const guests = Math.max(1, parseInt(sp.get("guests") ?? "2", 10) || 2);
  let quote: unknown = null;
  if (checkIn && checkOut) {
    const q = await resolveStayQuote(slug, checkIn, checkOut, guests);
    quote = q.ok
      ? {
          ok: true,
          nights: q.quote.nights,
          currency: q.quote.currency,
          total: Math.round(q.quote.totalCents / 100),
          dueNow: Math.round(q.quote.schedule.dueNowCents / 100),
          balance: Math.round(q.quote.schedule.balanceCents / 100),
          balanceDueDate:
            q.quote.schedule.balanceDueDate?.toISOString().slice(0, 10) ?? null,
          securityDeposit: Math.round(q.quote.securityDepositCents / 100),
        }
      : { ok: false, error: q.error };
  }

  return NextResponse.json(
    {
      slug: L.slug,
      title: L.title,
      city: L.city,
      country: L.country,
      region: L.region,
      propertyType: L.property_type,
      maxGuests: L.max_guests,
      bedrooms: L.bedrooms,
      bathrooms: Number(L.bathrooms),
      headline: L.headline ?? "",
      description: L.description ?? "",
      amenities: L.amenities ?? [],
      minStay: L.min_stay,
      sizeSqft: L.size_sqft,
      instantBook: L.instant_book,
      rating: Number(L.rating_cached),
      reviewCount: L.review_count_cached,
      checkinFrom: L.checkin_from,
      checkoutUntil: L.checkout_until,
      faqs: L.faqs,
      cancellationPolicy: L.cancellation_policy,
      houseRules: L.house_rules,
      pricing: {
        nightly: Math.round((L.nightly_cents ?? 0) / 100),
        cleaningFee: Math.round((L.cleaning_cents ?? 0) / 100),
        taxPct: Number(L.tax_pct ?? 0),
        allInNightly: Math.round(((L.nightly_cents ?? 0) * (1 + Number(L.tax_pct ?? 0) / 100)) / 100),
        currency: L.currency ?? "USD",
      },
      photos: L.photos,
      /** date ranges a guest cannot book: from inclusive, to exclusive */
      unavailable,
      quote,
      bookUrl: `/stays/${L.slug}`,
    },
    {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Cache-Control": "no-store", // availability must always be fresh
      },
    },
  );
}
