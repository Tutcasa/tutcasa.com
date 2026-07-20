import type { Metadata } from "next";
import Link from "next/link";
import { getListingsRepo } from "@/modules/listings";
import { ListingCard } from "@/components/ListingCard";

interface Props {
  searchParams: Promise<{ city?: string; tag?: string }>;
}

const TAGS = [
  ["beachfront", "🏖️ Beachfront"],
  ["villas", "🏡 Villas"],
  ["private-pool", "🏊 Private pool"],
  ["family", "👨‍👩‍👧 Family"],
  ["penthouses", "🌇 Penthouses"],
] as const;

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const { city } = await searchParams;
  const where = city ? `in ${city}` : "across Mexico, Egypt & Florida";
  return {
    title: city ? `Vacation rentals in ${city}` : "Stays",
    description: `Browse our curated collection of vacation homes ${where}. All-in pricing, best rate guaranteed, free airport pickup included.`,
  };
}

export default async function StaysPage({ searchParams }: Props) {
  const { city, tag } = await searchParams;
  const repo = getListingsRepo();
  const [listings, cities] = await Promise.all([
    repo.listPublished({ city, tag }),
    repo.cities(),
  ]);
  const qs = (c?: string, t?: string) => {
    const p = new URLSearchParams();
    if (c) p.set("city", c);
    if (t) p.set("tag", t);
    return p.size ? `?${p}` : "";
  };

  return (
    <div className="mx-auto max-w-[1180px] px-4 sm:px-6">
      <section className="py-12 text-center">
        <h1 className="text-4xl font-extrabold">
          Find your <span className="text-rosa">casa.</span>
        </h1>
        <p className="mx-auto mt-3 max-w-[52ch] text-grey">
          Search our full collection of homes across Mexico, Egypt &amp; Florida.
        </p>
      </section>

      {/* city filter — server-rendered links, each one an indexable landing URL */}
      <nav className="mb-4 flex flex-wrap justify-center gap-2" aria-label="Filter by city">
        <Link
          href={`/stays${qs(undefined, tag)}`}
          className={`rounded-pill border-[1.5px] px-4 py-2 text-sm font-bold ${!city ? "border-ink bg-ink text-white" : "border-line bg-paper hover:border-rosa hover:text-rosa"}`}
        >
          All cities
        </Link>
        {cities.map((c) => (
          <Link
            key={c}
            href={`/stays${qs(c, tag)}`}
            className={`rounded-pill border-[1.5px] px-4 py-2 text-sm font-bold ${city === c ? "border-ink bg-ink text-white" : "border-line bg-paper hover:border-rosa hover:text-rosa"}`}
          >
            {c}
          </Link>
        ))}
      </nav>

      <nav className="mb-8 flex flex-wrap justify-center gap-2" aria-label="Filter by type">
        <Link
          href={`/stays${qs(city, undefined)}`}
          className={`rounded-pill border-[1.5px] px-4 py-2 text-sm font-bold ${!tag ? "border-rosa bg-rosa text-white" : "border-line bg-paper hover:border-rosa hover:text-rosa"}`}
        >
          🏠 All stays
        </Link>
        {TAGS.map(([t, label]) => (
          <Link
            key={t}
            href={`/stays${qs(city, t)}`}
            className={`rounded-pill border-[1.5px] px-4 py-2 text-sm font-bold ${tag === t ? "border-rosa bg-rosa text-white" : "border-line bg-paper hover:border-rosa hover:text-rosa"}`}
          >
            {label}
          </Link>
        ))}
      </nav>

      <p className="mb-6 text-sm text-grey">
        <b className="text-ink">{listings.length} homes available</b> · All
        prices are all-in — no hidden fees
      </p>

      <div className="grid gap-6 pb-10 sm:grid-cols-2 lg:grid-cols-3">
        {listings.map((l) => (
          <ListingCard key={l.id} listing={l} />
        ))}
      </div>
    </div>
  );
}
