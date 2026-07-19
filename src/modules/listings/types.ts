export type Country = "MX" | "EG" | "US";

export interface Listing {
  id: string;
  slug: string;
  title: string;
  city: string;
  country: Country;
  region: string | null;
  lat: number;
  lng: number;
  propertyType: "condo" | "villa" | "house" | "apartment" | "penthouse";
  maxGuests: number;
  bedrooms: number;
  bathrooms: number;
  headline: string; // short card tag, e.g. "Oceanfront"
  description: string;
  amenities: string[];
  minStay: number;
  rating: number;
  reviewCount: number;
  /** placeholder art class until real photos land (ph-g1 … ph-g6) */
  gradient: string;
  /** base pricing — the pricing module turns this into an all-in quote */
  nightlyCents: number;
  cleaningCents: number;
  taxPct: number;
  currency: "USD";
}

export interface ListingFilter {
  city?: string;
  tag?: string;
}
