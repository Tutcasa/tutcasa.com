import type { Metadata } from "next";
import { getSetting } from "@/modules/settings";
export const metadata: Metadata = {
  title: "Loyalty program",
  description: "Earn nights and perks every time you stay. Join the TutCasa loyalty program and refer friends for rewards.",
};

const PERKS = [
  ["🌙", "Earn on every night", "Every stay builds points toward free nights and upgrades."],
  ["🤝", "Refer a friend", "You both earn a reward when their first stay completes."],
  ["👑", "King-level perks", "Returning guests get early access, late checkouts and surprises."],
] as const;

export default async function LoyaltyPage() {
  const contact = await getSetting("contact");
  return (
    <div className="mx-auto max-w-[900px] px-4 sm:px-6">
      <section className="py-12 text-center">
        <h1 className="text-4xl font-extrabold">Stay loyal, <span className="text-rosa">stay royal.</span></h1>
        <p className="mx-auto mt-4 max-w-[52ch] text-grey">
          Earn nights and perks every time you stay — and every time a friend
          books their first casa.
        </p>
      </section>
      <div className="grid gap-5 pb-10 sm:grid-cols-3">
        {PERKS.map(([ic, t, b]) => (
          <div key={t} className="rounded-card bg-paper p-6 text-center shadow-soft">
            <div className="text-3xl" aria-hidden>{ic}</div>
            <h3 className="mt-2 font-display text-lg font-bold">{t}</h3>
            <p className="mt-1 text-sm text-grey">{b}</p>
          </div>
        ))}
      </div>
      <div className="pb-16 text-center">
        <a
          href={`https://wa.me/${contact.whatsapp}?text=${encodeURIComponent("Hi May! I'd like to join the loyalty program 👑")}`}
          target="_blank" rel="noopener"
          className="rounded-pill bg-rosa px-7 py-3.5 font-bold text-white shadow-soft hover:bg-rosa-deep"
        >
          Join the program 👑
        </a>
      </div>
    </div>
  );
}
