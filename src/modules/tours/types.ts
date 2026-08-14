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
  priceCents: number; // per person (legacy fallback; 0 = on request)
  currency: string;
  /** Amanah tier model: TOTAL price (MXN) per group size — when present
      it is the price authority; smallest key = minimum bookable group. */
  groupPrices: Record<string, number> | null;
  photoUrl: string | null;
  stops: { time: string; place: string; desc: string }[];
  minGroup: number;
  maxGroup: number;
  category: "tour" | "park";
  status: "draft" | "published" | "archived";
}

/** Total group price in MXN for `pax` people from the tier map, clamping to
    the nearest offered tier (below-minimum pays the minimum-group price).
    Null when the tour has no tiers. */
export function tierTotalMXN(
  groupPrices: Record<string, number> | null | undefined,
  pax: number,
): number | null {
  if (!groupPrices) return null;
  const keys = Object.keys(groupPrices).map(Number)
    .filter((k) => Number.isFinite(k) && k > 0).sort((a, b) => a - b);
  if (!keys.length) return null;
  const at = [...keys].reverse().find((k) => k <= pax) ?? keys[0];
  return groupPrices[String(at)] ?? null;
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
