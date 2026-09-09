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
import { RichText } from "@/components/site/RichText";

export interface PdData {
  slug: string;
  name: string;
  city: string; // "Playa del Carmen, Mexico"
  region: string; // neighborhood, e.g. "Mareazul" ("" = none)
  typeLabel: string; // "Entire condo"
  beds: number;
  baths: number;
  guests: number;
  priceLabel: string; // advertised all-in nightly, whole dollars (USD text)
  allInNightly: number; // same value as a number, for currency conversion
  priceVaries: boolean; // upcoming periods priced differently → "from $X"
  nightlyPretax: number; // whole dollars, before taxes (static breakdown)
  cleaningFee: number; // whole dollars per stay
  taxPct: number;
  rate: string;
  reviews: number;
  lat: number;
  lng: number;
  mapQ: string; // map query: address → coords → city
  minStay: number;
  desc: string;
  amen: string[];
  bedTypes: { count: number; type: string }[];
  checkinFrom: string; // "15:00"
  checkoutUntil: string;
  houseRules: string;
  cancellationPolicy: string;
  otherRules: string;
  faqs: { q: string; a: string }[];
  allowChildren: boolean;
  allowSmoking: boolean;
  allowParty: boolean;
  allowPets: boolean;
  unavailable: { from: string; to: string }[];
  /** active extra options guests can add to the booking */
  addons: { id: string; name: string; priceCents: number; mode: string }[];
  whatsapp: string;
  /** dates carried over from the stays search — prefill the booking box */
  initialCi?: string;
  initialCo?: string;
}

/** "15:00" → "3:00 PM" */
function ampm(t: string): string {
  const [h, m] = t.split(":").map(Number);
  if (Number.isNaN(h)) return t;
  const hr = ((h + 11) % 12) + 1;
  return `${hr}:${String(m ?? 0).padStart(2, "0")} ${h >= 12 ? "PM" : "AM"}`;
}

const textLines = (s: string) =>
  s.split("\n").map((l) => l.replace(/^[-•#\s]+/, "").trim()).filter(Boolean);

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
  { n: "Sarah", c: "#E4326B", d: "March 2026", t: "Exactly like the photos and spotless. The team answered on WhatsApp within minutes and booked our cenote tour. We’ll be back." },
  { n: "Michael", c: "#2E9E6B", d: "February 2026", t: "Unbeatable location and the all-in pricing meant zero surprises at checkout. Beds were super comfortable." },
  { n: "Lucia", c: "#57B8DF", d: "February 2026", t: "The family that runs TutCasa clearly cares. Little welcome touches, fast replies, and a spotless home." },
  { n: "David", c: "#E8703A", d: "January 2026", t: "Great for our group of six. Kitchen had everything and the pool was perfect after a day exploring." },
];


function localISO(d: Date): string {
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().split("T")[0];
}

function addDaysISO(iso: string, n: number): string {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

export function PdGrid({ p }: { p: PdData }) {
  const router = useRouter();
  const { fromUSD } = useCurrency();
  const { t } = useLang();
  const [ci, setCi] = useState(p.initialCi ?? "");
  const [co, setCo] = useState(p.initialCo && p.initialCi && p.initialCo > p.initialCi ? p.initialCo : "");
  // true while check-out is only our min-stay suggestion, not the guest's pick
  const [coAuto, setCoAuto] = useState(false);
  const [guests, setGuests] = useState(Math.min(2, p.guests));
  const [gMinDisabled, setGMinDisabled] = useState(false);
  // quote is keyed by its date range so stale results never show —
  // no synchronous reset needed when dates change
  const [quoteFor, setQuoteFor] = useState<{ key: string; res: QuoteResult } | null>(null);
  const [, startQuote] = useTransition();
  // property-local (UTC-5) "now", identical on server and client — using
  // the viewer's clock caused React hydration mismatches across timezones
  // (lazy state: computed once per mount, keeps the render pure)
  const [cancunNow] = useState(() => new Date(Date.now() - 5 * 3600 * 1000));
  const today = cancunNow.toISOString().slice(0, 10);
  // which pair of months the availability calendar shows (0 = current +
  // next). Guests can page forward to see availability further out; can't
  // page before the current month. Capped so it can't run away.
  const [monthOffset, setMonthOffset] = useState(0);
  const MAX_MONTH_OFFSET = 22;
  /* booking-box datepicker popover (shows blocked dates, unlike native
     inputs) + selected extra options */
  const [calOpen, setCalOpen] = useState<"" | "ci" | "co">("");
  const [popOffset, setPopOffset] = useState(0);
  const [selAddons, setSelAddons] = useState<string[]>([]);

  const nights = ci && co ? Math.max(0, Math.round((+new Date(co) - +new Date(ci)) / 86400000)) : 0;
  const quoteKey = `${ci}|${co}|${guests}|${selAddons.join(",")}`;
  const quote = quoteFor?.key === quoteKey ? quoteFor.res : null;

  const blocked = (iso: string) => p.unavailable.some((r) => iso >= r.from && iso < r.to);
  const overlaps = (from: string, to: string) => p.unavailable.some((r) => from < r.to && to > r.from);

  const latestKeyRef = useRef("");
  const addonsKey = selAddons.join(",");
  useEffect(() => {
    if (!ci || !co || co <= ci || nights < p.minStay) return;
    const key = `${ci}|${co}|${guests}|${addonsKey}`;
    latestKeyRef.current = key;
    startQuote(async () => {
      const res = await getQuoteAction(p.slug, ci, co, guests, addonsKey ? addonsKey.split(",") : undefined);
      // a slower, older request must never overwrite a newer result
      if (latestKeyRef.current === key) setQuoteFor({ key, res });
    });
  }, [ci, co, nights, p.minStay, p.slug, guests, addonsKey]);

  /* group-size-conditional options only show when they apply — the
     booking's own guest count decides */
  const addonApplies = (mode: string, g: number) =>
    mode === "for_4" ? g <= 4 : mode === "over_4" ? g > 4 : true;
  const visibleAddons = p.addons.filter((a) => addonApplies(a.mode, guests));

  function pdG(d: number) {
    const next = Math.max(1, Math.min(p.guests, guests + d));
    setGuests(next);
    setGMinDisabled(next <= 1);
    // drop selected options that no longer apply to the new group size
    setSelAddons((s) => s.filter((id) => {
      const a = p.addons.find((x) => x.id === id);
      return a ? addonApplies(a.mode, next) : false;
    }));
  }

  function setDates(nci: string | null, nco: string | null) {
    setCi(nci ?? "");
    let next = nco && nci && nco <= nci ? "" : nco ?? "";
    // picking a check-in with no (valid) check-out pre-fills the minimum
    // stay, so the check-out calendar opens on the right month instead of
    // today's — the guest just adjusts the end date
    const auto = !!nci && !next;
    if (auto) next = addDaysISO(nci!, Math.max(1, p.minStay));
    setCoAuto(auto);
    setCo(next);
  }

  function pickDay(iso: string) {
    if (!ci || (ci && co && !coAuto)) setDates(iso, null);
    else if (iso > ci) setDates(ci, iso);
    else setDates(iso, null);
  }

  function pdBook() {
    if (!nights) { setCalOpen("ci"); return; }
    if (nights < p.minStay) { alert("This home has a minimum stay of " + p.minStay + " nights."); return; }
    if (overlaps(ci, co)) { alert("Some of those nights are already booked — pick different dates."); return; }
    const extra = selAddons.length ? `&addons=${selAddons.join(",")}` : "";
    router.push(`/booking?stay=${p.slug}&ci=${ci}&co=${co}&guests=${guests}${extra}`);
  }

  function pdWa() {
    let msg = `Hi TutCasa! \u{1F44B} I’m interested in ${p.name} (${p.city}).`;
    if (ci && co) msg += ` Dates: ${ci} to ${co}, ${guests} guests.`;
    window.open(`https://wa.me/${p.whatsapp}?text=${encodeURIComponent(msg)}`, "_blank");
  }

  /* booking summary rows — real server total shown in the demo's layout */
  function calcRows() {
    if (!nights) {
      // no dates yet → static nightly composition so the guest always
      // sees how the advertised price is built
      return (
        <>
          <div className="row"><span>Nightly price (before taxes)</span><span>{fromUSD(p.nightlyPretax)}</span></div>
          {p.taxPct > 0 && <div className="row"><span>Taxes</span><span>{p.taxPct}%</span></div>}
          <div className="row"><span>Nightly incl. taxes</span><span>{fromUSD(p.allInNightly)}</span></div>
          {p.cleaningFee > 0 && <div className="row"><span>Cleaning fee (once per stay)</span><span>{fromUSD(p.cleaningFee)}</span></div>}
          <div className="row"><span>Add your dates for your exact total</span></div>
        </>
      );
    }
    const warn = nights < p.minStay
      ? <div className="row" style={{ color: "var(--rosa)" }}>Minimum stay is {p.minStay} nights</div>
      : null;
    if (overlaps(ci, co)) {
      return (
        <>
          <div className="row" style={{ color: "var(--rosa)", fontWeight: 700 }}>
            <span>Some of those nights are blocked or already booked &mdash; pick different dates.</span>
          </div>
          {warn}
        </>
      );
    }
    if (quote?.ok) {
      const q = quote.quote;
      const total = q.totalCents;
      const d = (c: number) => fromUSD(Math.round(c / 100));
      const netAccom = q.accommodationCents - q.lengthDiscountCents - q.earlyBirdDiscountCents;
      // weekend uplifts and seasonal rates are folded into one nightly
      // line — guests see custom nightly rates, never the % mechanics
      const avgNight = Math.round(q.accommodationCents / q.nights);
      const customRates = q.weekendUpliftCents > 0 || avgNight * q.nights !== q.accommodationCents || q.nightlyCents * q.nights !== q.accommodationCents;
      return (
        <>
          <div className="row"><span>{customRates ? "avg " : ""}{d(avgNight)} &times; {q.nights} nights{customRates ? " (custom nightly rates)" : ""}</span><span>{d(q.accommodationCents)}</span></div>
          {q.lengthDiscountCents > 0 && <div className="row" style={{ color: "var(--cactus)" }}><span>Stay discount</span><span>&minus;{d(q.lengthDiscountCents)}</span></div>}
          {q.earlyBirdDiscountCents > 0 && <div className="row" style={{ color: "var(--cactus)" }}><span>Early-bird discount</span><span>&minus;{d(q.earlyBirdDiscountCents)}</span></div>}
          {q.extraGuestFeeCents > 0 && <div className="row"><span>Extra guests</span><span>{d(q.extraGuestFeeCents)}</span></div>}
          {q.cleaningCents > 0 && <div className="row"><span>Cleaning fee</span><span>{d(q.cleaningCents)}</span></div>}
          {q.cityFeeCents > 0 && <div className="row"><span>City fee</span><span>{d(q.cityFeeCents)}</span></div>}
          {q.addonLines.map((a) => (
            <div className="row" key={a.name}><span>{a.name}</span><span>{a.totalCents > 0 ? d(a.totalCents) : "Free"}</span></div>
          ))}
          <div className="row"><span>Taxes</span><span>{d(total - netAccom - q.extraGuestFeeCents - q.cleaningCents - q.cityFeeCents - q.addonsCents)}</span></div>
          {q.securityDepositCents > 0 && (
            <div className="row"><span>Security deposit</span><span>{d(q.securityDepositCents)}</span></div>
          )}
          {warn}
          <div className="tot"><span>Total (all-in)</span><span>{fromUSD(Math.round((total + q.securityDepositCents) / 100))}</span></div>
          {quote.quote.schedule.balanceCents > 0 && (
            <div className="row" style={{ color: "var(--cactus)" }}>
              {/* the deposit splits 50/50 with the balance, like the stay */}
              <span>Due today</span>
              <span>{fromUSD(Math.round((quote.quote.schedule.dueNowCents + Math.round(q.securityDepositCents / 2)) / 100))}</span>
            </div>
          )}
        </>
      );
    }
    if (quote && !quote.ok) {
      const msg =
        quote.error === "DATES_TAKEN"
          ? "Some of those nights are already booked — pick different dates."
          : quote.error === "MIN_STAY_NOT_MET"
            ? `Minimum stay is ${p.minStay} nights.`
            : "We couldn't price those dates — try different ones.";
      return (
        <>
          <div className="row" style={{ color: "var(--rosa)", fontWeight: 700 }}><span>{msg}</span></div>
          {warn}
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

  /* availability calendar — demo buildCal with real blocked days. Shared
     by the main "Availability" section AND the booking-box popover, so
     blocked dates are visibly grayed and unclickable in both. */
  function renderMonth(offset: number, key: number, onPick: (iso: string) => void) {
    const first = new Date(cancunNow.getUTCFullYear(), cancunNow.getUTCMonth() + offset, 1);
    const startDow = first.getDay();
    const total = new Date(first.getFullYear(), first.getMonth() + 1, 0).getDate();
    const cells = [];
    for (let e = 0; e < startDow; e++) cells.push(<div key={`e${e}`} className="pd-day empty"></div>);
    for (let dd = 1; dd <= total; dd++) {
      const cur = new Date(first.getFullYear(), first.getMonth(), dd);
      const iso = localISO(cur);
      const past = iso < today;
      const off = blocked(iso);
      // a booked night's FIRST day is still a legal checkout morning —
      // the guest leaves before the next stay begins
      const checkoutOk = !past && off && !!ci && (!co || coAuto) && iso > ci && !overlaps(ci, iso);
      let cls = "pd-day avail";
      if (past || off) cls = "pd-day off";
      else if (iso === ci || iso === co) cls = "pd-day sel";
      else if (ci && co && iso > ci && iso < co) cls = "pd-day inrange";
      if (iso === co && off) cls = "pd-day sel";
      cells.push(
        <div key={iso} className={cls}
          onClick={past || (off && !checkoutOk) ? undefined : () => onPick(iso)}
          style={checkoutOk ? { cursor: "pointer" } : undefined}>
          {dd}
        </div>
      );
    }
    return (
      <div className="pd-month" key={key}>
        <h4>{first.toLocaleDateString("en-US", { month: "long", year: "numeric" })}</h4>
        <div className="pd-dow"><span>S</span><span>M</span><span>T</span><span>W</span><span>T</span><span>F</span><span>S</span></div>
        <div className="pd-days">{cells}</div>
      </div>
    );
  }
  const months = [0, 1].map((m) => renderMonth(monthOffset + m, m, pickDay));

  /* popover pick: same range logic; picking an end date closes the popover */
  function pickDayPop(iso: string) {
    const finishing = !!ci && (!co || coAuto) && iso > ci && calOpen !== "ci";
    pickDay(iso);
    if (finishing) setCalOpen("");
    else setCalOpen("co");
  }

  const fmtDay = (iso: string) =>
    iso ? new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-US", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" }) : "Add date";

  return (
    <div className="pd-grid">
      <div className="pd-col">
        <div className="pd-sec">
          <div className="pd-summary">
            <span>{p.typeLabel} &middot; {p.city.split(",")[0]}{p.region ? <> &middot; {p.region}</> : null}</span>
            <span className="who">{p.guests} guests &middot; {p.beds} bedrooms &middot; {p.baths} baths</span>
          </div>
          <div className="pd-facts">
            <div className="pd-fact"><span className="fi">&#128716;</span>{p.guests} guests</div>
            <div className="pd-fact"><span className="fi">&#128719;</span>{p.beds} bedrooms</div>
            <div className="pd-fact"><span className="fi">&#128703;</span>{p.baths} bathrooms</div>
            <div className="pd-fact"><span className="fi">&#127968;</span>{p.typeLabel}</div>
            {p.bedTypes.length > 0 && (
              <div className="pd-fact"><span className="fi">&#128717;</span>
                {p.bedTypes.map((b) => `${b.count} × ${b.type}`).join(" · ")}
              </div>
            )}
          </div>
        </div>
        <div className="pd-sec"><T as="h2" k="pd_about" /><div id="pdDesc"><RichText text={p.desc} /></div></div>
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
            <div><b>Check-in / out</b><br />From {ampm(p.checkinFrom)} &middot; until {ampm(p.checkoutUntil)}</div>
            <div><b>Guests</b><br />Up to {p.guests}</div>
            {p.bedTypes.length > 0 && (
              <div><b>Beds</b><br />{p.bedTypes.map((b) => `${b.count} × ${b.type}`).join(", ")}</div>
            )}
            <div><b>Pricing</b><br />All-in &mdash; taxes &amp; cleaning included, no hidden fees</div>
          </div>
        </div>
        <div className="pd-sec">
          <T as="h2" k="pd_avail" />
          <div className="pd-calnav" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, marginBottom: 8 }}>
            <button
              type="button"
              className="pd-calnav-btn"
              onClick={() => setMonthOffset((o) => Math.max(0, o - 1))}
              disabled={monthOffset === 0}
              aria-label="Earlier months"
              style={{ border: "1.5px solid var(--line, #E9DED6)", background: "#fff", borderRadius: 999, width: 36, height: 36, cursor: monthOffset === 0 ? "default" : "pointer", opacity: monthOffset === 0 ? 0.4 : 1, fontSize: 18, lineHeight: 1 }}
            >&#8249;</button>
            <span style={{ fontSize: 13, color: "var(--grey, #8A7A72)", fontWeight: 600 }}>
              {monthOffset === 0 ? "Next available months" : "Browsing ahead"}
            </span>
            <button
              type="button"
              className="pd-calnav-btn"
              onClick={() => setMonthOffset((o) => Math.min(MAX_MONTH_OFFSET, o + 1))}
              disabled={monthOffset >= MAX_MONTH_OFFSET}
              aria-label="Later months"
              style={{ border: "1.5px solid var(--line, #E9DED6)", background: "#fff", borderRadius: 999, width: 36, height: 36, cursor: monthOffset >= MAX_MONTH_OFFSET ? "default" : "pointer", opacity: monthOffset >= MAX_MONTH_OFFSET ? 0.4 : 1, fontSize: 18, lineHeight: 1 }}
            >&#8250;</button>
          </div>
          <div className="pd-cal">{months}</div>
          <T as="div" className="pd-caltip" k="pd_caltip" />
        </div>
        <div className="pd-sec">
          <T as="h2" k="pd_where" />
          <div className="pd-map">
            <iframe
              loading="lazy"
              src={`https://maps.google.com/maps?q=${encodeURIComponent(p.mapQ)}&z=15&output=embed`}
              title={`Map — ${p.name}`}
            />
          </div>
          <div className="pd-map-note">Approximate location in {p.city}. Exact address is shared after booking is confirmed.</div>
        </div>
        <div className="pd-sec">
          {p.reviews > 0 && <h2>&#9733; {p.rate} &middot; {p.reviews} <span dangerouslySetInnerHTML={{ __html: t("pd_reviews") }} /></h2>}
          <div className="pd-rev-head">
            <div className="pd-rev-score">{p.reviews > 0 ? <>&#9733; {p.rate}</> : ""}</div>
            <div className="pd-rev-bars">
              {(() => {
                // sub-scores follow the home's real rating once one exists
                const r = parseFloat(p.rate) || 0;
                const rows: [string, number][] = r > 0
                  ? [["Cleanliness", r], ["Location", r], ["Check-in", Math.max(0, r - 0.1)], ["Value", r]]
                  : [["Cleanliness", 4.9], ["Location", 4.9], ["Check-in", 4.8], ["Value", 4.9]];
                return rows.map(([label, v]) => (
                  <div className="pd-bar" key={label}>
                    <span style={{ width: 78 }}>{label}</span>
                    <span className="track">
                      <span className="fill" style={{ width: `${(v / 5) * 100}%` }}></span>
                    </span>
                    <span>{v.toFixed(1)}</span>
                  </div>
                ));
              })()}
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
          {/* real admin-entered rules & policies (custom text lines are
              appended after the standard lines) */}
          {/* check-in/out, guests max, min-stay and all-in pricing live in
              "Good to know" above — never repeated down here */}
          <div className="pd-rules">
            <div><h4>Reservation policy</h4>
              {textLines(p.houseRules).length > 0 ? (
                textLines(p.houseRules).map((l, i) => <li key={`hr${i}`}>{l}</li>)
              ) : (
                <li>Every booking is confirmed personally by our team</li>
              )}
            </div>
            <div><h4>Cancellation &amp; terms</h4>
              {p.cancellationPolicy.trim() ? (
                textLines(p.cancellationPolicy).map((l, i) => <li key={`cp${i}`}>{l}</li>)
              ) : (
                <>
                  <li>Free cancellation up to 30 days before</li>
                  <li>50% refund up to 14 days before</li>
                </>
              )}
            </div>
            <div><h4>Safety &amp; house rules</h4>
              <li>Smoke &amp; CO alarms</li>
              <li>{p.allowParty ? "Events on request" : "No parties or events"}</li>
              <li>{p.allowSmoking ? "Smoking allowed" : "No smoking indoors"}</li>
              {!p.allowChildren && <li>Adults only</li>}
              {p.allowPets && <li>Pets allowed</li>}
              {textLines(p.otherRules).map((l, i) => <li key={`or${i}`}>{l}</li>)}
            </div>
          </div>
        </div>
        {p.faqs.length > 0 && (
          <div className="pd-sec">
            <h2>Frequently asked questions</h2>
            <div className="pd-faqs">
              {p.faqs.map((f, i) => (
                <details key={i} className="pd-faq">
                  <summary>{f.q}</summary>
                  <p>{f.a}</p>
                </details>
              ))}
            </div>
          </div>
        )}
      </div>
      <aside className="pd-book">
        <div className="pd-price">
          {p.priceVaries && <span style={{ fontSize: 14, fontWeight: 600 }}>from </span>}
          <b>${p.priceLabel}</b> <T k="pd_pernight" />
        </div>
        <div style={{ fontSize: 12.5, color: "var(--grey)", margin: "-4px 0 10px" }}>
          All-in price &mdash; taxes &amp; cleaning included.
          {p.priceVaries ? " Rates vary by date — pick your dates for the exact total." : " Pick your dates below for the full breakdown."}
        </div>
        <div style={{ position: "relative" }}>
          <div className="pd-dates">
            <label onClick={() => { setCalOpen(calOpen === "ci" ? "" : "ci"); setPopOffset(0); }} style={{ cursor: "pointer" }}>
              <T k="pd_ci" />
              <div style={{ fontSize: 14, fontWeight: ci ? 700 : 400, color: ci ? "var(--ink)" : "var(--grey)", padding: "3px 0" }}>{fmtDay(ci)}</div>
            </label>
            <label onClick={() => { setCalOpen(calOpen === "co" ? "" : "co"); setPopOffset(0); }} style={{ cursor: "pointer" }}>
              <T k="pd_co" />
              <div style={{ fontSize: 14, fontWeight: co && !coAuto ? 700 : 400, color: co ? "var(--ink)" : "var(--grey)", padding: "3px 0" }}>{fmtDay(co)}</div>
            </label>
          </div>
          {calOpen && (
            <div style={{ position: "absolute", zIndex: 40, top: "100%", left: 0, right: 0, marginTop: 6, background: "var(--paper, #FFFDF9)", border: "1.5px solid var(--line, #F0E2D2)", borderRadius: 16, boxShadow: "0 18px 44px rgba(58,44,40,.16)", padding: "12px 14px" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
                <button type="button" aria-label="Earlier month" disabled={popOffset === 0}
                  onClick={() => setPopOffset((o) => Math.max(0, o - 1))}
                  style={{ border: "1.5px solid var(--line)", background: "#fff", borderRadius: 999, width: 30, height: 30, cursor: popOffset === 0 ? "default" : "pointer", opacity: popOffset === 0 ? 0.4 : 1 }}>&#8249;</button>
                <span style={{ fontSize: 12, fontWeight: 700, color: "var(--grey)" }}>
                  {calOpen === "ci" ? "Pick your check-in" : "Pick your check-out"} &middot; crossed-out days are booked
                </span>
                <button type="button" aria-label="Later month"
                  onClick={() => setPopOffset((o) => Math.min(MAX_MONTH_OFFSET, o + 1))}
                  style={{ border: "1.5px solid var(--line)", background: "#fff", borderRadius: 999, width: 30, height: 30, cursor: "pointer" }}>&#8250;</button>
              </div>
              <div className="pd-cal" style={{ gridTemplateColumns: "1fr" }}>
                {renderMonth(popOffset, 0, pickDayPop)}
              </div>
              <button type="button" onClick={() => setCalOpen("")}
                style={{ width: "100%", marginTop: 6, border: "none", background: "none", fontSize: 12.5, fontWeight: 700, color: "var(--grey)", cursor: "pointer", padding: 6 }}>
                Close
              </button>
            </div>
          )}
        </div>
        <div className="pd-guests">
          <T k="pd_guests" />
          <div className="pd-step">
            <button type="button" disabled={gMinDisabled} onClick={() => pdG(-1)}>&minus;</button>
            <span>{guests}</span>
            <button type="button" onClick={() => pdG(1)}>+</button>
          </div>
        </div>
        {visibleAddons.length > 0 && (
          <div style={{ margin: "10px 0 4px" }}>
            <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: ".04em", textTransform: "uppercase", color: "var(--grey)", marginBottom: 4 }}>Extra options</div>
            {visibleAddons.map((a) => (
              <label key={a.id} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13.5, padding: "4px 0", cursor: "pointer" }}>
                <input
                  type="checkbox"
                  checked={selAddons.includes(a.id)}
                  onChange={() => setSelAddons((s) => s.includes(a.id) ? s.filter((x) => x !== a.id) : [...s, a.id])}
                  style={{ width: 16, height: 16, accentColor: "var(--rosa, #E4326B)" }}
                />
                <span style={{ flex: 1 }}>{a.name}</span>
                <b style={{ color: a.priceCents > 0 ? "var(--ink)" : "var(--cactus)" }}>
                  {a.priceCents > 0
                    ? `${fromUSD(Math.round(a.priceCents / 100))}${a.mode === "per_night" ? "/night" : a.mode === "per_guest" ? "/guest" : a.mode === "per_guest_night" ? "/guest/night" : ""}`
                    : "Free"}
                </b>
              </label>
            ))}
          </div>
        )}
        <div className="pd-calc">{calcRows()}</div>
        <button className="pd-cta" onClick={pdBook}><T k="pd_booknow" /></button>
        <button className="pd-cta2" onClick={pdWa}><T k="pd_ask" /></button>
        <T as="div" className="pd-note" k="pd_nocharge" />
      </aside>
    </div>
  );
}
