import "server-only";
import { getDb } from "@/lib/db";

/**
 * Amanah tours sync — mirrors amanahvacations.com/api/tours into the
 * tours table so TutCasa always shows exactly what Amanah offers:
 * same tours, same images, same group-tier MXN prices, zero markup.
 * Synced rows are marked source='amanah'; local rows (e.g. parks) are
 * left untouched. Amanah tours that disappear from the feed are
 * archived, never deleted (bookings may reference them).
 */

const FEED_URL =
  process.env.AMANAH_TOURS_URL ?? "https://amanahvacations.com/api/tours";

interface FeedStop { time: string; place: string; desc: string }
interface FeedTour {
  key: string;
  name: string;
  sub: string;
  dur: string;
  groupPrices: Record<string, number> | null;
  price: number | null;
  offer: number | null;
  onreq: boolean;
  img: string | null;
  stops: FeedStop[];
}

export interface SyncResult {
  ok: boolean;
  message: string;
  upserted?: number;
  archived?: number;
}

export async function syncAmanahTours(): Promise<SyncResult> {
  let feed: { tours: FeedTour[] };
  try {
    const res = await fetch(FEED_URL, { cache: "no-store" });
    if (!res.ok) return { ok: false, message: `Amanah feed returned HTTP ${res.status}.` };
    feed = await res.json();
  } catch (e) {
    return { ok: false, message: `Couldn't reach the Amanah feed: ${(e as Error).message}` };
  }
  if (!Array.isArray(feed.tours) || feed.tours.length === 0) {
    return { ok: false, message: "The Amanah feed came back empty — nothing was changed." };
  }

  const db = getDb();
  let upserted = 0;
  for (const t of feed.tours) {
    if (!t.key || !t.name) continue;
    // legacy per-person fallback in MXN cents; 0 = on request
    const perPerson = t.onreq ? 0 : Math.round(((t.offer ?? t.price) ?? 0) * 100);
    await db.query(
      `insert into tours (slug, title, subtitle, partner, city, duration_label,
                          price_cents, currency, category, status, photo_url,
                          group_prices, stops, source, synced_at)
       values ($1,$2,$3,'amanah','Playa del Carmen',$4,$5,'MXN','tour','published',
               $6,$7,$8,'amanah', now())
       on conflict (slug) do update set
         title=$2, subtitle=$3, duration_label=$4, price_cents=$5,
         photo_url=$6, group_prices=$7, stops=$8, source='amanah',
         synced_at=now(), status='published'`,
      [
        t.key, t.name, t.sub || null, t.dur || null, perPerson,
        t.img, t.groupPrices ? JSON.stringify(t.groupPrices) : null,
        JSON.stringify(t.stops ?? []),
      ],
    );
    upserted++;
  }

  // Amanah is the authority for the whole 'tour' category: anything not in
  // the feed — old seeds included — is archived (hidden, never deleted;
  // bookings keep their reference). Parks stay TutCasa-managed.
  const keys = feed.tours.map((t) => t.key).filter(Boolean);
  const archivedRes = await db.query(
    `update tours set status='archived', synced_at=now()
      where category='tour' and status='published' and not (slug = any($1))
      returning slug`,
    [keys],
  );

  return {
    ok: true,
    message: `Synced ${upserted} tours from Amanah${archivedRes.rowCount ? `, archived ${archivedRes.rowCount} removed` : ""}.`,
    upserted,
    archived: archivedRes.rowCount ?? 0,
  };
}
