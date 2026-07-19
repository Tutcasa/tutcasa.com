import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Why book with us",
  description:
    "Book direct with the family who owns and inspects every home — better prices, zero platform fees, and a real person on WhatsApp.",
};

const REASONS = [
  { icon: "💰", title: "Best price, guaranteed", body: "Booking direct skips the platform fees. Find the same home cheaper somewhere else and we'll match it." },
  { icon: "✈️", title: "Free airport pickup", body: "Land and relax. A private transfer from Cancún airport is included with qualifying stays." },
  { icon: "💬", title: "A concierge on WhatsApp", body: "A real person from your first message to your last night — restaurant bookings, tours, anything." },
  { icon: "🧾", title: "No hidden fees", body: "The price you see is the price you pay: taxes and cleaning included, always." },
  { icon: "🔒", title: "Secure card payment", body: "Pay safely online with the cards and wallets you already use." },
  { icon: "👨‍👩‍👧", title: "A real family, not a call center", body: "We own and inspect every home we list. When you message us, you talk to the family." },
];

export default function WhyBookPage() {
  return (
    <div className="mx-auto max-w-[1180px] px-4 sm:px-6">
      <section className="py-12 text-center">
        <p className="font-mono text-xs font-bold uppercase tracking-[.2em] text-terra">The TutCasa difference</p>
        <h1 className="mt-2 text-4xl font-extrabold">Why book with us</h1>
        <p className="mx-auto mt-4 max-w-[55ch] text-grey">
          Book direct with the family who owns and inspects every home —
          better prices, zero platform fees, and a real person on WhatsApp
          from your first message to your last night.
        </p>
      </section>

      <div className="grid gap-5 pb-12 sm:grid-cols-2 lg:grid-cols-3">
        {REASONS.map((r) => (
          <div key={r.title} className="rounded-card bg-paper p-6 shadow-soft">
            <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-rosa/10 text-2xl" aria-hidden>
              {r.icon}
            </div>
            <h3 className="font-display text-lg font-bold">{r.title}</h3>
            <p className="mt-1 text-sm text-grey">{r.body}</p>
          </div>
        ))}
      </div>

      <div className="pb-16 text-center">
        <Link href="/stays" className="rounded-pill bg-rosa px-7 py-3.5 font-bold text-white shadow-soft hover:bg-rosa-deep">
          Browse all casas →
        </Link>
      </div>
    </div>
  );
}
