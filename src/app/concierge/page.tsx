import "@/styles/demo/concierge.css";
import type { Metadata } from "next";
import Link from "next/link";
import { getSetting } from "@/modules/settings";
import { BackBar } from "@/components/site/BackBar";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: { absolute: "TutCasa — Luxury Concierge Services" },
  description:
    "Airport transfers, private chefs, grocery pre-stocking, excursions, spa, celebrations and more — TutCasa's concierge team personalizes every part of your stay.",
};

/* demo service icon backgrounds, cycled in order */
const BGS = ["#E4F3FA", "#FFE1EC", "#DFF3E8", "#FDE9D6"];

export default async function ConciergePage() {
  const [contact, c] = await Promise.all([
    getSetting("contact"),
    getSetting("page_concierge"),
  ]);
  const wa = (msg: string) =>
    `https://wa.me/${contact.whatsapp}?text=${encodeURIComponent("Hi TutCasa! " + msg + " \u{1F44B}")}`;

  return (
    <div className="pg-concierge">
      <BackBar />

      <section className="page-hero">
        <div className="sun"></div>
        <div className="wrap">
          <div className="eyebrow">{c.hero.eyebrow}</div>
          <h1>{c.hero.title}</h1>
          <p className="svc-intro">{c.hero.intro}</p>
          <div style={{ marginTop: 22, display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
            <a className="btn btn-rosa" href={wa("I’d like to plan concierge services for my stay")} target="_blank" rel="noopener">&#9990; Contact us to plan</a>
            <Link className="btn btn-soft" href="/tours">Browse tours &amp; experiences</Link>
          </div>
        </div>
      </section>

      <section className="wrap">
        <div className="sec-head-c"><div className="eyebrow">What we arrange</div><h2>Every detail, handled</h2></div>
        <div className="svc-grid">
          {c.services.map((s, i) => (
            <div className="svc" key={i}>
              <div className="ic" style={{ background: BGS[i % BGS.length] }}>{s.icon}</div>
              <h3>{s.title}</h3><div className="tag">{s.tag}</div>
              <div className="svc-list">{s.items.map((it) => <span key={it}>{it}</span>)}</div>
              {s.note && <div className="svc-note">{s.note}</div>}
            </div>
          ))}
        </div>

        <div className="why-band">
          <h2>Why choose TutCasa Concierge?</h2>
          <div className="why-grid">
            {c.why.map((w) => <div className="why-item" key={w}><span className="ck">&#10003;</span>{w}</div>)}
          </div>
        </div>

        <div className="sec-head-c"><div className="eyebrow">Simple by design</div><h2>How it works</h2></div>
        <div className="steps">
          {c.steps.map((s, i) => (
            <div className="step" key={i}><div className="num">{i + 1}</div><h4>{s.title}</h4><p>{s.text}</p></div>
          ))}
        </div>

        <div className="unique">
          <span className="deco">&#10024;</span>
          <h2>{c.uniqueTitle}</h2>
          <p>{c.uniqueText}</p>
          <div className="cta">
            <a className="btn btn-ghost" href={wa("I have a special concierge request")} target="_blank" rel="noopener">&#9990; Contact us on WhatsApp</a>
            <Link className="btn btn-soft" href="/contact" style={{ background: "#fff", color: "var(--rosa)" }}>Contact the team</Link>
          </div>
        </div>
      </section>
    </div>
  );
}
