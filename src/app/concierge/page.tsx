import type { Metadata } from "next";
import { getSetting } from "@/modules/settings";

export const metadata: Metadata = {
  title: "Concierge",
  description:
    "Your personal concierge in the Riviera Maya — airport transfers, private chefs, groceries, tours & more, one WhatsApp message away.",
};

const SERVICES: { icon: string; bg: string; title: string; tag: string; items: string[]; note?: string }[] = [
  { icon: "🚐", bg: "#E4F3FA", title: "Airport Transfers", tag: "Your vacation begins the moment you land.",
    items: ["Private airport transfers", "Luxury SUVs", "Executive transportation", "Group transportation", "Child seats on request", "VIP meet & greet"] },
  { icon: "🍳", bg: "#FFE1EC", title: "Private Chef Experience", tag: "Restaurant-quality dining in your villa.",
    items: ["Daily breakfast", "Family dinners", "Romantic dinners", "Birthday celebrations", "Wedding events", "Vegetarian & vegan", "Halal-friendly on request"] },
  { icon: "🛒", bg: "#DFF3E8", title: "Grocery Pre-Stocking", tag: "Arrive to a fully stocked villa.",
    items: ["Fresh fruits & veg", "Snacks", "Water & soft drinks", "Wine & spirits", "Baby supplies", "Household essentials"],
    note: "Send us your list before arrival and it's waiting for you." },
  { icon: "🌴", bg: "#FDE9D6", title: "Excursions & Experiences", tag: "Discover the very best of the Riviera Maya.",
    items: ["Catamaran cruises", "Isla Mujeres", "Cozumel", "Chichén Itzá", "Tulum & cenotes", "Snorkeling & diving", "Fishing charters", "Yacht rentals", "ATV & ziplining", "Bacalar Lagoon", "Eco parks"],
    note: "Curated with our trusted travel partner, Amanah Vacations." },
  { icon: "🧘", bg: "#E4F3FA", title: "Wellness & Spa", tag: "Relaxation, brought to your villa.",
    items: ["Massage therapy", "Couples massage", "Facials", "Yoga sessions", "Personal trainers", "Meditation", "Beauty services"] },
  { icon: "🎉", bg: "#FFE1EC", title: "Special Celebrations", tag: "Celebrate life's biggest moments.",
    items: ["Decorations", "Cakes & flowers", "Live musicians", "Photographers", "Videographers", "Fireworks (where permitted)", "Event coordination"],
    note: "Birthdays, honeymoons, proposals, anniversaries, bachelor & bachelorette parties." },
  { icon: "⛵", bg: "#DFF3E8", title: "Yacht & Luxury Experiences", tag: "Experience the Caribbean in style.",
    items: ["Half-day charters", "Full-day charters", "Sunset cruises", "Private islands", "Snorkeling trips", "Fishing excursions"] },
  { icon: "👶", bg: "#FDE9D6", title: "Family Services", tag: "Traveling with children, made easy.",
    items: ["Cribs & high chairs", "Strollers", "Babysitting on request", "Kid-friendly tours", "Early dinner arrangements"] },
];

export default async function ConciergePage() {
  const contact = await getSetting("contact");
  return (
    <div className="mx-auto max-w-[1180px] px-4 sm:px-6">
      <section className="py-12 text-center">
        <h1 className="text-4xl font-extrabold">
          Luxury <span className="text-rosa">concierge.</span>
        </h1>
        <p className="mx-auto mt-4 max-w-[60ch] text-grey">
          At TutCasa, exceptional travel goes beyond beautiful accommodations.
          Our dedicated concierge team personalizes every part of your stay — a
          romantic escape, a family vacation, a corporate retreat or a special
          celebration — so you can simply relax and enjoy.
        </p>
        <a
          href={`https://wa.me/${contact.whatsapp}?text=${encodeURIComponent("Hi May! I'd like to plan something special for my stay 👋")}`}
          target="_blank" rel="noopener"
          className="mt-6 inline-block rounded-pill bg-[#1EBE5D] px-7 py-3.5 font-bold text-white shadow-soft"
        >
          Message our concierge 💬
        </a>
      </section>

      <div className="grid gap-5 pb-14 sm:grid-cols-2 lg:grid-cols-3">
        {SERVICES.map((s) => (
          <div key={s.title} className="rounded-card bg-paper p-5 shadow-soft">
            <div
              className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl text-2xl"
              style={{ background: s.bg }}
              aria-hidden
            >
              {s.icon}
            </div>
            <h3 className="font-display text-lg font-bold">{s.title}</h3>
            <p className="mb-3 text-sm font-semibold text-terra">{s.tag}</p>
            <div className="flex flex-wrap gap-1.5">
              {s.items.map((i) => (
                <span key={i} className="rounded-pill bg-crema px-2.5 py-1 text-xs font-semibold">
                  {i}
                </span>
              ))}
            </div>
            {s.note && <p className="mt-3 text-xs italic text-grey">{s.note}</p>}
          </div>
        ))}
      </div>
    </div>
  );
}
