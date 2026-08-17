"use client";

/**
 * Property page interactive area, ported 1:1 from the demo's property.html
 * (pd-grid: left detail column + booking aside). The availability calendar
 * and the booking box share the same date state, exactly like the demo —
 * but blocked days come from REAL bookings/blocks, and totals come from
 * the server-side pricing module (never computed in the browser).
 */

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { T, useLang } from "@/lib/i18n";
import { getQuoteAction, type QuoteResult } from "@/app/stays/[slug]/actions";
import { useCurrency } from "@/lib/currency";

export interface PdData {
  slug: string;
  name: string;
  city: string; // "Playa del Carmen, Mexico"
  typeLabel: string; // "Entire condo"
  beds: number;
  baths: number;
  guests: number;
  priceLabel: string; // advertised all-in nightly, whole dollars
  rate: string;
  reviews: number;
  lat: number;
  lng: number;
  minStay: number;
  desc: string;
  amen: string[];
  unavailable: { from: string; to: string }[];
  whatsapp: string;
}

/* demo amenity icon matching (property.html `icons` map, ported verbatim) */
const AMEN_ICONS: [string, string][] = [
  ["Wi", "\u{1F4F6}"], ["pool", "\u{1F3CA}"], ["kitchen", "\u{1F373}"], ["Air", "❄️"],
  ["parking", "\u{1F697}"], ["Washer", "\u{1F9FC}"], ["TV", "\u{1F4FA}"], ["concierge", "\u{1F6E0}️"],
  ["Beach", "\u{1F3D6}️"], ["beach", "\u{1F3D6}️"], ["terrace", "\u{1F334}"], ["garden", "\u{1F331}"],
  ["Rooftop", "\u{1F305}"], ["rooftop", "\u{1F305}"], ["Balcony", "\u{1F305}"], ["chef", "\u{1F468}‍\u{1F373}"],
  ["Games", "\u{1F3AE}"], ["Game", "\u{1F3AE}"], ["Breakfast", "\u{1F373}"], ["transfer", "✈️"],
  ["temples", "\u{1F3DB}️"], ["Elevator", "\u{1F6D7}"], ["deck", "⛱"],
];

const REVIEW_POOL = [
  { n: "Sarah", c: "#E4326B", d: "March 2026", t: "Exactly like the photos and spotless. The concierge answered on WhatsApp within minutes and booked our cenote tour. We’ll be back." },
  { n: "Michael", c: "#2E9E6B", d: "February 2026", t: "Unbeatable location and the all-in pricing meant zero surprises at checkout. Beds were super comfortable." },
  { n: "Lucia", c: "#57B8DF", d: "February 2026", t: "The family that runs TutCasa clearly cares. Little welcome touches, fast replies, and a spotless home." },
  { n: "David", c: "#E8703A", d: "January 2026", t: "Great for our group of six. Kitchen had everything and the pool was perfect after a day exploring." },
];


function localISO(d: Date): string {
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().split("T")[0];
}

export function PdGrid({ p }: { p: PdData }) {
  const router = useRouter();
  const { fromUSD } = useCurrency();
  const { t } = useLang();
  const [ci, setCi] = useState("");
  const [co, setCo] = useState("");
  const [guests, setGuests] = useState(Math.min(2, p.guests));
  const [gMinDisabled, setGMinDisabled] = useState(false);
  // quote is keyed by its date range so stale results never show —
  // no synchronous reset needed when dates change
  const [quoteFor, setQuoteFor] = useState<{ key: string; res: QuoteResult } | null>(null);
  const [, startQuote] = useTransition();
  const ciRef = useRef<HTMLInputElement>(null);
  const today = localISO(new Date());

  const nights = ci && co ? Math.max(0, Math.round((+new Date(co) - +new Date(ci)) / 86400000)) : 0;
  const quoteKey = `${ci}|${co}|${guests}`;
  const quote = quoteFor?.key === quoteKey ? quoteFor.res : null;

  const blocked = (iso: string) => p.unavailable.some((r) => iso >= r.from && iso < r.to);
  const overlaps = (from: string, to: string) => p.unavailable.some((r) => from < r.to && to > r.from);

  useEffect(() => {
    if (!ci || !co || co <= ci || nights < p.minStay) return;
    const key = `${ci}|${co}|${guests}`;
    startQuote(async () => {
      const res = await getQuoteAction(p.slug, ci, co, guests);
      setQuoteFor({ key, res });
    });
  }, [ci, co, nights, p.minStay, p.slug, guests]);

  function pdG(d: number) {
    const next = Math.max(1, Math.min(p.guests, guests + d));
    setGuests(next);
    setGMinDisabled(next <= 1);
  }

  function setDates(nci: string | null, nco: string | null) {
    setCi(nci ?? "");
    setCo(nco && nci && nco <= nci ? "" : nco ?? "");
  }

  function pickDay(iso: string) {
    if (!ci || (ci && co)) setDates(iso, null);
    else if (iso > ci) setDates(ci, iso);
    else setDates(iso, null);
  }

  function pdBook() {
    if (!nights) { ciRef.current?.focus(); return; }
    if (nights < p.minStay) { alert("This home has a minimum stay of " + p.minStay + " nights."); return; }
    if (overlaps(ci, co)) { alert("Some of those nights are already booked — pick different dates."); return; }
    router.push(`/booking?stay=${p.slug}&ci=${ci}&co=${co}&guests=${guests}`);
  }

  function pdWa() {
    let msg = `Hi May! \u{1F44B} I’m interested in ${p.name} (${p.city}).`;
    if (ci && co) msg += ` Dates: ${ci} to ${co}, ${guests} guests.`;
    window.open(`https://wa.me/${p.whatsapp}?text=${encodeURIComponent(msg)}`, "_blank");
  }

  /* booking summary rows — real server total shown in the demo's layout */
  function calcRows() {
    if (!nights) return <div className="row"><span>Add your dates for a total</span></div>;
    const warn = nights < p.minStay
      ? <div className="row" style={{ color: "var(--rosa)" }}>Minimum stay is {p.minStay} nights</div>
      : null;
    if (quote?.ok) {
      const total = quote.quote.totalCents;
      const perNight = Math.round(total / quote.quote.nights / 100);
      return (
        <>
          <div className="row"><span>{fromUSD(perNight)} &times; {quote.quote.nights} nights</span><span>{fromUSD(Math.round(total / 100))}</span></div>
          <div className="row"><span>Taxes &amp; cleaning</span><span>included</span></div>
          {warn}
          <div className="tot"><span>Total (all-in)</span><span>{fromUSD(Math.round(total / 100))}</span></div>
          {quote.quote.schedule.balanceCents > 0 && (
            <div className="row" style={{ color: "var(--cactus)" }}>
              <span>Due today</span>
              <span>{fromUSD(Math.round(quote.quote.schedule.dueNowCents / 100))}</span>
            </div>
          )}
        </>
      );
    }
    return (
      <>
        <div className="row"><span>Calculating your all-in total&hellip;</span></div>
        {warn}
      </>
    );
  }

  /* availability calendar — demo buildCal with real blocked days */
  const months = [0, 1].map((m) => {
    const now = new Date();
    const first = new Date(now.getFullYear(), now.getMonth() + m, 1);
    const startDow = first.getDay();
    const total = new Date(first.getFullYear(), first.getMonth() + 1, 0).getDate();
    const cells = [];
    for (let e = 0; e < startDow; e++) cells.push(<div key={`e${e}`} className="pd-day empty"></div>);
    for (let dd = 1; dd <= total; dd++) {
      const cur = new Date(first.getFullYear(), first.getMonth(), dd);
      const iso = localISO(cur);
      const past = iso < today;
      const off = blocked(iso);
      let cls = "pd-day avail";
      if (past || off) cls = "pd-day off";
      else if (iso === ci || iso === co) cls = "pd-day sel";
      else if (ci && co && iso > ci && iso < co) cls = "pd-day inrange";
      cells.push(
        <div key={iso} className={cls} onClick={past || off ? undefined : () => pickDay(iso)}>
          {dd}
        </div>
      );
    }
    return (
      <div className="pd-month" key={m}>
        <h4>{first.toLocaleDateString("en-US", { month: "long", year: "numeric" })}</h4>
        <div className="pd-dow"><span>S</span><span>M</span><span>T</span><span>W</span><span>T</span><span>F</span><span>S</span></div>
        <div className="pd-days">{cells}</div>
      </div>
    );
  });

  const dLat = 0.010, dLng = 0.014;
  const bbox = `${p.lng - dLng},${p.lat - dLat},${p.lng + dLng},${p.lat + dLat}`;

  return (
    <div className="pd-grid">
      <div className="pd-col">
        <div className="pd-sec">
          <div className="pd-summary">
            <span>{p.typeLabel} &middot; {p.city.split(",")[0]}</span>
            <span className="who">{p.guests} guests &middot; {p.beds} bedrooms &middot; {p.baths} baths</span>
          </div>
          <div className="pd-facts">
            <div className="pd-fact"><span className="fi">&#128716;</span>{p.guests} guests</div>
            <div className="pd-fact"><span className="fi">&#128719;</span>{p.beds} bedrooms</div>
            <div className="pd-fact"><span className="fi">&#128703;</span>{p.baths} bathrooms</div>
            <div className="pd-fact"><span className="fi">&#127968;</span>{p.typeLabel}</div>
          </div>
        </div>
        <div className="pd-sec"><T as="h2" k="pd_about" /><p id="pdDesc">{p.desc}</p></div>
        <div className="pd-sec">
          <T as="h2" k="pd_offers" />
          <div className="pd-amen">
            {p.amen.map((a) => {
              const ic = AMEN_ICONS.find(([k]) => a.indexOf(k) > -1)?.[1] ?? "✓";
              return <div key={a}><span className="ai">{ic}</span> {a}</div>;
            })}
          </div>
        </div>
        <div className="pd-sec">
          <T as="h2" k="pd_know" />
          <div className="pd-know">
            <div><b>Minimum stay</b><br />{p.minStay} nights</div>
            <div><b>Check-in / out</b><br />From 3:00 PM &middot; until 11:00 AM</div>
            <div><b>Guests</b><br />Up to {p.guests}</div>
            <div><b>Pricing</b><br />All-in &mdash; taxes &amp; cleaning included, no hidden fees</div>
          </div>
        </div>
        <div className="pd-sec">
          <T as="h2" k="pd_avail" />
          <div className="pd-cal">{months}</div>
          <T as="div" className="pd-caltip" k="pd_caltip" />
        </div>
        <div className="pd-sec">
          <T as="h2" k="pd_where" />
          <div className="pd-map">
            <iframe
              loading="lazy"
              src={`https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${p.lat},${p.lng}`}
            />
          </div>
          <div className="pd-map-note">Approximate location in {p.city}. Exact address is shared after booking is confirmed.</div>
        </div>
        <div className="pd-sec">
          <h2>{p.reviews > 0 ? <>&#9733; {p.rate} &middot; {p.reviews} <span dangerouslySetInnerHTML={{ __html: t("pd_reviews") }} /></> : "New listing — reviews coming soon"}</h2>
          <div className="pd-rev-head">
            <div className="pd-rev-score">{p.reviews > 0 ? <>&#9733; {p.rate}</> : "New"}</div>
            <div className="pd-rev-bars">
              {([["Cleanliness", 4.9], ["Location", 4.9], ["Check-in", 4.8], ["Value", 4.9]] as const).map(([label, v]) => (
                <div className="pd-bar" key={label}>
                  <span style={{ width: 78 }}>{label}</span>
                  <span className="track"><span className="fill" style={{ width: `${(v / 5) * 100}%` }}></span></span>
                  <span>{v.toFixed(1)}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="pd-reviews">
            {REVIEW_POOL.map((r) => (
              <div className="pd-review" key={r.n}>
                <div className="rv-top">
                  <div className="pd-av" style={{ background: r.c }}>{r.n.charAt(0)}</div>
                  <div><div className="rv-name">{r.n}</div><div className="rv-date">{r.d}</div></div>
                </div>
                <p>{r.t}</p>
              </div>
            ))}
          </div>
        </div>
        <div className="pd-sec">
          <T as="h2" k="pd_things" />
          <div className="pd-rules">
            <div><h4>House rules</h4><li>Check-in after 3:00 PM</li><li>Checkout before 11:00 AM</li><li>{p.guests} guests maximum</li><li>No parties or events</li><li>No smoking indoors</li></div>
            <div><h4>Safety &amp; property</h4><li>Smoke &amp; CO alarms</li><li>Pool without a fence/gate</li><li>Security deposit may apply</li><li>Pets on request only</li></div>
            <div><h4>Cancellation &amp; terms</h4><li>Free cancellation up to 30 days before</li><li>50% refund up to 14 days before</li><li>Minimum stay: {p.minStay} nights</li><li>Rates are all-in (tax &amp; cleaning included)</li></div>
          </div>
        </div>
      </div>
      <aside className="pd-book">
        <div className="pd-price"><b>${p.priceLabel}</b> <T k="pd_pernight" /></div>
        <div className="pd-dates">
          <label><T k="pd_ci" /><input ref={ciRef} type="date" min={today} value={ci} onChange={(e) => setDates(e.target.value || null, co || null)} /></label>
          <label><T k="pd_co" /><input type="date" min={today} value={co} onChange={(e) => setDates(ci || null, e.target.value || null)} /></label>
        </div>
        <div className="pd-guests">
          <T k="pd_guests" />
          <div className="pd-step">
            <button type="button" disabled={gMinDisabled} onClick={() => pdG(-1)}>&minus;</button>
            <span>{guests}</span>
            <button type="button" onClick={() => pdG(1)}>+</button>
          </div>
        </div>
        <div className="pd-calc">{calcRows()}</div>
        <button className="pd-cta" onClick={pdBook}><T k="pd_booknow" /></button>
        <button className="pd-cta2" onClick={pdWa}><T k="pd_ask" /></button>
        <T as="div" className="pd-note" k="pd_nocharge" />
      </aside>
    </div>
  );
}
