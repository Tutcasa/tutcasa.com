import type { Listing } from "@/modules/listings";

/**
 * Demo parity data for the seed homes — exact tokens/gradients the
 * approved demo hardcodes (Stays.html PROPS / property.html PROPERTIES).
 * Listings added later in the admin fall back to derived values.
 */
export const DEMO_STAY: Record<string, { tokens: string[]; g: string }> = {
  "spiritum-marea": { tokens: ["playa del carmen", "beachfront", "private pool"], g: "g1" },
  "vista-playa": { tokens: ["playa del carmen", "penthouses", "beachfront"], g: "g2" },
  "casa-selva": { tokens: ["tulum", "villas", "private pool", "family"], g: "g3" },
  "nile-breeze": { tokens: ["nuba", "egypt", "family"], g: "g4" },
  "palma-azul": { tokens: ["playa del carmen", "private pool", "family"], g: "g2" },
  "coral-suite": { tokens: ["playa del carmen", "beachfront"], g: "g1" },
  "villa-maya": { tokens: ["tulum", "villas", "private pool"], g: "g4" },
  "casa-sol": { tokens: ["orlando", "florida", "family", "private pool"], g: "g3" },
  "jardin-verde": { tokens: ["playa del carmen", "private pool", "family"], g: "g3" },
};

/** demo type-label overrides that don't map from propertyType */
const DEMO_TYPE_LABEL: Record<string, string> = {
  "coral-suite": "Entire suite",
};

/** "Nuba" → "Nuba, Egypt", "Orlando" → "Orlando, Florida" (demo display) */
export function displayCity(l: Listing): string {
  if (l.country === "EG") return `${l.city}, Egypt`;
  if (l.country === "US") return `${l.city}, ${l.region ?? "Florida"}`;
  return l.city;
}

/** demo city display incl. country for MX (property page: "Tulum, Mexico") */
export function displayCityCountry(l: Listing): string {
  if (l.country === "MX") return `${l.city}, Mexico`;
  return displayCity(l);
}

/** listing gradient → demo g-class (g1…g6), demo-pinned for seed homes */
export function demoGradient(l: Listing, max: 4 | 6 = 4): string {
  const pinned = DEMO_STAY[l.slug]?.g;
  if (pinned) return pinned;
  const fromListing = l.gradient.replace(/^ph-/, "");
  const re = max === 6 ? /^g[1-6]$/ : /^g[1-4]$/;
  return re.test(fromListing) ? fromListing : "g1";
}

export function deriveTokens(l: Listing): string[] {
  const toks = [l.city.toLowerCase()];
  if (l.country === "EG") toks.push("egypt");
  if (l.country === "US") toks.push("florida");
  if (l.propertyType === "villa") toks.push("villas");
  if (l.propertyType === "penthouse") toks.push("penthouses");
  const blob = (l.headline + " " + l.amenities.join(" ")).toLowerCase();
  if (blob.includes("beach")) toks.push("beachfront");
  if (blob.includes("pool")) toks.push("private pool");
  if (l.maxGuests >= 6) toks.push("family");
  return toks;
}

export function stayTokens(l: Listing): string[] {
  return DEMO_STAY[l.slug]?.tokens ?? deriveTokens(l);
}

/**
 * Tours & Parks demo parity (Tours.html TOURS/PARKS): itinerary stops
 * [time, name, desc], gradient class, and the demo's display order.
 * Tours created later in the admin get no itinerary until a stops
 * editor exists — the card simply renders without the accordion.
 */
export const DEMO_TOUR: Record<string, { g: string; order: number; stops: [string, string, string][] }> = {
  "cenotes-coral-sea-turtles": {
    g: "g6", order: 0,
    stops: [
      ["Morning · Pickup", "Playa del Carmen", "Private, air-conditioned van pickup from your home or hotel."],
      ["1–2 Hours", "Cenote Dos Ojos", "Swim through crystal-clear water beneath ancient limestone."],
      ["Midday · Boat", "Akumal Bay", "Snorkel among sea turtles, tropical fish and living coral."],
      ["Afternoon", "Akumal Beach", "Free time on the sand before the drive back."],
      ["Return", "Back to Playa del Carmen", ""],
    ],
  },
  "cenotes-ruins-tulum": {
    g: "g3", order: 1,
    stops: [
      ["Morning · Pickup", "Playa del Carmen", "Private, air-conditioned van pickup."],
      ["1–2 Hours", "Cenote Dos Ojos", "A refreshing swim in one of the region’s most beautiful cenotes."],
      ["Guided Tour", "Tulum Site", "Explore the clifftop Maya ruins above the Caribbean."],
      ["Afternoon", "City Tour or Playa Ruinas", "Relax on the beach below the ruins, or a short city tour."],
      ["Return", "Back to Playa del Carmen", ""],
    ],
  },
  "coba-ruins-jungle-cenotes": {
    g: "g3", order: 2,
    stops: [
      ["Morning · Pickup", "Playa del Carmen", "Private, air-conditioned van pickup."],
      ["Guided Tour", "Coba Zone", "The jungle-wrapped ruins and towering Nohoch Mul pyramid."],
      ["Swim", "Cenote Choo-Ha", "Cool off in a stunning underground cenote."],
      ["Swim", "Cenote Tankach-Ha", "A second hidden cenote deep in the jungle."],
      ["Return", "Back to Playa del Carmen", ""],
    ],
  },
  "cozumel-private-boat": {
    g: "g1", order: 3,
    stops: [
      ["Morning · Pickup", "Playa to Cozumel", "Pickup and ferry crossing to the island."],
      ["Snorkel", "El Cielo & El Cielito", "Crystal-clear shallow reefs famous for starfish."],
      ["Snorkel", "Colombia & Lever", "Vibrant coral gardens teeming with life."],
      ["Onboard", "Snacks & Drinks", "Fresh ceviche, snacks and drinks on your private boat."],
      ["Return", "Back to Playa del Carmen", ""],
    ],
  },
  "tulum-akumal": {
    g: "g4", order: 4,
    stops: [
      ["Morning · Pickup", "Playa del Carmen", "Private, air-conditioned van pickup."],
      ["Swim", "Cenote Dos Ojos", "A refreshing swim beneath limestone formations."],
      ["Guided Tour", "Tulum Site", "The clifftop Maya ruins above the Caribbean."],
      ["Boat Snorkel", "Akumal Bay", "Snorkel among sea turtles and living coral."],
      ["Return", "Back to Playa del Carmen", ""],
    ],
  },
  "chichen-itza-valladolid": {
    g: "g2", order: 5,
    stops: [
      ["Early · Pickup", "Playa del Carmen", "An early start for a full day of wonders."],
      ["Quick Stop", "Valladolid", "A charming colonial pueblo mágico."],
      ["Swim", "Cenote Suytun", "The famous cenote with its iconic light beam."],
      ["Guided Tour", "Chichen Itza", "A private guided tour of the Wonder of the World."],
      ["Swim", "Cenote Samulá", "A beautiful cave cenote to end the day."],
      ["Return", "Back to Playa del Carmen", ""],
    ],
  },
  "ruta-de-cenotes": {
    g: "g6", order: 6,
    stops: [
      ["Morning · Pickup", "Playa del Carmen", "Private, air-conditioned van pickup."],
      ["Swim", "Two Open-Air Cenotes", "Sunlit cenotes surrounded by jungle."],
      ["Swim", "Two Underground Cenotes", "Mysterious cave cenotes."],
      ["Adventure", "Platform & Zip Line", "A diving platform and a water zip line over a cenote."],
      ["Return", "Back to Playa del Carmen", ""],
    ],
  },
  "holbox-island-escape": { g: "g4", order: 7, stops: [] },
  "isla-contoy": { g: "g1", order: 8, stops: [] },
  "xcaret-park": { g: "g3", order: 9, stops: [] },
  "xel-ha-park": { g: "g1", order: 10, stops: [] },
  "xplor-park": { g: "g6", order: 11, stops: [] },
  "xplor-fuego-park": { g: "g2", order: 12, stops: [] },
  "xenses-park": { g: "g5", order: 13, stops: [] },
  "jungala-aqua-park": { g: "g4", order: 14, stops: [] },
};

/** "Entire condo" style label (demo property PROPERTIES.type) */
export function propertyTypeLabel(l: Listing): string {
  const map: Record<Listing["propertyType"], string> = {
    condo: "Entire condo",
    villa: "Entire villa",
    house: "Entire home",
    apartment: "Entire apartment",
    penthouse: "Entire penthouse",
  };
  return DEMO_TYPE_LABEL[l.slug] ?? map[l.propertyType];
}
