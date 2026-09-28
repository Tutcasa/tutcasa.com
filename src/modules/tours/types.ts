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
  /** 'amanah' rows sync daily; 'local' rows are the admin's own */
  source: string;
  stops: { time: string; place: string; desc: string }[];
  minGroup: number;
  maxGroup: number;
  category: "tour" | "park";
  status: "draft" | "published" | "archived";
  /** local tours only: guest pays at checkout (Amanah tours always do) */
  instantBook: boolean;
  /** third-party commission % — copied onto each new booking */
  commissionPct: number;
}

/** TutCasa's cut on Amanah tours — same rule as Amanah's admin
    (commissions/shared.ts there): 5% for groups up to 2, 10% for 3+. */
export const amanahTutcasaPct = (people: number) => (people >= 3 ? 10 : 5);

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
  /** add-on activity NAMES — priced server-side, never from the client */
  addons?: string[];
  tourSlug: string;
  tourDate: string; // YYYY-MM-DD
  groupSize: number;
  guestName: string;
  guestEmail: string;
  guestPhone?: string;
  notes?: string;
  couponCode?: string;
}

export interface TourBooking {
  id: string;
  /** invoice number shared with the invoices page ("" when unassigned) */
  invoiceNo: string;
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
  /** Amanah's question/decision note from their admin queue */
  amanahNote?: string | null;
  /** where the tour itself comes from — 'amanah' (synced) or 'local' */
  tourSource: string;
  tourCity: string;
  /** third-party commission % on this booking */
  commissionPct: number;
  /** Amanah tours: TutCasa's % override (null = amanahTutcasaPct rule) */
  partnerPct: number | null;
}

export type TourReserveResult =
  | { ok: true; bookingId: string; instant: boolean }
  | { ok: false; error: "TOUR_NOT_FOUND" | "INVALID_DATE" | "INVALID_GROUP" | "COUPON_INVALID" | "INVALID_CONTACT" | "ON_REQUEST" };
