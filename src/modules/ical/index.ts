import "server-only";
import { getDb } from "@/lib/db";

/**
 * iCal channel sync (M4) — the double-booking protection with Airbnb/VRBO.
 *
 * EXPORT: each listing has an unguessable feed URL (/api/ical/{token}.ics)
 * that channels poll. It publishes busy ranges only (confirmed + pending
 * bookings, manual blocks, blocked calendar days) — never guest data.
 *
 * IMPORT: external calendar URLs saved per listing are fetched and their
 * events land in availability_blocks (reason='ical'), deduped by feed+UID.
 * Imported blocks immediately gate guest checkout, admin calendars and the
 * partner API, because every availability read already unions blocks.
 */

/* ---------------- export ---------------- */

const icsEscape = (s: string) =>
  s.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\n/g, "\\n");

function vevent(uid: string, from: string, to: string, summary: string): string {
  // all-day events, DTEND exclusive — the calendar-channel convention
  const d = (s: string) => s.replace(/-/g, "");
  return [
    "BEGIN:VEVENT",
    `UID:${icsEscape(uid)}`,
    `DTSTART;VALUE=DATE:${d(from)}`,
    `DTEND;VALUE=DATE:${d(to)}`,
    `SUMMARY:${icsEscape(summary)}`,
    "END:VEVENT",
  ].join("\r\n");
}

/** The export feed for one listing, or null when the token is unknown. */
export async function buildExportFeed(token: string): Promise<{ title: string; ics: string } | null> {
  if (!/^[0-9a-f-]{36}$/i.test(token)) return null;
  const db = getDb();
  const listing = await db.query<{ id: string; title: string }>(
    "select id, title from listings where ical_token=$1", [token]);
  const L = listing.rows[0];
  if (!L) return null;

  await db.query("select release_expired_holds()");
  const [bookings, blocks, days] = await Promise.all([
    db.query(
      `select id, to_char(lower(stay),'YYYY-MM-DD') as f, to_char(upper(stay),'YYYY-MM-DD') as t
         from bookings where listing_id=$1 and status in ('pending','confirmed')
          and upper(stay) >= current_date`, [L.id]),
    db.query(
      `select id, reason, to_char(lower(span),'YYYY-MM-DD') as f, to_char(upper(span),'YYYY-MM-DD') as t
         from availability_blocks
        where listing_id=$1 and reason <> 'ical' and upper(span) >= current_date`, [L.id]),
    // blocked calendar days, merged into consecutive ranges
    db.query(
      `select to_char(min(day),'YYYY-MM-DD') as f, to_char(max(day) + 1,'YYYY-MM-DD') as t
         from (select day, day - (row_number() over (order by day))::int as grp
                 from listing_price_days
                where listing_id=$1 and is_blocked and day >= current_date) g
        group by grp`, [L.id]),
  ]);

  const events = [
    ...bookings.rows.map((b) => vevent(`booking-${b.id}@tutcasa`, b.f, b.t, "Reserved")),
    ...blocks.rows.map((b) => vevent(`block-${b.id}@tutcasa`, b.f, b.t, "Not available")),
    ...days.rows.map((d, i) => vevent(`days-${d.f}-${i}@tutcasa`, d.f, d.t, "Not available")),
  ];

  const ics = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//TutCasa//Channel Sync//EN",
    "CALSCALE:GREGORIAN",
    `X-WR-CALNAME:${icsEscape(`TutCasa — ${L.title}`)}`,
    ...events,
    "END:VCALENDAR",
  ].join("\r\n");
  return { title: L.title, ics };
}

/* ---------------- import ---------------- */

interface ParsedEvent { uid: string; from: string; to: string }

/** Minimal, tolerant ICS parser: unfolds lines, reads VEVENT DTSTART/DTEND
    (date or datetime — datetimes collapse to their date) and UID. */
export function parseIcs(ics: string): ParsedEvent[] {
  const unfolded = ics.replace(/\r?\n[ \t]/g, "");
  const out: ParsedEvent[] = [];
  let cur: Partial<ParsedEvent> & { seq: number; durDays?: number } | null = null;
  let seq = 0;
  const toDate = (v: string): string | null => {
    const m = v.match(/(\d{4})(\d{2})(\d{2})/);
    return m ? `${m[1]}-${m[2]}-${m[3]}` : null;
  };
  for (const raw of unfolded.split(/\r?\n/)) {
    const line = raw.trim();
    if (line === "BEGIN:VEVENT") { cur = { seq: seq++ }; continue; }
    if (line === "END:VEVENT") {
      if (cur?.from) {
        // DTEND missing (or a same-day timed event, or DURATION-only):
        // per RFC 5545 a date event without DTEND lasts one day — don't
        // silently drop the block and leave the night bookable
        let to = cur.to ?? null;
        if (!to || to <= cur.from) to = addDays(cur.from, Math.max(1, cur.durDays ?? 1));
        out.push({ uid: cur.uid || `noext-${cur.from}-${to}-${cur.seq}`, from: cur.from, to });
      }
      cur = null;
      continue;
    }
    if (!cur) continue;
    const idx = line.indexOf(":");
    if (idx === -1) continue;
    const prop = line.slice(0, idx).split(";")[0].toUpperCase();
    const val = line.slice(idx + 1);
    if (prop === "UID") cur.uid = val.trim();
    else if (prop === "DTSTART") cur.from = toDate(val) ?? cur.from;
    else if (prop === "DTEND") cur.to = toDate(val) ?? cur.to;
    else if (prop === "DURATION") {
      const d = val.match(/P(\d+)D/i);
      if (d) cur.durDays = Number(d[1]);
    }
  }
  return out;
}

function addDays(iso: string, n: number): string {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

export interface IcalSyncResult {
  ok: boolean;
  feeds: number;
  imported: number;
  removed: number;
  errors: string[];
}

/** Pull every active feed (optionally one listing's) and reconcile blocks. */
export async function syncIcalFeeds(listingId?: string): Promise<IcalSyncResult> {
  const db = getDb();
  const feeds = await db.query(
    `select f.id, f.listing_id, f.url, f.source
       from listing_ical_feeds f
      where f.active ${listingId ? "and f.listing_id = $1" : ""}`,
    listingId ? [listingId] : [],
  );

  let imported = 0;
  let removed = 0;
  const errors: string[] = [];

  for (const feed of feeds.rows) {
    try {
      const res = await fetch(feed.url, {
        cache: "no-store",
        headers: { "User-Agent": "TutCasa-Calendar-Sync/1.0" },
        signal: AbortSignal.timeout(20_000),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const body = await res.text();
      // an expired/rotated link often returns an HTML page with HTTP 200 —
      // treating it as "zero events" would DELETE every imported block and
      // reopen channel-reserved nights. Refuse anything that isn't a calendar.
      if (!body.includes("BEGIN:VCALENDAR")) {
        throw new Error("response is not an iCal calendar (link expired or rotated?)");
      }
      const events = parseIcs(body);

      // upsert current events (external_ref is unique per feed)
      const refs: string[] = [];
      for (const ev of events) {
        const ref = `${feed.id}:${ev.uid}`;
        refs.push(ref);
        await db.query(
          `insert into availability_blocks (listing_id, span, reason, source, external_ref)
           values ($1, daterange($2::date, $3::date, '[)'), 'ical', $4, $5)
           on conflict (listing_id, external_ref) where external_ref is not null
           do update set span = daterange($2::date, $3::date, '[)')`,
          [feed.listing_id, ev.from, ev.to, feed.source, ref],
        );
      }
      imported += events.length;

      // events that vanished from the feed free their dates
      const gone = await db.query(
        `delete from availability_blocks
          where listing_id=$1 and reason='ical'
            and external_ref like $2 and not (external_ref = any($3))
          returning id`,
        [feed.listing_id, `${feed.id}:%`, refs.length ? refs : ["-"]],
      );
      removed += gone.rowCount ?? 0;

      await db.query(
        `update listing_ical_feeds set last_synced_at=now(),
           last_status=$2 where id=$1`,
        [feed.id, `ok: ${events.length} busy ranges`],
      );
    } catch (e) {
      const msg = (e as Error).message.slice(0, 140);
      errors.push(`${feed.source}: ${msg}`);
      await db.query(
        `update listing_ical_feeds set last_synced_at=now(), last_status=$2 where id=$1`,
        [feed.id, `error: ${msg}`],
      );
    }
  }

  return { ok: errors.length === 0, feeds: feeds.rowCount ?? 0, imported, removed, errors };
}
