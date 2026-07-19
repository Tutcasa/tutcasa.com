import type { Listing, ListingFilter } from "./types";
import { MOCK_LISTINGS } from "./mock-data";

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
    let out = MOCK_LISTINGS;
    if (filter?.city) {
      const c = filter.city.toLowerCase();
      out = out.filter((l) => l.city.toLowerCase() === c);
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
 * Repo factory. When NEXT_PUBLIC_SUPABASE_URL is configured, this is
 * where the SupabaseListingsRepo gets returned instead.
 */
export function getListingsRepo(): ListingsRepo {
  return new MockListingsRepo();
}
