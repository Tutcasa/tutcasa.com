/**
 * Add-on activity catalog — the demo's ADDONS/ACT list (Tours.html),
 * bundled into tour bookings as quote line items. Prices are per person
 * in MXN. This catalog is the single source both for display and for
 * SERVER-side pricing in the tour checkout — client-sent prices are
 * never trusted (see AGENTS.md).
 */

export interface Addon {
  name: string;
  icon: string;
  /** per-person price in MXN, null = on request */
  priceMXN: number | null;
  unit?: string; // e.g. "MXN/hour/person"
}

export const ADDONS: Addon[] = [
  { name: "Chichén + Valladolid", icon: "\u{1F3DB}️", priceMXN: 6600 },
  { name: "Tulum & Cenotes Tour", icon: "\u{1F30A}", priceMXN: 3700 },
  { name: "Cobá & Cenotes Tour", icon: "\u{1F3DB}️", priceMXN: 3900 },
  { name: "Tulum + Akumal", icon: "\u{1F422}", priceMXN: 5850 },
  { name: "Akumal & Cenotes Tour", icon: "\u{1F422}", priceMXN: 2350 },
  { name: "Cancún City Tour", icon: "\u{1F3D9}️", priceMXN: 800 },
  { name: "Quinta Av Guided Tour", icon: "\u{1F6CD}️", priceMXN: 500 },
  { name: "Cancún Aquarium", icon: "\u{1F420}", priceMXN: 950 },
  { name: "Cozumel Private Tour", icon: "⛵", priceMXN: 4600 },
  { name: "Ruta de los Cenotes Tour", icon: "\u{1F4A6}", priceMXN: 2900 },
  { name: "Cenote Visit", icon: "\u{1F4A7}", priceMXN: 1000 },
  { name: "Xcaret Park", icon: "\u{1F33A}", priceMXN: 3500 },
  { name: "Xel-Há Park", icon: "\u{1F3DE}️", priceMXN: 2850 },
  { name: "Xplor Park", icon: "\u{1F334}", priceMXN: 3350 },
  { name: "Xplor Fuego", icon: "\u{1F525}", priceMXN: 2850 },
  { name: "Xenses Park", icon: "✨", priceMXN: 1850 },
  { name: "Jungala Aqua Park", icon: "\u{1F3CA}", priceMXN: 1800 },
  { name: "Monkey Sanctuary", icon: "\u{1F412}", priceMXN: 1900 },
  { name: "Tennis Lessons", icon: "\u{1F3BE}", priceMXN: 800, unit: "MXN/hour/person" },
  { name: "Isla Contoy", icon: "\u{1F9A9}", priceMXN: null },
  { name: "Whale Sharks Tour", icon: "\u{1F40B}", priceMXN: null },
  { name: "Private Yacht", icon: "\u{1F6F8}️", priceMXN: null },
  { name: "Sian Ka’an", icon: "\u{1F33F}", priceMXN: null },
  { name: "Zipline & ATV", icon: "⚡", priceMXN: null },
  { name: "Photoshoot", icon: "\u{1F3A5}", priceMXN: null },
  { name: "Romantic Dinner", icon: "\u{1F305}", priceMXN: null },
  { name: "Bacalar Lagoon", icon: "\u{1F499}", priceMXN: null },
];

/** the Build-Your-Own modal shows the same list minus Jungala (demo ACT) */
export const BYO_ACTS: Addon[] = ADDONS.filter((a) => a.name !== "Jungala Aqua Park");

export function addonByName(name: string): Addon | undefined {
  return ADDONS.find((a) => a.name === name);
}

/**
 * Experiences-page activity prices (demo XP_PRICES) — the "my tour"
 * list uses these display names. null = on request.
 */
export const XP_PRICES: Record<string, number | null> = {
  "Cenotes": 1000, "Chichén Itzá": 6600, "Tulum Ruins": 3700, "Cobá Ruins": 3900,
  "Xcaret Park": 3500, "Jungala Aqua": 1800, "Cozumel": 4600, "Ek Balam": null,
  "Reef Snorkeling": 2350, "Isla Mujeres": null, "Isla Contoy": null,
  "Whale Sharks": null, "Holbox Island": null, "Catamaran": null,
  "Zipline & ATV": null, "Sian Ka’an": null, "Swim with Dolphins": null,
  "Spa Day": null, "Private Yacht": null,
};

/** server-side price lookup for any activity name (addons or XP list) */
export function priceForActivity(name: string): number | null {
  const a = addonByName(name);
  if (a) return a.priceMXN;
  if (name in XP_PRICES) return XP_PRICES[name];
  return null;
}
