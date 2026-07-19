import Link from "next/link";
import type { Listing } from "@/modules/listings";
import { allInNightlyCents, fmtMoney } from "@/modules/pricing";

export function ListingCard({ listing }: { listing: Listing }) {
  return (
    <Link
      href={`/stays/${listing.slug}`}
      className="group overflow-hidden rounded-card bg-paper shadow-soft transition-shadow hover:shadow-lift"
    >
      <div className={`relative h-52 ${listing.gradient}`}>
        <span className="absolute left-3 top-3 rounded-pill bg-white/90 px-3 py-1 text-xs font-bold text-ink">
          {listing.headline}
        </span>
      </div>
      <div className="p-4">
        <div className="flex items-baseline justify-between gap-2">
          <h3 className="font-display text-lg font-bold group-hover:text-rosa">
            {listing.title}
          </h3>
          <span className="shrink-0 text-sm font-bold">
            ★ {listing.rating.toFixed(2)}
          </span>
        </div>
        <p className="text-sm text-grey">
          {listing.city} · {listing.bedrooms} BR · {listing.maxGuests} guests
        </p>
        <p className="mt-2 text-sm">
          <span className="font-display text-lg font-extrabold text-ink">
            {fmtMoney(allInNightlyCents(listing))}
          </span>{" "}
          <span className="text-grey">/ night all-in</span>
        </p>
      </div>
    </Link>
  );
}
