import type { SupabaseClient } from "@supabase/supabase-js";
import type { Listing, ListingFilter } from "./types";
import type { ListingsRepo } from "./repository";

/** DB row shape for the listings query (snake_case, joined base rate). */
interface ListingRow {
  id: string;
  slug: string;
  title: string;
  city: string;
  country: "MX" | "EG" | "US";
  region: string | null;
  lat: number | null;
  lng: number | null;
  property_type: string;
  max_guests: number;
  bedrooms: number;
  bathrooms: number;
  headline: string | null;
  description: string | null;
  amenities: string[];
  min_stay: number;
  rating_cached: number;
  review_count_cached: number;
  listing_rates: {
    nightly_cents: number;
    cleaning_cents: number;
    tax_pct: number;
    currency: string;
    season: unknown;
  }[];
  listing_photos: { url: string; alt: string; sort: number }[];
}

const SELECT = `
  id, slug, title, city, country, region, lat, lng, property_type,
  max_guests, bedrooms, bathrooms, headline, description, amenities,
  min_stay, rating_cached, review_count_cached,
  listing_rates ( nightly_cents, cleaning_cents, tax_pct, currency, season ),
  listing_photos ( url, alt, sort )
`;

/** Placeholder art rotation until real photos land in listing_photos. */
const GRADIENTS = ["ph-g1", "ph-g2", "ph-g3", "ph-g4", "ph-g5", "ph-g6"];
function gradientFor(slug: string): string {
  let h = 0;
  for (const c of slug) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return GRADIENTS[h % GRADIENTS.length];
}

function toListing(row: ListingRow): Listing {
  const base = row.listing_rates.find((r) => r.season == null) ?? row.listing_rates[0];
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    city: row.city,
    country: row.country,
    region: row.region,
    lat: row.lat ?? 0,
    lng: row.lng ?? 0,
    propertyType: row.property_type as Listing["propertyType"],
    maxGuests: row.max_guests,
    bedrooms: row.bedrooms,
    bathrooms: Number(row.bathrooms),
    headline: row.headline ?? "",
    description: row.description ?? "",
    amenities: row.amenities ?? [],
    minStay: row.min_stay,
    rating: Number(row.rating_cached),
    reviewCount: row.review_count_cached,
    gradient: gradientFor(row.slug),
    photos: [...(row.listing_photos ?? [])].sort((a, b) => a.sort - b.sort)
      .map((p) => ({ url: p.url, alt: p.alt })),
    nightlyCents: base?.nightly_cents ?? 0,
    cleaningCents: base?.cleaning_cents ?? 0,
    taxPct: Number(base?.tax_pct ?? 0),
    currency: (base?.currency as Listing["currency"]) ?? "USD",
  };
}

export class SupabaseListingsRepo implements ListingsRepo {
  constructor(private sb: SupabaseClient) {}

  async listPublished(filter?: ListingFilter): Promise<Listing[]> {
    let q = this.sb
      .from("listings")
      .select(SELECT)
      .eq("status", "published")
      .order("rating_cached", { ascending: false });
    if (filter?.city) q = q.ilike("city", filter.city);
    switch (filter?.tag) {
      case "beachfront":   q = q.contains("amenities", ["Beachfront access"]); break;
      case "villas":       q = q.eq("property_type", "villa"); break;
      case "private-pool": q = q.contains("amenities", ["Private pool"]); break;
      case "family":       q = q.contains("amenities", ["Family friendly"]); break;
      case "penthouses":   q = q.eq("property_type", "penthouse"); break;
    }
    const { data, error } = await q;
    if (error) throw new Error(`listings query failed: ${error.message}`);
    return (data as unknown as ListingRow[]).map(toListing);
  }

  async bySlug(slug: string): Promise<Listing | null> {
    // 'unlisted' homes are bookable via direct link but never in the grid
    const { data, error } = await this.sb
      .from("listings")
      .select(SELECT)
      .in("status", ["published", "unlisted"])
      .eq("slug", slug)
      .maybeSingle();
    if (error) throw new Error(`listing query failed: ${error.message}`);
    return data ? toListing(data as unknown as ListingRow) : null;
  }

  async cities(): Promise<string[]> {
    const { data, error } = await this.sb
      .from("listings")
      .select("city")
      .eq("status", "published");
    if (error) throw new Error(`cities query failed: ${error.message}`);
    return [...new Set((data as { city: string }[]).map((r) => r.city))];
  }
}
