export interface Tour {
  id: string;
  slug: string;
  title: string;
  subtitle: string | null;
  partner: string;
  city: string | null;
  durationLabel: string;
  description: string;
  highlights: string[];
  priceCents: number; // per person
  currency: string;
  minGroup: number;
  maxGroup: number;
  category: "tour" | "park";
  status: "draft" | "published" | "archived";
}

export interface TourBookingRequest {
  tourSlug: string;
  tourDate: string; // YYYY-MM-DD
  groupSize: number;
  guestName: string;
  guestEmail: string;
  guestPhone?: string;
  notes?: string;
}

export interface TourBooking {
  id: string;
  tourId: string;
  tourTitle: string;
  tourDate: string;
  groupSize: number;
  status: "pending" | "paid" | "partner_confirmed" | "completed" | "cancelled";
  totalCents: number;
  currency: string;
  guestName: string;
  guestEmail: string;
  guestPhone: string | null;
  notes: string | null;
  partnerNotifiedAt: string | null;
  partnerConfirmedAt: string | null;
  createdAt: string;
}

export type TourReserveResult =
  | { ok: true; bookingId: string }
  | { ok: false; error: "TOUR_NOT_FOUND" | "INVALID_DATE" | "INVALID_GROUP" | "INVALID_CONTACT" | "ON_REQUEST" };
