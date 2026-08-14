import "@/styles/demo/investors.css";
import type { Metadata } from "next";
import Link from "next/link";
import { BackBar } from "@/components/site/BackBar";
import { DeckButton, DeckModal } from "@/components/pages/InvestorsDeckModal";

export const metadata: Metadata = {
  title: { absolute: "TutCasa — Investors" },
  description:
    "Invest in the future of luxury vacation rentals — TutCasa combines premium homes, concierge-first service and technology across the Riviera Maya and beyond.",
};

const ADVANTAGES: [string, string, string][] = [
  ["\u{1F3E0}", "Curated Collection", "Every property is carefully selected and professionally managed to maintain consistent quality."],
  ["\u{1F6E0}️", "Concierge-First Experience", "Transportation, chefs, excursions, grocery delivery, wellness, celebrations and personalized recommendations — all from a single platform."],
  ["⚡", "Technology-Driven", "Built to streamline booking, property management and guest communication while delivering an exceptional user experience."],
  ["\u{1F91D}", "Trusted Local Partnerships", "Strong relationships with local providers let us deliver authentic experiences while maintaining premium standards."],
  ["\u{1F4C8}", "Scalable Business Model", "A platform built to expand into new destinations while keeping quality and operational excellence consistent."],
];

const REVENUE: [string, string, string][] = [
  ["\u{1F3E0}", "Villa & Condo Bookings", "Commission earned on every reservation."],
  ["\u{1F6E0}️", "Concierge Services", "Premium travel services before and during each stay."],
  ["⛵", "Luxury Experiences", "Private chefs, transportation, yacht charters, wellness and exclusive excursions."],
  ["\u{1F91D}", "Strategic Partnerships", "Preferred relationships with local hospitality and tourism partners."],
  ["\u{1F680}", "Future Platform Expansion", "Additional premium services and technology that increase lifetime customer value."],
];

const VALUES: [string, string, string][] = [
  ["\u{1F396}️", "Excellence", "Delivering exceptional quality at every touchpoint."],
  ["\u{1F91D}", "Integrity", "Building trust with guests, homeowners and partners."],
  ["\u{1F4A1}", "Innovation", "Using technology to simplify luxury travel."],
  ["\u{1F33F}", "Sustainability", "Supporting local communities while promoting responsible tourism."],
];

const FAQ: [string, string][] = [
  ["Are you currently raising capital?", "TutCasa periodically evaluates strategic investment opportunities to support growth initiatives. Interested investors are encouraged to contact our team."],
  ["Who can invest?", "We welcome conversations with qualified angel investors, venture capital firms, family offices, strategic partners and hospitality-focused investors."],
  ["How will investment be used?", "Capital is expected to support platform development, market expansion, strategic hiring, marketing and continued innovation."],
  ["Where is TutCasa focused?", "Our initial focus is the Riviera Maya, with a long-term strategy to expand into additional luxury travel destinations."],
];

export default function InvestorsPage() {
  return (
    <div className="pg-investors">
      <BackBar />

      <section className="inv-hero">
        <div className="glow"></div>
        <div className="wrap">
          <div className="eyebrow">Investors</div>
          <h1>Invest in the future of <span style={{ color: "var(--sol)" }}>luxury vacation rentals.</span></h1>
          <p>Building the next generation of luxury villa and condo bookings through technology, exceptional guest experiences and premium hospitality. Join us as we redefine how travelers discover, book and experience luxury accommodations.</p>
          <div className="cta">
            <DeckButton label="Request investor deck" />
            <Link className="btn btn-ghost" href="/contact">Contact us</Link>
          </div>
          <div className="inv-metrics">
            <div><b>40+</b><span>homes in the curated collection</span></div>
            <div><b>200+</b><span>guests welcomed</span></div>
            <div><b>Riviera Maya</b><span>launch market, expanding</span></div>
          </div>
        </div>
      </section>

      <div className="wrap">
        <section className="sec">
          <div className="eyebrow">Our vision</div>
          <h2>A new standard for luxury travel</h2>
          <p className="lede">TutCasa was created with a simple belief: luxury travelers deserve more than a place to stay. They deserve an effortless experience from the moment they begin planning until they return home. By combining premium vacation rentals with personalized concierge services, curated experiences and innovative technology, we&rsquo;re building a platform designed for the future of luxury hospitality.</p>
        </section>

        <section className="sec">
          <div className="eyebrow">The opportunity</div>
          <h2>A fragmented market ready for innovation</h2>
          <div className="gap">
            <p className="lede" style={{ marginTop: 0 }}>The luxury vacation rental market continues to expand, yet many guests still face inconsistent quality and limited service. TutCasa bridges this gap with a curated marketplace where every property meets high standards and every guest receives exceptional service. Rather than competing solely on inventory, we compete on <b>trust, quality and experience.</b></p>
            <div className="painbox">
              <h4>What guests still struggle with</h4>
              <ul>
                <li>Inconsistent quality</li><li>Limited personalized service</li><li>Complex booking experiences</li><li>Little support before or during their stay</li>
              </ul>
            </div>
          </div>
        </section>

        <section className="sec">
          <div className="eyebrow">Why TutCasa</div>
          <h2>Our competitive advantages</h2>
          <div className="cards3">
            {ADVANTAGES.map(([ic, h, p]) => (
              <div className="icard" key={h}><div className="ic">{ic}</div><h4>{h}</h4><p>{p}</p></div>
            ))}
          </div>
        </section>

        <section className="sec">
          <div className="eyebrow">Market potential</div>
          <h2>Why now?</h2>
          <p className="lede">Luxury travelers increasingly seek these things &mdash; and as the trends grow, TutCasa is positioned to become a trusted destination for discerning travelers seeking both luxury and convenience.</p>
          <div className="trend"><span>Private accommodations</span><span>Personalized experiences</span><span>Flexible travel</span><span>Premium concierge services</span><span>Digital-first booking</span></div>
        </section>

        <section className="sec">
          <div className="eyebrow">Business model</div>
          <h2>Multiple revenue streams</h2>
          <p className="lede">TutCasa generates revenue through a diversified business model.</p>
          <div className="cards3">
            {REVENUE.map(([ic, h, p]) => (
              <div className="icard" key={h}><div className="ic">{ic}</div><h4>{h}</h4><p>{p}</p></div>
            ))}
          </div>
        </section>

        <section className="sec">
          <div className="eyebrow">Growth strategy</div>
          <h2>Scaling with purpose &mdash; quality before quantity</h2>
          <div className="phases">
            <div className="phase"><div className="p">Phase One</div><h4>Riviera Maya</h4><p className="d">Establish a strong presence in the Riviera Maya.</p></div>
            <div className="phase"><div className="p">Phase Two</div><h4>Mexico</h4><p className="d">Expand across Mexico&rsquo;s premier luxury destinations.</p></div>
            <div className="phase"><div className="p">Phase Three</div><h4>International</h4><p className="d">Enter additional international markets through strategic partnerships.</p></div>
          </div>
          <p className="lede" style={{ fontSize: "14.5px" }}>Every expansion is supported by technology, operational standards and a curated hospitality network.</p>
        </section>

        <section className="sec">
          <div className="whyinvest">
            <div className="eyebrow" style={{ color: "rgba(255,255,255,.85)" }}>Why invest</div>
            <h2>The investment opportunity</h2>
            <p style={{ color: "rgba(255,255,255,.9)", maxWidth: 680, marginTop: 8 }}>Investors partnering with TutCasa gain exposure to a company focused on long-term value creation through:</p>
            <div className="wi-grid">
              {["High-growth luxury travel market", "Asset-light marketplace model", "Diversified revenue streams", "Scalable technology platform", "Strong focus on customer experience", "Strategic local partnerships", "Significant expansion potential"].map((w) => (
                <div className="wi-item" key={w}><span className="ck">&#10003;</span>{w}</div>
              ))}
            </div>
          </div>
        </section>

        <section className="sec">
          <div className="eyebrow">Our values</div>
          <h2>Hospitality with purpose</h2>
          <p className="lede">Everything we build is guided by four principles.</p>
          <div className="values">
            {VALUES.map(([ic, h, p]) => (
              <div className="value" key={h}><div className="ic">{ic}</div><h4>{h}</h4><p>{p}</p></div>
            ))}
          </div>
        </section>

        <section className="sec">
          <div className="eyebrow">Roadmap</div>
          <h2>Our journey</h2>
          <div className="timeline">
            <div className="tl"><div className="yr">2026</div><ul><li>Platform launch</li><li>Initial luxury villa and condo portfolio</li><li>Concierge services</li><li>Technology foundation</li></ul></div>
            <div className="tl"><div className="yr">2027</div><ul><li>Expanded inventory</li><li>Guest mobile experience</li><li>Strategic hospitality partnerships</li><li>Operational automation</li></ul></div>
            <div className="tl"><div className="yr">2028+</div><ul><li>International destinations</li><li>AI-powered guest experience</li><li>Enterprise partnerships</li><li>Global brand expansion</li></ul></div>
          </div>
        </section>

        <section className="sec">
          <div className="eyebrow">FAQ</div>
          <h2>Investor questions</h2>
          <div className="faq">
            {FAQ.map(([q, a]) => (
              <details key={q}><summary>{q}</summary><p>{a}</p></details>
            ))}
          </div>
        </section>

        <section className="sec">
          <div className="final">
            <div className="glow"></div>
            <h2>Let&rsquo;s build the future of luxury hospitality together.</h2>
            <p>We&rsquo;re looking for partners who share our vision of transforming the luxury vacation experience through technology, hospitality and exceptional service.</p>
            <div className="cta">
              <DeckButton label="Request the investor deck" />
            </div>
          </div>
          <p className="disc">This page is provided for general informational purposes only and does not constitute an offer to sell, or the solicitation of an offer to buy, any security, nor investment, legal or tax advice. Any figures shown are operational metrics, not financial performance or projections. Detailed materials are shared only with qualified investors, subject to confidentiality where applicable.</p>
        </section>
      </div>

      <DeckModal />
    </div>
  );
}
