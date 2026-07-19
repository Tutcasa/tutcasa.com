import type { Metadata } from "next";
import Link from "next/link";
import { listTours, fmtMXN } from "@/modules/tours";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Tours & Parks",
  description:
    "Private tours & park tickets across the Riviera Maya & Yucatán — cenotes, Chichén Itzá, Xcaret & more, operated with our partner Amanah Vacations.",
};

const GRADS = ["ph-g6", "ph-g3", "ph-g1", "ph-g2", "ph-g4", "ph-g5"];

export default async function ToursPage({
  searchParams,
}: {
  searchParams: Promise<{ cat?: string }>;
}) {
  const { cat } = await searchParams;
  const category = cat === "parks" ? "park" : "tour";
  const tours = await listTours({ category });

  return (
    <div className="mx-auto max-w-[1180px] px-4 sm:px-6">
      <section className="py-12 text-center">
        <h1 className="text-4xl font-extrabold">
          Tours &amp; <span className="text-rosa">Parks.</span>
        </h1>
        <p className="mx-auto mt-3 max-w-[52ch] text-grey">
          Private day adventures and park tickets across the Riviera Maya —
          every tour is just for your group.
        </p>
      </section>

      <nav className="mb-8 flex justify-center gap-2" aria-label="Category">
        <Link
          href="/tours"
          className={`rounded-pill border-[1.5px] px-5 py-2.5 text-sm font-bold ${category === "tour" ? "border-ink bg-ink text-white" : "border-line bg-paper hover:border-rosa hover:text-rosa"}`}
        >
          🌴 Tours
        </Link>
        <Link
          href="/tours?cat=parks"
          className={`rounded-pill border-[1.5px] px-5 py-2.5 text-sm font-bold ${category === "park" ? "border-ink bg-ink text-white" : "border-line bg-paper hover:border-rosa hover:text-rosa"}`}
        >
          🎢 Parks
        </Link>
      </nav>

      <div className="grid gap-6 pb-12 sm:grid-cols-2 lg:grid-cols-3">
        {tours.map((t, i) => (
          <Link
            key={t.id}
            href={`/tours/${t.slug}`}
            className="group overflow-hidden rounded-card bg-paper shadow-soft transition-shadow hover:shadow-lift"
          >
            <div className={`relative h-44 ${GRADS[i % GRADS.length]}`}>
              <span className="absolute right-3 top-3 rounded-pill bg-ink/80 px-3 py-1 text-xs font-bold text-white">
                {t.durationLabel}
              </span>
            </div>
            <div className="p-4">
              <h3 className="font-display text-lg font-bold group-hover:text-rosa">
                {t.title}
              </h3>
              {t.subtitle && <p className="text-sm font-semibold text-terra">{t.subtitle}</p>}
              <p className="mt-2 line-clamp-2 text-sm text-grey">{t.description}</p>
              <p className="mt-3 text-sm">
                <span className="font-display text-lg font-extrabold text-rosa">
                  ${fmtMXN(t.priceCents)}
                </span>{" "}
                <span className="text-grey">/ person</span>
              </p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
