import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Our Family",
  description:
    "Meet the Canadian-Egyptian family behind TutCasa — hosts who own and inspect every home in the collection.",
};

export default function OurFamilyPage() {
  return (
    <div className="mx-auto max-w-[900px] px-4 sm:px-6">
      <section className="py-12 text-center">
        <p className="font-mono text-xs font-bold uppercase tracking-[.2em] text-terra">Our story</p>
        <h1 className="mt-2 text-4xl font-extrabold">
          The family behind <span className="text-rosa">TutCasa.</span>
        </h1>
        <p className="mx-auto mt-4 max-w-[50ch] text-lg text-grey">
          A Canadian–Egyptian couple who turned a love of travel into a home
          for every kind of traveller.
        </p>
      </section>

      <div className="ph-g3 h-64 rounded-card" />

      <section className="mx-auto max-w-[65ch] space-y-5 py-12 leading-relaxed">
        <p>
          TUT CASA was born from a shared vision between a Canadian–Egyptian
          couple with a deep passion for travel and meaningful experiences.
          What started as finding a way to rent our condo in Playa del Carmen,
          Mexico quickly grew into something much bigger.
        </p>
        <p>
          As passionate travellers, we saw an opportunity in the vacation
          rentals market — one to deliver stays that feel effortless, elevated,
          and truly memorable for our guests, while maximizing ROI for the
          owners who trust us with their homes.
        </p>
        <p>
          Today, TUT CASA offers a curated collection of 40+ homes in Mareazul,
          Playa del Carmen and beyond, welcoming 200+ satisfied guests into
          seamless, home-away-from-home experiences designed for comfort,
          style, and unforgettable moments.
        </p>
      </section>

      <section className="grid gap-4 pb-14 text-center sm:grid-cols-3">
        {[["40+", "homes in the curated collection"], ["200+", "guests welcomed"], ["24/7", "family-run support"]].map(([k, v]) => (
          <div key={v} className="rounded-card bg-paper p-6 shadow-soft">
            <div className="font-display text-3xl font-extrabold text-rosa">{k}</div>
            <div className="mt-1 text-sm text-grey">{v}</div>
          </div>
        ))}
      </section>

      <div className="pb-16 text-center">
        <Link href="/stays" className="rounded-pill bg-rosa px-7 py-3.5 font-bold text-white shadow-soft hover:bg-rosa-deep">
          Meet our casas →
        </Link>
      </div>
    </div>
  );
}
