import "server-only";
import { getDb } from "@/lib/db";

/**
 * Site settings — small editable content blobs (contact info,
 * investor deck, …) keyed in site_settings. Public pages read them;
 * the admin Content page writes them.
 */

export interface ContactSettings {
  whatsapp: string;
  email: string;
  instagram: string;
  facebook: string;
}

export interface InvestorSettings {
  deck_url: string;
  deck_name: string;
}

const DEFAULTS: { contact: ContactSettings; investor: InvestorSettings } = {
  contact: { whatsapp: "201069706782", email: "", instagram: "", facebook: "" },
  investor: { deck_url: "", deck_name: "" },
};

export async function getSetting<K extends keyof typeof DEFAULTS>(
  key: K,
): Promise<(typeof DEFAULTS)[K]> {
  try {
    const res = await getDb().query<{ value: (typeof DEFAULTS)[K] }>(
      "select value from site_settings where key = $1",
      [key],
    );
    return { ...DEFAULTS[key], ...(res.rows[0]?.value ?? {}) };
  } catch {
    return DEFAULTS[key]; // settings must never take a page down
  }
}

export async function setSetting(key: keyof typeof DEFAULTS, value: object): Promise<void> {
  await getDb().query(
    `insert into site_settings (key, value, updated_at)
     values ($1, $2, now())
     on conflict (key) do update set value = $2, updated_at = now()`,
    [key, JSON.stringify(value)],
  );
}
