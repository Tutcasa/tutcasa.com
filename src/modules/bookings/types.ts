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
  /** guest-picked extra options — listing_addons ids, re-priced server-side */
  addonIds?: string[];
  /** gift card code to redeem against the charge (stored value) */
  giftCardCode?: string;
  /** early_checkin / late_checkout REQUESTS — decided + paid 48h before */
  extras?: string[];
  /** ?via=CODE tracked-link attribution (server-verified, never trusted raw) */
  marketingRef?: string;
  marketingCommissionPct?: number;
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
    /** payment split (website, admin-made and imported bookings) */
    dueNowCents?: number | null;
    balanceCents?: number | null;
    balanceDueDate?: string | null;
  };
  guestName: string;
  guestEmail: string;
  guestPhone: string | null;
  /** 'direct' | 'amanah' | channel sources — partner bookings show a badge */
  source: string;
  partnerRef: string | null;
  invoiceNo: string;
  /** cents already collected (manual records + partner/Stripe payments) */
  amountPaidCents?: number;
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
  | "INVALID_CONTACT"
  | "COUPON_INVALID" | "GIFT_CARD_INVALID";     // coupon no longer valid for this guest/booking
