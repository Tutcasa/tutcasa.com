import Link from "next/link";
import { getListingsRepo } from "@/modules/listings";
import { ListingCard } from "@/components/ListingCard";

export default async function HomePage() {
  const listings = await getListingsRepo().listPublished();
  const featured = listings.slice(0, 3);

  return (
    <div className="mx-auto max-w-[1180px] px-4 sm:px-6">
      {/* hero */}
      <section className="py-16 text-center sm:py-24">
        <h1 className="text-4xl font-extrabold sm:text-5xl">
          Find your casa in <span className="text-rosa">3 clicks.</span>
        </h1>
        <p className="mx-auto mt-4 max-w-[46ch] text-lg text-grey">
          No endless scrolling. Tell us how you travel — we&apos;ll match you
          with the right home. 🌴
        </p>
        <div className="mt-8 flex justify-center gap-3">
          <Link
            href="/stays"
            className="rounded-pill bg-rosa px-7 py-3.5 font-bold text-white shadow-soft hover:bg-rosa-deep"
          >
            Browse all casas
          </Link>
          <a
            href="https://wa.me/201069706782"
            target="_blank"
            rel="noopener"
            className="rounded-pill border-[1.5px] border-line bg-paper px-7 py-3.5 font-bold hover:border-rosa hover:text-rosa"
          >
            Ask May 👋
          </a>
        </div>
      </section>

      {/* trust strip */}
      <section className="grid gap-4 rounded-card bg-paper p-6 shadow-soft sm:grid-cols-3">
        {[
          ["💰", "Best rate guaranteed", "Always below the big platforms — book direct and save."],
          ["🚐", "Free airport pickup", "A private transfer is included with qualifying stays."],
          ["💬", "WhatsApp concierge", "A real person from your first message to your last night."],
        ].map(([icon, title, body]) => (
          <div key={title} className="flex gap-3">
            <span className="text-2xl" aria-hidden>{icon}</span>
            <div>
              <div className="font-display font-bold">{title}</div>
              <p className="text-sm text-grey">{body}</p>
            </div>
          </div>
        ))}
      </section>

      {/* featured */}
      <section className="py-14">
        <div className="mb-6 flex items-baseline justify-between">
          <h2 className="text-2xl font-extrabold sm:text-3xl">Popular casas</h2>
          <Link href="/stays" className="font-semibold text-rosa hover:underline">
            See all →
          </Link>
        </div>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {featured.map((l) => (
            <ListingCard key={l.id} listing={l} />
          ))}
        </div>
      </section>
    </div>
  );
}
