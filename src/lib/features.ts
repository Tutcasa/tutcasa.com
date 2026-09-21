/**
 * Filter features — the ONE list behind the stays filters (chips + drawer)
 * and the admin "Filters & features" checkboxes. A home matches a filter
 * if and only if the admin ticked it. Nothing is guessed from amenity
 * text anymore: imported Airbnb amenity lists differ per home and made
 * every keyword rule wrong somewhere.
 */
export const FEATURES: { key: string; label: string; icon: string; group: "location" | "unit" | "resort" }[] = [
  { key: "beachfront",   label: "Beachfront",        icon: "🏖️", group: "location" },
  { key: "ocean_view",   label: "Ocean / beach view", icon: "🌊", group: "location" },
  { key: "beach_access", label: "Beach access",      icon: "🚶", group: "location" },
  { key: "private_pool", label: "Private pool",      icon: "🏊", group: "unit" },
  { key: "jacuzzi",      label: "Jacuzzi / hot tub", icon: "♨️", group: "unit" },
  { key: "kitchen",      label: "Full kitchen",      icon: "🍳", group: "unit" },
  { key: "washer_dryer", label: "Washer & dryer",    icon: "🧺", group: "unit" },
  { key: "wifi",         label: "Wi-Fi",             icon: "📶", group: "unit" },
  { key: "ac",           label: "Air conditioning",  icon: "❄️", group: "unit" },
  { key: "gym",          label: "Gym / fitness",     icon: "🏋️", group: "resort" },
  { key: "tennis",       label: "Tennis / padel",    icon: "🎾", group: "resort" },
  { key: "parking",      label: "Free parking",      icon: "🚗", group: "resort" },
];

export const FEATURE_KEYS = FEATURES.map((f) => f.key);

export const featureLabel = (key: string) => FEATURES.find((f) => f.key === key)?.label ?? key;
