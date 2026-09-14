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

/** All listings on the client's PriceLabs account. */
export async function listPlListings(): Promise<PlListing[]> {
  const data = (await pl("/listings")) as { listings?: Record<string, unknown>[] };
  return (data.listings ?? []).map((l) => ({
    id: String(l.id),
    pms: String(l.pms ?? ""),
    name: String(l.name ?? l.id),
    base: l.base != null ? Number(l.base) : null,
    currency: String(l.currency ?? "USD"),
  }));
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
      errors.push(`${m.title}: no prices returned${p?.error ? ` (${p.error})` : ""}`);
      continue;
    }
    // batched upsert; nightly + min-stay only — is_blocked and notes stay
    const values: string[] = [];
    const params: unknown[] = [m.listing_id];
    for (const d of p.data) {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(d.date) || !(d.price > 0)) continue;
      params.push(d.date, Math.round(d.price * 100), d.min_stay ?? null);
      const i = params.length;
      values.push(`($1, $${i - 2}::date, $${i - 1}::int, $${i}::int)`);
    }
    if (!values.length) continue;
    await db.query(
      `insert into listing_price_days (listing_id, day, nightly_cents, min_stay)
       values ${values.join(",")}
       on conflict (listing_id, day) do update
         set nightly_cents = excluded.nightly_cents,
             min_stay = excluded.min_stay`,
    params);
    synced++;
    days += values.length;
  }
  return { synced, days, errors };
}
