import Link from "next/link";
import { getListingsRepo } from "@/modules/listings";
import { listTours, fmtMXN } from "@/modules/tours";
import { ListingCard } from "@/components/ListingCard";
import { HomeWizard } from "@/components/HomeWizard";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const [listings, tours] = await Promise.all([
    getListingsRepo().listPublished(),
    listTours({ category: "tour" }),
  ]);
  const featured = listings.slice(0, 3);
  const popularTours = tours.slice(0, 3);
  const GRADS = ["ph-g6", "ph-g3", "ph-g2"];

  return (
    <div className="mx-auto max-w-[1180px] px-4 sm:px-6">
      {/* hero + 3-clicks wizard (guest) / owner pitch */}
      <section className="py-12 sm:py-16">
        <HomeWizard />
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

      {/* popular casas */}
      <section className="py-14">
        <div className="mb-6 flex items-baseline justify-between">
          <h2 className="text-2xl font-extrabold sm:text-3xl">Popular casas</h2>
          <Link href="/stays" className="font-semibold text-rosa hover:underline">
            See all our properties →
          </Link>
        </div>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {featured.map((l) => (
            <ListingCard key={l.id} listing={l} />
          ))}
        </div>
      </section>

      {/* book alongside your stay */}
      <section className="pb-14">
        <p className="font-mono text-xs font-bold uppercase tracking-[.2em] text-terra">
          Book alongside your stay
        </p>
        <div className="mb-6 mt-1 flex items-baseline justify-between">
          <h2 className="text-2xl font-extrabold sm:text-3xl">Popular experiences</h2>
          <Link href="/tours" className="font-semibold text-rosa hover:underline">
            See all experiences →
          </Link>
        </div>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {popularTours.map((t, i) => (
            <Link key={t.id} href={`/tours/${t.slug}`}
                  className="group overflow-hidden rounded-card bg-paper shadow-soft transition-shadow hover:shadow-lift">
              <div className={`relative h-36 ${GRADS[i % 3]}`}>
                <span className="absolute right-3 top-3 rounded-pill bg-ink/80 px-3 py-1 text-xs font-bold text-white">
                  {t.durationLabel}
                </span>
              </div>
              <div className="p-4">
                <h3 className="font-display font-bold group-hover:text-rosa">{t.title}</h3>
                <p className="mt-1 text-sm">
                  <span className="font-display font-extrabold text-rosa">${fmtMXN(t.priceCents)}</span>{" "}
                  <span className="text-grey">/ person</span>
                </p>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* familia band */}
      <section className="mb-4 overflow-hidden rounded-card bg-paper shadow-soft lg:grid lg:grid-cols-[1fr_1.4fr]">
        <div className="ph-g4 min-h-44" />
        <div className="p-7 sm:p-9">
          <p className="font-mono text-xs font-bold uppercase tracking-[.2em] text-terra">Somos familia</p>
          <h2 className="mt-1 text-2xl font-extrabold sm:text-3xl">A family behind every stay.</h2>
          <p className="mt-3 max-w-[58ch] text-grey">
            TutCasa is run by a Canadian–Egyptian couple who own and inspect
            every home in the collection. When you message us, you talk to the
            family — not a call center.
          </p>
          <Link href="/our-family" className="mt-5 inline-block font-bold text-rosa hover:underline">
            Meet our family →
          </Link>
        </div>
      </section>
    </div>
  );
}
