import "@/styles/demo/tours.css";
import type { Metadata } from "next";
import { listTours, ADDONS, BYO_ACTS, type Tour } from "@/modules/tours";
import { getSetting } from "@/modules/settings";
import { DEMO_TOUR } from "@/lib/demo-parity";
import { ToursClient, type TourCardData } from "@/components/tours/ToursClient";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: { absolute: "TutCasa — Tours & Parks" },
  description:
    "Private tours & park tickets across the Riviera Maya & Yucatan - cenotes, Chichen Itza, Xcaret & more at partner prices for TutCasa guests.",
};

function toCard(t: Tour): TourCardData {
  const demo = DEMO_TOUR[t.slug];
  return {
    slug: t.slug,
    name: t.title,
    sub: t.subtitle ?? "",
    dur: t.durationLabel,
    desc: t.description,
    priceMXN: t.priceCents > 0 ? Math.round(t.priceCents / 100) : null,
    groupPrices: t.groupPrices,
    img: t.photoUrl,
    park: t.category === "park",
    city: t.city ?? "Playa del Carmen",
    g: demo?.g ?? "g1",
    // synced Amanah itineraries win; demo stops are the fallback
    stops: t.stops.length
      ? t.stops.map((s): [string, string, string] => [s.time, s.place, s.desc])
      : demo?.stops ?? [],
  };
}

export default async function ToursPage({
  searchParams,
}: {
  searchParams: Promise<{ cat?: string }>;
}) {
  const { cat } = await searchParams;
  const [tours, contact] = await Promise.all([listTours(), getSetting("contact")]);

  /* demo display order for the seeded tours; admin additions follow */
  const sorted = [...tours].sort((a, b) => {
    const oa = DEMO_TOUR[a.slug]?.order ?? 99;
    const ob = DEMO_TOUR[b.slug]?.order ?? 99;
    return oa - ob;
  });

  return (
    <div className="pg-tours">
      <ToursClient
        tours={sorted.map(toCard)}
        addons={ADDONS.map((a) => ({ name: a.name, icon: a.icon, priceMXN: a.priceMXN, unit: a.unit }))}
        byoActs={BYO_ACTS.map((a) => ({ name: a.name, icon: a.icon, priceMXN: a.priceMXN, unit: a.unit }))}
        whatsapp={contact.whatsapp}
        email={contact.email}
        initialView={cat === "parks" ? "parks" : "tours"}
      />
    </div>
  );
}
