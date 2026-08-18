import "@/styles/demo/policies.css";
import type { Metadata } from "next";
import { getSetting } from "@/modules/settings";
import { BackBar } from "@/components/site/BackBar";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: { absolute: "TutCasa — FAQ" },
  description:
    "Frequently asked questions about booking, payments, the free airport pickup, tours and your stay with TutCasa.",
};

export default async function FaqPage() {
  const c = await getSetting("page_faq");
  return (
    <div className="pg-policies">
      <BackBar />
      <div className="page-hero" style={{ padding: "28px 0 2px" }}>
        <div className="sun"></div>
        <div className="eyebrow">{c.hero.eyebrow}</div>
        <h1>{c.hero.title}</h1>
        <p>{c.hero.intro}</p>
      </div>
      <div className="pol-wrap" style={{ display: "block", maxWidth: 760, margin: "0 auto" }}>
        <div>
          {c.items.map((f, i) => (
            <details key={i} className="pol-sec" style={{ cursor: "pointer" }}>
              <summary style={{ fontWeight: 800, fontSize: 17, listStyle: "none" }}>
                {f.q}
              </summary>
              <p style={{ marginTop: 10 }}>{f.a}</p>
            </details>
          ))}
        </div>
      </div>
    </div>
  );
}
