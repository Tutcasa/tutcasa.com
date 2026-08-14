import type { Listing, ListingFilter } from "./types";
import { MOCK_LISTINGS, UNLISTED_SLUGS } from "./mock-data";
import { getSupabase } from "@/lib/supabase";
import { SupabaseListingsRepo } from "./supabase-repo";

/**
 * The listings data seam. Pages and services depend on this interface
 * only — swapping mock → Supabase is a change inside this module, not
 * in any consumer.
 */
export interface ListingsRepo {
  listPublished(filter?: ListingFilter): Promise<Listing[]>;
  bySlug(slug: string): Promise<Listing | null>;
  cities(): Promise<string[]>;
}

class MockListingsRepo implements ListingsRepo {
  async listPublished(filter?: ListingFilter): Promise<Listing[]> {
    // unlisted homes are bookable via direct link, never in the grid
    let out = MOCK_LISTINGS.filter((l) => !UNLISTED_SLUGS.has(l.slug));
    if (filter?.city) {
      const c = filter.city.toLowerCase();
      out = out.filter((l) => l.city.toLowerCase() === c);
    }
    switch (filter?.tag) {
      case "beachfront":   out = out.filter((l) => l.amenities.includes("Beachfront access")); break;
      case "villas":       out = out.filter((l) => l.propertyType === "villa"); break;
      case "private-pool": out = out.filter((l) => l.amenities.includes("Private pool")); break;
      case "family":       out = out.filter((l) => l.amenities.includes("Family friendly")); break;
      case "penthouses":   out = out.filter((l) => l.propertyType === "penthouse"); break;
    }
    return out;
  }

  async bySlug(slug: string): Promise<Listing | null> {
    return MOCK_LISTINGS.find((l) => l.slug === slug) ?? null;
  }

  async cities(): Promise<string[]> {
    return [...new Set(MOCK_LISTINGS.map((l) => l.city))];
  }
}

/**
 * Repo factory: Supabase when configured, mock otherwise.
 * Consumers never know the difference.
 */
export function getListingsRepo(): ListingsRepo {
  const sb = getSupabase();
  return sb ? new SupabaseListingsRepo(sb) : new MockListingsRepo();
}
