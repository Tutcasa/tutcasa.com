import "server-only";
import { getDb } from "@/lib/db";

/**
 * PriceLabs dynamic pricing. Each home can be mapped to one PriceLabs
 * listing (Pricing tab → Dynamic pricing). The daily sync pulls the
 * recommended price + min-stay for every future date into
 * listing_price_days, which the quote engine already treats as the
 * per-date price authority (blocked flags and notes are untouched).
 * A mapped home's manual per-day price edits WILL be overwritten by the
 * next sync — PriceLabs owns the nightly price for that home.
 */

const API = "https://api.pricelabs.co/v1";

export function pricelabsConfigured(): boolean {
  return !!process.env.PRICELABS_API_KEY;
}

async function pl(path: string, init?: RequestInit): Promise<unknown> {
  const res = await fetch(`${API}${path}`, {
    ...init,
    headers: {
      "X-API-Key": process.env.PRICELABS_API_KEY ?? "",
      "Content-Type": "application/json",
      ...init?.headers,
    },
    signal: AbortSignal.timeout(30_000),
  });
  if (!res.ok) throw new Error(`PriceLabs ${res.status}: ${(await res.text()).slice(0, 200)}`);
  return res.json();
}

export interface PlListing {
  id: string;
  pms: string;
  name: string;
  base: number | null;
  currency: string;
}

/**
 * Listings on the client's PriceLabs account, cleaned for the admin
 * dropdown: PriceLabs also returns one row per sales CHANNEL (airbnb /
 * vrbo mirrors of the same unit). Those can be mapped but return no
 * prices, so only real PMS rows are offered, named and sorted.
 */
const CHANNEL_PMS = new Set(["airbnb", "vrbo", "homeaway", "booking", "bookingcom"]);

export async function listPlListings(): Promise<PlListing[]> {
  const data = (await pl("/listings")) as { listings?: Record<string, unknown>[] };
  return (data.listings ?? [])
    .filter((l) => String(l.name ?? "").trim() && !CHANNEL_PMS.has(String(l.pms ?? "").toLowerCase()))
    .map((l) => ({
      id: String(l.id),
      pms: String(l.pms ?? ""),
      name: String(l.name ?? l.id),
      base: l.base != null ? Number(l.base) : null,
      currency: String(l.currency ?? "USD"),
    }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

/**
 * Switch a home back to manual pricing: remove exactly the per-date prices
 * PriceLabs wrote (today onward). Blocked days, notes and the admin's own
 * per-day overrides survive — the home falls back to its base/seasonal rates.
 */
export async function clearPriceLabsDays(listingId: string): Promise<number> {
  const db = getDb();
  const upd = await db.query(
    `update listing_price_days
        set nightly_cents = null, min_stay = null, pricelabs = false
      where listing_id = $1 and pricelabs and day >= current_date
      returning day`, [listingId]);
  // rows that now carry nothing at all are pure noise
  await db.query(
    `delete from listing_price_days
      where listing_id = $1 and nightly_cents is null and min_stay is null
        and not coalesce(is_blocked,false) and coalesce(note,'') = ''`, [listingId]);
  await db.query(
    `update listing_pricing set dynamic_pricing = false, pricelabs_synced_at = null,
            pricelabs_synced_days = null where listing_id = $1`, [listingId]);
  return upd.rowCount ?? 0;
}

/** Pull prices for every mapped home into listing_price_days. */
export async function syncPriceLabs(): Promise<{ synced: number; days: number; errors: string[] }> {
  if (!pricelabsConfigured()) return { synced: 0, days: 0, errors: ["PRICELABS_API_KEY not set"] };
  const db = getDb();
  const mapped = await db.query(
    `select p.listing_id, p.pricelabs_id, coalesce(p.pricelabs_pms,'hostaway') as pms, l.title
       from listing_pricing p join listings l on l.id = p.listing_id
      where p.pricelabs_id is not null and p.pricelabs_id <> ''
        and l.status <> 'archived'`);
  if (!mapped.rows.length) return { synced: 0, days: 0, errors: [] };

  const errors: string[] = [];
  let synced = 0;
  let days = 0;
  // one API call for ALL mapped listings
  let priced: { id: string; data?: { date: string; price: number; min_stay?: number }[]; error?: string }[];
  try {
    priced = (await pl("/listing_prices", {
      method: "POST",
      body: JSON.stringify({
        listings: mapped.rows.map((m) => ({ id: m.pricelabs_id, pms: m.pms })),
      }),
    })) as typeof priced;
  } catch (e) {
    return { synced: 0, days: 0, errors: [(e as Error).message] };
  }

  for (const m of mapped.rows) {
    const p = priced.find((x) => String(x.id) === String(m.pricelabs_id));
    if (!p?.data?.length) {
      const why = `PriceLabs returned no prices for the chosen listing${p?.error ? ` (${p.error})` : ""}`;
      errors.push(`${m.title}: ${why}`);
      await db.query("update listing_pricing set pricelabs_error = $2 where listing_id = $1",
        [m.listing_id, why.slice(0, 300)]).catch(() => {});
      continue;
    }
    // batched upsert; nightly + min-stay only — is_blocked and notes stay
    const values: string[] = [];
    const params: unknown[] = [m.listing_id];
    for (const d of p.data) {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(d.date) || !(d.price > 0)) continue;
      // PriceLabs sends -1 (or 0) for "no min-stay rule" — store as null
      const minStay = d.min_stay != null && d.min_stay >= 1 ? Math.round(d.min_stay) : null;
      params.push(d.date, Math.round(d.price * 100), minStay);
      const i = params.length;
      values.push(`($1, $${i - 2}::date, $${i - 1}::int, $${i}::int, true)`);
    }
    if (!values.length) continue;
    try {
      await db.query(
        `insert into listing_price_days (listing_id, day, nightly_cents, min_stay, pricelabs)
         values ${values.join(",")}
         on conflict (listing_id, day) do update
           set nightly_cents = excluded.nightly_cents,
               min_stay = excluded.min_stay,
               pricelabs = true`,
      params);
    } catch (e) {
      // one home's bad data must never stop the others
      errors.push(`${m.title}: ${(e as Error).message.slice(0, 120)}`);
      continue;
    }
    await db.query(
      `update listing_pricing set pricelabs_synced_at = now(), pricelabs_synced_days = $2,
              dynamic_pricing = true, pricelabs_error = null where listing_id = $1`,
      [m.listing_id, values.length]).catch(() => {});
    synced++;
    days += values.length;
  }
  return { synced, days, errors };
}
