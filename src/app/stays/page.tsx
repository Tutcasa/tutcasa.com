import "@/styles/demo/stays.css";
import type { Metadata } from "next";
import { getListingsRepo, type Listing } from "@/modules/listings";
import { StaysClient, type StayCard } from "@/components/stays/StaysClient";
import { demoGradient, displayCity, stayTokens } from "@/lib/demo-parity";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: { absolute: "TutCasa — Stays" },
  description:
    "Browse our curated collection of vacation homes across Mexico, Egypt & Florida. All-in pricing, best rate guaranteed, free airport pickup included.",
};

function toCard(l: Listing): StayCard {
  return {
    slug: l.slug,
    name: l.title,
    city: displayCity(l),
    tokens: stayTokens(l),
    beds: l.bedrooms,
    rate: l.rating.toFixed(2),
    price: Math.round(l.nightlyCents / 100),
    lat: l.lat,
    lng: l.lng,
    g: demoGradient(l, 4),
    tag: l.headline,
  };
}

export default async function StaysPage({
  searchParams,
}: {
  searchParams: Promise<{ match?: string; dest?: string; vibe?: string; ci?: string; co?: string }>;
}) {
  const q = await searchParams;
  const listings = await getListingsRepo().listPublished();
  return (
    <div className="pg-stays">
      <StaysClient
        props={listings.map(toCard)}
        initial={{
          match: q.match === "1",
          dest: (q.dest ?? "").trim(),
          vibe: (q.vibe ?? "").trim(),
          ci: q.ci ?? "",
          co: q.co ?? "",
        }}
      />
    </div>
  );
}
