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
  /** admin toggle: appears in the homepage "Popular casas" strip */
  featured: boolean;
  /** guest booking-option filters */
  instantBook: boolean;
  selfCheckIn: boolean;
  allowPets: boolean;
  allowChildren: boolean;
  allowSmoking: boolean;
  allowParty: boolean;
  /** the admin's editable page content — shown on the listing page */
  checkinFrom: string; // "15:00"
  checkoutUntil: string; // "11:00"
  houseRules: string;
  cancellationPolicy: string;
  otherRules: string;
  bedTypes: { count: number; type: string }[];
  address: string | null;
  rating: number;
  reviewCount: number;
  /** placeholder art class until real photos land (ph-g1 … ph-g6) */
  gradient: string;
  /** real photos (empty = gradient placeholders are shown) */
  photos: { url: string; alt: string }[];
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
