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

/* ---------- admin-editable page copy (defaults = the approved demo copy;
   the admin Content page overrides them via site_settings) ---------- */

export interface PageHero {
  eyebrow: string;
  title: string;
  intro: string;
}

export interface PoliciesContent {
  hero: PageHero;
  /** body lines starting with "- " render as bullets, others as paragraphs */
  sections: { id: string; title: string; body: string }[];
}

export interface WhyBookContent {
  hero: PageHero;
  cards: { icon: string; title: string; text: string }[];
}

export interface ConciergeContent {
  hero: PageHero;
  services: { icon: string; title: string; tag: string; items: string[]; note?: string }[];
  why: string[];
  steps: { title: string; text: string }[];
  uniqueTitle: string;
  uniqueText: string;
}

export interface LoyaltyContent {
  hero: PageHero;
  step1Title: string;
  step1Text: string;
  friendAmount: string;
  friendTitle: string;
  friendText: string;
  youAmount: string;
  youTitle: string;
  youText: string;
  bandTitle: string;
  bandText: string;
}

/** Synced from amanahvacations.com — the tour add-ons picker catalog. */
export interface TourAddonsSetting {
  items: { name: string; icon: string; priceMXN: number; unit: string }[];
}

const DEFAULTS: {
  contact: ContactSettings;
  investor: InvestorSettings;
  page_policies: PoliciesContent;
  page_why: WhyBookContent;
  page_concierge: ConciergeContent;
  page_loyalty: LoyaltyContent;
  tour_addons: TourAddonsSetting;
} = {
  contact: { whatsapp: "201069706782", email: "", instagram: "", facebook: "" },
  investor: { deck_url: "", deck_name: "" },
  tour_addons: { items: [] },

  page_policies: {
    hero: {
      eyebrow: "Good to know",
      title: "Help & policies",
      intro: "Everything about deposits, payments and cancellations — clear and upfront. Have a question we haven’t covered? May is one message away.",
    },
    sections: [
      { id: "deposit", title: "💳 Reservation deposit", body: "To confirm your dates we ask for a deposit, with the balance due before arrival:\n- Condos & Villas — 50% deposit to reserve. The remaining balance is due 30 days before arrival, and finalised 15 days prior.\n- Hotels — 50% deposit to reserve, with the balance due 15 days before arrival." },
      { id: "security", title: "🔑 Refundable security deposit", body: "A refundable security deposit is held against accidental damage. It’s fully returned after check-out once the home has been inspected and everything is in order." },
      { id: "keys", title: "🗝️ Keys & access", body: "- Most homes use a secure key box or digital lock — we send the code and directions before you arrive.\n- Lost keys or remotes are charged at $100 to cover replacement." },
      { id: "restrictions", title: "⚠️ Restrictions", body: "- No parties or events without prior written approval.\n- No smoking indoors.\n- Please respect the maximum guest count on your reservation and quiet hours in the community." },
      { id: "cancellation", title: "📅 Cancellation policy", body: "Condos & Villas\n- 30+ days before arrival — full refund.\n- Between 30 and 7 days — 50% refund.\n- 7 days or less — non-refundable.\nHotels\n- 15+ days before arrival — full refund.\n- Within 15 days — one night is charged, the rest refunded." },
      { id: "payment", title: "💰 Payment options", body: "Pay whichever way is easiest for you:\n- Credit or debit card (securely via Stripe)\n- PayPal\n- Zelle\n- Bank wire / direct bank transfer\n🇪🇬 Paying from Egypt? We also accept InstaPay. Just ask May and we’ll share the details." },
    ],
  },

  page_why: {
    hero: {
      eyebrow: "The TutCasa difference",
      title: "Why book with us",
      intro: "Book direct with the family who owns and inspects every home — better prices, zero platform fees, and a real person on WhatsApp from your first message to your last night.",
    },
    cards: [
      { icon: "💰", title: "Best price, guaranteed", text: "Booking direct skips the platform fees. Find the same home cheaper somewhere else and we’ll match it." },
      { icon: "✈️", title: "Free airport pickup", text: "Land and relax. A private transfer from Cancún airport is included with qualifying stays." },
      { icon: "💬", title: "A concierge on WhatsApp", text: "May answers in minutes — restaurant tips, tours, early check-in. No tickets, no bots, just us." },
      { icon: "🔑", title: "No hidden fees", text: "The price you see is the price you pay. No surprise cleaning or service charges at the end." },
      { icon: "💳", title: "Secure card payment", text: "Pay safely by card through Stripe, or use PayPal, Zelle and bank transfer — whatever suits you." },
      { icon: "💕", title: "A real family, not a call center", text: "A Canadian-Egyptian couple who fell in love with the Riviera Maya. Every home is one we’d put our own parents in." },
    ],
  },

  page_concierge: {
    hero: {
      eyebrow: "Luxury Concierge Services",
      title: "More than a stay. A complete experience.",
      intro: "At TutCasa, exceptional travel goes beyond beautiful accommodations. Our dedicated concierge team personalizes every part of your stay — a romantic escape, a family vacation, a corporate retreat or a special celebration — so you can simply relax and enjoy.",
    },
    services: [
      { icon: "🚴", title: "Airport Transfers", tag: "Your vacation begins the moment you land.", items: ["Private airport transfers", "Luxury SUVs", "Executive transportation", "Group transportation", "Child seats on request", "VIP meet & greet"] },
      { icon: "🍳", title: "Private Chef Experience", tag: "Restaurant-quality dining in your villa.", items: ["Daily breakfast", "Family dinners", "Romantic dinners", "Birthday celebrations", "Wedding events", "Vegetarian & vegan", "Halal-friendly on request"] },
      { icon: "🛒", title: "Grocery Pre-Stocking", tag: "Arrive to a fully stocked villa.", items: ["Fresh fruits & veg", "Snacks", "Water & soft drinks", "Wine & spirits", "Baby supplies", "Household essentials"], note: "Send us your list before arrival and it’s waiting for you." },
      { icon: "🌴", title: "Excursions & Experiences", tag: "Discover the very best of the Riviera Maya.", items: ["Catamaran cruises", "Isla Mujeres", "Cozumel", "Chichén Itzá", "Tulum & cenotes", "Snorkeling & diving", "Fishing charters", "Yacht rentals", "ATV & ziplining", "Bacalar Lagoon", "Eco parks"], note: "Curated with our trusted travel partner, Amanah Vacations (amanahvacations.com?ref=tutcasa)." },
      { icon: "🧘", title: "Wellness & Spa", tag: "Relaxation, brought to your villa.", items: ["Massage therapy", "Couples massage", "Facials", "Yoga sessions", "Personal trainers", "Meditation", "Beauty services"] },
      { icon: "🎉", title: "Special Celebrations", tag: "Celebrate life’s biggest moments.", items: ["Decorations", "Cakes & flowers", "Live musicians", "Photographers", "Videographers", "Fireworks (where permitted)", "Event coordination"], note: "Birthdays, honeymoons, proposals, anniversaries, bachelor & bachelorette parties." },
      { icon: "⛵", title: "Yacht & Luxury Experiences", tag: "Experience the Caribbean in style.", items: ["Half-day charters", "Full-day charters", "Sunset cruises", "Private islands", "Snorkeling trips", "Fishing excursions"] },
      { icon: "👶", title: "Family Services", tag: "Traveling with children, made easy.", items: ["Babysitting", "Cribs & high chairs", "Baby equipment", "Children’s activities", "Family excursions"] },
      { icon: "💻", title: "Business & Remote Work", tag: "Stay productive while you travel.", items: ["High-speed Wi-Fi help", "Private workspaces", "Office equipment", "Printing", "Transport for meetings", "Executive transportation"] },
      { icon: "🔔", title: "Personal Concierge", tag: "Anything else? Just ask.", items: ["Restaurant reservations", "Beach clubs", "Nightlife tips", "Local experiences", "Last-minute requests", "Shopping assistance", "Medical coordination", "Emergency support"], note: "One dedicated point of contact throughout your stay." },
    ],
    why: ["Personalized service", "Local experts", "Trusted partners", "Curated experiences", "Fast response times", "Seamless planning", "Luxury-focused service", "One point of contact"],
    steps: [
      { title: "Book Your Villa", text: "Reserve your perfect TutCasa property." },
      { title: "Tell Us Your Preferences", text: "Share your interests, dietary needs, arrival details and special requests." },
      { title: "We Plan Everything", text: "Our concierge team organizes every service before you arrive." },
      { title: "Relax & Enjoy", text: "Arrive to a fully prepared vacation, with support whenever you need it." },
    ],
    uniqueTitle: "Need something unique?",
    uniqueText: "No request is too small — or too extraordinary. From surprise proposals and private celebrations to luxury transportation and tailor-made experiences, our concierge team is here to make it happen. Tell us what you have in mind, and we’ll take care of the rest.",
  },

  page_loyalty: {
    hero: {
      eyebrow: "Friendship & loyalty program",
      title: "Share the love, get rewarded",
      intro: "Tell a friend about TutCasa and you both win. They save on their first stay, and you earn credit toward your next one — no limits, stack as many as you like.",
    },
    step1Title: "Refer a friend",
    step1Text: "Send us your details and your friend’s below. We’ll send them a warm welcome and their coupon.",
    friendAmount: "$100",
    friendTitle: "Your friend saves",
    friendText: "They get a $100 discount coupon to use on their first TutCasa booking.",
    youAmount: "$200",
    youTitle: "You earn",
    youText: "Once they complete a reservation, you receive a $200 coupon toward your next stay.",
    bandTitle: "No limits, fully stackable.",
    bandText: "Refer as many friends as you like — every completed booking earns you another $200. Coupons stack on a single stay.",
  },
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
