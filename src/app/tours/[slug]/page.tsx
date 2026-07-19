import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { tourBySlug, fmtMXN } from "@/modules/tours";
import { TourBookingWidget } from "@/components/TourBookingWidget";

export const dynamic = "force-dynamic";

interface Props { params: Promise<{ slug: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const tour = await tourBySlug(slug);
  if (!tour) return {};
  return {
    title: `${tour.title} — ${tour.category === "park" ? "Park tickets" : "Private tour"}`,
    description: `${tour.subtitle ?? ""} From $${fmtMXN(tour.priceCents)} per person, operated with Amanah Vacations.`,
  };
}

export default async function TourPage({ params }: Props) {
  const { slug } = await params;
  const tour = await tourBySlug(slug);
  if (!tour || tour.status !== "published") notFound();

  return (
    <div className="mx-auto max-w-[1180px] px-4 sm:px-6">
      <div className="py-6">
        <Link href={tour.category === "park" ? "/tours?cat=parks" : "/tours"} className="font-semibold text-grey hover:text-rosa">
          ← Back to tours &amp; parks
        </Link>
      </div>

      <h1 className="text-3xl font-extrabold sm:text-4xl">{tour.title}</h1>
      {tour.subtitle && <p className="mt-1 font-semibold text-terra">{tour.subtitle}</p>}
      <p className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-sm text-grey">
        <span>⏱ {tour.durationLabel}</span>
        {tour.city && <span>📍 {tour.city}</span>}
        <span>🔒 Private — just your group</span>
      </p>

      <div className={`mt-6 h-64 rounded-card ph-g6`} />

      <div className="grid gap-10 py-10 lg:grid-cols-[1.6fr_1fr]">
        <div>
          <h2 className="mb-2 font-display text-lg font-bold">About this {tour.category}</h2>
          <p className="max-w-[65ch] leading-relaxed">{tour.description}</p>

          {tour.highlights.length > 0 && (
            <>
              <hr className="my-6 border-line" />
              <h3 className="mb-3 font-display text-lg font-bold">Highlights</h3>
              <ul className="grid gap-2 sm:grid-cols-2">
                {tour.highlights.map((h) => (
                  <li key={h} className="flex items-center gap-2 text-sm">
                    <span className="text-cactus">✓</span> {h}
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>

        <aside className="h-fit rounded-card bg-paper p-6 shadow-soft lg:sticky lg:top-24">
          <TourBookingWidget
            slug={tour.slug}
            priceLabel={`$${fmtMXN(tour.priceCents)}`}
            minGroup={tour.minGroup}
            maxGroup={tour.maxGroup}
            perPersonCents={tour.priceCents}
          />
        </aside>
      </div>
    </div>
  );
}
