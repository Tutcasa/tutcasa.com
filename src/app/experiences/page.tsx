import "@/styles/demo/experiences.css";
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { BackBar } from "@/components/site/BackBar";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: { absolute: "TutCasa — Experiences" },
  description:
    "Tours, parks and adventures across the Riviera Maya & Yucatan - all at partner prices for TutCasa guests.",
};

interface Activity {
  slug: string;
  title: string;
  img: string | null;
  blurb: string;
  url: string; // amanahvacations.com destination page, carries ?ref=tutcasa
}

/** Live catalog from our partner — cached 5 minutes; the page still renders
    (with a fallback link) if the feed is briefly unreachable. */
async function getActivities(): Promise<Activity[]> {
  try {
    const base = process.env.AMANAH_SITE_URL ?? "https://amanahvacations.com";
    const res = await fetch(`${base}/api/activities`, { next: { revalidate: 300 } });
    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data.activities) ? data.activities : [];
  } catch {
    return [];
  }
}

export default async function ExperiencesPage() {
  const activities = await getActivities();

  return (
    <div className="pg-experiences">
      <BackBar />
      <div className="page-hero">
        <div className="sun"></div>
        <div className="eyebrow">Partner prices for TutCasa guests</div>
        <h1>Explore experiences</h1>
        <p>
          Tours, parks and adventures across the Riviera Maya &amp; Yucat&aacute;n
          &mdash; curated with our trusted partner, Amanah Vacations.
        </p>
        <div style={{ marginTop: 18 }}>
          <Link className="btn-rosa" href="/tours">Book tours &amp; parks here &rarr;</Link>
        </div>
      </div>

      <div style={{ maxWidth: 1180, margin: "0 auto", padding: "26px 18px 60px" }}>
        {activities.length === 0 ? (
          <p style={{ textAlign: "center", color: "var(--grey)" }}>
            The experience catalog is loading &mdash;{" "}
            <a href="https://amanahvacations.com/en/activities?ref=tutcasa" target="_blank" rel="noopener" style={{ color: "var(--rosa)", fontWeight: 700 }}>
              browse it on Amanah Vacations
            </a>{" "}in the meantime.
          </p>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(255px, 1fr))", gap: 18 }}>
            {activities.map((a) => (
              <a
                key={a.slug}
                href={a.url}
                target="_blank"
                rel="noopener"
                style={{
                  background: "var(--paper, #FFFDF9)", borderRadius: 20,
                  overflow: "hidden", boxShadow: "0 4px 14px rgba(58,44,40,.07)",
                  display: "flex", flexDirection: "column", color: "inherit",
                }}
              >
                <div style={{ position: "relative", aspectRatio: "4/3", background: "#F0E2D2" }}>
                  {a.img && (
                    <Image src={a.img} alt="" fill sizes="(max-width: 700px) 90vw, 280px" style={{ objectFit: "cover" }} />
                  )}
                </div>
                <div style={{ padding: "14px 16px 16px", display: "flex", flexDirection: "column", gap: 6, flexGrow: 1 }}>
                  <h3 style={{ fontFamily: "'Baloo 2'", fontSize: 17, fontWeight: 800, margin: 0 }}>{a.title}</h3>
                  <p style={{ fontSize: 13.5, color: "var(--grey)", margin: 0, flexGrow: 1 }}>
                    {a.blurb}{a.blurb.length >= 220 ? "…" : ""}
                  </p>
                  <span style={{ color: "var(--rosa)", fontWeight: 800, fontSize: 13.5 }}>Explore &rarr;</span>
                </div>
              </a>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
