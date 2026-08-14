export type BookingStatus = "pending" | "confirmed" | "cancelled" | "completed";

export interface BookingRequest {
  listingSlug: string;
  checkIn: string;  // YYYY-MM-DD
  checkOut: string; // YYYY-MM-DD
  guests: number;
  guestName: string;
  guestEmail: string;
  guestPhone?: string;
  couponCode?: string;
}

export interface Booking {
  id: string;
  listingId: string;
  listingTitle: string;
  listingCity: string;
  checkIn: string;
  checkOut: string;
  guests: number;
  status: BookingStatus;
  holdExpiresAt: string | null;
  totalCents: number;
  currency: string;
  priceBreakdown: {
    nights: number;
    nightlyCents: number;
    accommodationCents: number;
    cleaningCents: number;
    taxCents: number;
  };
  guestName: string;
  guestEmail: string;
  createdAt: string;
}

export interface UnavailableRange {
  from: string; // YYYY-MM-DD inclusive
  to: string;   // YYYY-MM-DD exclusive (checkout day is bookable)
}

export type ReserveResult =
  | { ok: true; bookingId: string }
  | { ok: false; error: ReserveError };

export type ReserveError =
  | "DATES_TAKEN"        // exclusion constraint fired — someone got there first
  | "INVALID_DATES"
  | "MIN_STAY_NOT_MET"
  | "TOO_MANY_GUESTS"
  | "LISTING_NOT_FOUND"
  | "INVALID_CONTACT";
