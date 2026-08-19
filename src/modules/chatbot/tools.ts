import "server-only";
import { getDb } from "@/lib/db";
import { resolveStayQuote } from "@/modules/pricing/resolve";

/**
 * Live lookups for the AI concierge. Everything runs through the SAME
 * engine the real checkout uses, so the bot can never quote a price or
 * availability the site itself wouldn't.
 */

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export interface StayCheck {
  found: boolean;
  available?: boolean;
  reason?: string;
  nights?: number;
  totalUSD?: number;
  dueNowUSD?: number;
  balanceUSD?: number;
  securityDepositUSD?: number;
  minStay?: number;
  bookingLink?: string;
  listingPage?: string;
}

/** Exact availability + all-in price for concrete dates. */
export async function checkStay(
  slug: string,
  checkIn: string,
  checkOut: string,
  guests: number,
): Promise<StayCheck> {
  if (!DATE_RE.test(checkIn) || !DATE_RE.test(checkOut) || checkOut <= checkIn) {
    return { found: true, available: false, reason: "invalid date range" };
  }
  const db = getDb();
  const listing = await db.query<{ id: string; slug: string; min_stay: number }>(
    `select id, slug, min_stay from listings
      where slug = $1 and status = 'published'`,
    [slug.trim().toLowerCase()],
  );
  const l = listing.rows[0];
  if (!l) return { found: false, reason: "no published home with that slug" };

  await db.query("select release_expired_holds()");
  const overlap = await db.query<{ n: string }>(
    `select count(*) as n from listing_unavailable_ranges($1) r
      where daterange(r.from_date, r.to_date) && daterange($2::date, $3::date)`,
    [l.id, checkIn, checkOut],
  );
  if (Number(overlap.rows[0].n) > 0) {
    return {
      found: true,
      available: false,
      reason: "some of those nights are already booked or blocked",
      listingPage: `/stays/${l.slug}`,
    };
  }

  const quoted = await resolveStayQuote(l.slug, checkIn, checkOut, Math.max(1, guests));
  if (!quoted.ok) {
    return {
      found: true,
      available: false,
      reason:
        quoted.error === "MIN_STAY_NOT_MET"
          ? `below the minimum stay of ${l.min_stay} nights`
          : quoted.error.toLowerCase().replaceAll("_", " "),
      minStay: l.min_stay,
      listingPage: `/stays/${l.slug}`,
    };
  }
  const q = quoted.quote;
  const d = (c: number) => Math.round(c / 100);
  return {
    found: true,
    available: true,
    nights: q.nights,
    totalUSD: d(q.totalCents),
    dueNowUSD: d(q.schedule.dueNowCents),
    balanceUSD: d(q.schedule.balanceCents),
    securityDepositUSD: q.securityDepositCents > 0 ? d(q.securityDepositCents) : undefined,
    bookingLink: `/booking?stay=${l.slug}&ci=${checkIn}&co=${checkOut}&guests=${Math.max(1, guests)}`,
    listingPage: `/stays/${l.slug}`,
  };
}

/** Busy ranges for the next ~6 months — "when is it free?" answers. */
export async function busyRanges(slug: string): Promise<
  { found: boolean; busy?: { from: string; to: string }[] }
> {
  const db = getDb();
  const listing = await db.query<{ id: string }>(
    "select id from listings where slug = $1 and status = 'published'",
    [slug.trim().toLowerCase()],
  );
  if (!listing.rows[0]) return { found: false };
  await db.query("select release_expired_holds()");
  const res = await db.query<{ from_date: string; to_date: string }>(
    `select to_char(from_date,'YYYY-MM-DD') as from_date,
            to_char(to_date,'YYYY-MM-DD') as to_date
       from listing_unavailable_ranges($1)
      where from_date < current_date + interval '6 months'
      order by from_date limit 40`,
    [listing.rows[0].id],
  );
  return { found: true, busy: res.rows.map((r) => ({ from: r.from_date, to: r.to_date })) };
}
