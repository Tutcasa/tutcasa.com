import "@/styles/demo/investors.css";
import type { Metadata } from "next";
import Link from "next/link";
import { BackBar } from "@/components/site/BackBar";
import { DeckButton, DeckModal } from "@/components/pages/InvestorsDeckModal";
import { getSetting } from "@/modules/settings";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: { absolute: "TutCasa — Investors" },
  description:
    "Invest in the future of luxury vacation rentals — TutCasa combines premium homes, concierge-first service and technology across the Riviera Maya and beyond.",
};

export default async function InvestorsPage() {
  // every word below is editable in Admin → Content & info → Investors
  const c = await getSetting("page_investors");
  return (
    <div className="pg-investors">
      <BackBar />

      <section className="inv-hero">
        <div className="glow"></div>
        <div className="wrap">
          <div className="eyebrow">Investors</div>
          <h1>{c.heroTitle} <span style={{ color: "var(--sol)" }}>{c.heroHighlight}</span></h1>
          <p>{c.heroIntro}</p>
          <div className="cta">
            <DeckButton label="Request investor deck" />
            <Link className="btn btn-ghost" href="/contact">Contact us</Link>
          </div>
          <div className="inv-metrics">
            {c.metrics.map((mt) => (
              <div key={mt.s}><b>{mt.b}</b><span>{mt.s}</span></div>
            ))}
          </div>
        </div>
      </section>

      <div className="wrap">
        <section className="sec">
          <div className="eyebrow">Our vision</div>
          <h2>{c.visionTitle}</h2>
          <p className="lede">{c.visionText}</p>
        </section>

        <section className="sec">
          <div className="eyebrow">The opportunity</div>
          <h2>{c.oppTitle}</h2>
          <div className="gap">
            <p className="lede" style={{ marginTop: 0 }}>{c.oppText}</p>
            <div className="painbox">
              <h4>{c.painTitle}</h4>
              <ul>
                {c.painPoints.map((pp) => <li key={pp}>{pp}</li>)}
              </ul>
            </div>
          </div>
        </section>

        <section className="sec">
          <div className="eyebrow">Why TutCasa</div>
          <h2>{c.advTitle}</h2>
          <div className="cards3">
            {c.advantages.map((a) => (
              <div className="icard" key={a.title}><div className="ic">{a.icon}</div><h4>{a.title}</h4><p>{a.text}</p></div>
            ))}
          </div>
        </section>

        <section className="sec">
          <div className="eyebrow">Market potential</div>
          <h2>{c.marketTitle}</h2>
          <p className="lede">{c.marketText}</p>
          <div className="trend">{c.trends.map((t) => <span key={t}>{t}</span>)}</div>
        </section>

        <section className="sec">
          <div className="eyebrow">Business model</div>
          <h2>{c.revTitle}</h2>
          <p className="lede">{c.revText}</p>
          <div className="cards3">
            {c.revenue.map((a) => (
              <div className="icard" key={a.title}><div className="ic">{a.icon}</div><h4>{a.title}</h4><p>{a.text}</p></div>
            ))}
          </div>
        </section>

        <section className="sec">
          <div className="eyebrow">Growth strategy</div>
          <h2>{c.growthTitle}</h2>
          <div className="phases">
            {c.phases.map((ph) => (
              <div className="phase" key={ph.p}><div className="p">{ph.p}</div><h4>{ph.title}</h4><p className="d">{ph.text}</p></div>
            ))}
          </div>
          <p className="lede" style={{ fontSize: "14.5px" }}>{c.growthNote}</p>
        </section>

        <section className="sec">
          <div className="whyinvest">
            <div className="eyebrow" style={{ color: "rgba(255,255,255,.85)" }}>Why invest</div>
            <h2>{c.whyTitle}</h2>
            <p style={{ color: "rgba(255,255,255,.9)", maxWidth: 680, marginTop: 8 }}>{c.whyText}</p>
            <div className="wi-grid">
              {c.whyItems.map((w) => (
                <div className="wi-item" key={w}><span className="ck">&#10003;</span>{w}</div>
              ))}
            </div>
          </div>
        </section>

        <section className="sec">
          <div className="eyebrow">Our values</div>
          <h2>{c.valuesTitle}</h2>
          <p className="lede">{c.valuesText}</p>
          <div className="values">
            {c.values.map((v) => (
              <div className="value" key={v.title}><div className="ic">{v.icon}</div><h4>{v.title}</h4><p>{v.text}</p></div>
            ))}
          </div>
        </section>

        <section className="sec">
          <div className="eyebrow">Roadmap</div>
          <h2>{c.roadTitle}</h2>
          <div className="timeline">
            {c.roadmap.map((tl) => (
              <div className="tl" key={tl.yr}><div className="yr">{tl.yr}</div><ul>
                {tl.items.map((it) => <li key={it}>{it}</li>)}
              </ul></div>
            ))}
          </div>
        </section>

        <section className="sec">
          <div className="eyebrow">FAQ</div>
          <h2>Investor questions</h2>
          <div className="faq">
            {c.faq.map((f) => (
              <details key={f.q}><summary>{f.q}</summary><p>{f.a}</p></details>
            ))}
          </div>
        </section>

        <section className="sec">
          <div className="final">
            <div className="glow"></div>
            <h2>{c.finalTitle}</h2>
            <p>{c.finalText}</p>
            <div className="cta">
              <DeckButton label="Request the investor deck" />
            </div>
          </div>
          <p className="disc">{c.disclaimer}</p>
        </section>
      </div>

      <DeckModal />
    </div>
  );
}
