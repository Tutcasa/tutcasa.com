"use client";

/**
 * Tours & Parks page body ported 1:1 from the demo's Tours.html:
 * destination combo, Tours|Parks tabs, tour cards with itinerary
 * accordion + per-card add-on catalog + live MXN/USD totals, the
 * on-request modal (WhatsApp/email handoff), toast, and the
 * Build-Your-Own-Plan modal. Booking navigates to the tour checkout,
 * which re-prices everything server-side.
 */

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { T, useLang } from "@/lib/i18n";
import { useCurrency } from "@/lib/currency";

export interface TourCardData {
  slug: string;
  name: string;
  sub: string;
  dur: string;
  desc: string;
  priceMXN: number | null; // per-person fallback; null = on request
  /** Amanah tier model: TOTAL MXN per group size (price authority) */
  groupPrices?: Record<string, number> | null;
  /** Amanah tour photo (absolute URL); gradient placeholder when absent */
  img?: string | null;
  park: boolean;
  city: string; // town filter, default "Playa del Carmen"
  g: string;
  stops: [string, string, string][];
}

/** mirror of the server's tierTotalMXN — clamp to the nearest offered tier */
function tierTotal(gp: Record<string, number> | null | undefined, pax: number): number | null {
  if (!gp) return null;
  const keys = Object.keys(gp).map(Number).filter((k) => k > 0).sort((a, b) => a - b);
  if (!keys.length) return null;
  const at = [...keys].reverse().find((k) => k <= pax) ?? keys[0];
  return gp[String(at)] ?? null;
}
function tierMinPax(gp: Record<string, number> | null | undefined): number {
  if (!gp) return 1;
  const keys = Object.keys(gp).map(Number).filter((k) => k > 0);
  return keys.length ? Math.min(...keys) : 1;
}
function tierMaxPax(gp: Record<string, number> | null | undefined): number {
  if (!gp) return 6;
  const keys = Object.keys(gp).map(Number).filter((k) => k > 0);
  return keys.length ? Math.max(...keys) : 6;
}

export interface AddonData {
  name: string;
  icon: string;
  priceMXN: number | null;
  unit?: string;
}

const USD_RATE = 17;
const TT_TOWNS = ["Playa del Carmen", "Tulum", "Cancún", "Cozumel", "Akumal", "Puerto Morelos", "Puerto Aventuras", "Bacalar", "Holbox", "Isla Mujeres", "Valladolid", "Cobá", "Chichén Itzá", "Mérida", "Mahahual", "Nuba", "Hurghada", "Cairo", "Orlando", "Miami"];

const WA_SVG = (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="white"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51l-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/></svg>
);

const fmtN = (m: number) => m.toLocaleString("en-US");
const fmtUSD = (m: number) => `≈ ${Math.round(m / USD_RATE).toLocaleString("en-US")} USD`;

function localTomorrowISO(): string {
  const t = new Date();
  return new Date(t.getTime() + 86400000 - t.getTimezoneOffset() * 60000).toISOString().split("T")[0];
}

function TourCard({
  t, addons, minDate, onToast, onRequest,
}: {
  t: TourCardData;
  addons: AddonData[];
  minDate: string;
  onToast: (m: string) => void;
  onRequest: (t: TourCardData) => void;
}) {
  const router = useRouter();
  const { t: tr } = useLang();
  const { cur, fromMXN } = useCurrency();
  const [date, setDate] = useState("");
  const [n, setN] = useState(1);
  const [sel, setSel] = useState<string[]>([]);
  const [actsOpen, setActsOpen] = useState(false);
  const [itinOpen, setItinOpen] = useState(false);
  // demo sets max-height to the measured scrollHeight for the slide-open
  // animation — measured in the click handler, never during render
  const [itinMax, setItinMax] = useState(0);
  const itinRef = useRef<HTMLDivElement>(null);
  const dateRef = useRef<HTMLInputElement>(null);

  const visibleAddons = addons.filter((x) => t.name.indexOf(x.name.split(" ")[0]) === -1);
  const selAddons = visibleAddons.filter((x) => sel.includes(x.name));
  const addSum = selAddons.reduce((a, x) => a + (x.priceMXN ?? 0), 0);
  // Amanah tier totals are the price authority (group total, discount built
  // in); the legacy per-person price is the fallback. Add-ons stay per person.
  const priced = !!t.groupPrices || t.priceMXN !== null;
  const minPax = tierMinPax(t.groupPrices);
  const maxPax = tierMaxPax(t.groupPrices);
  const pax = Math.min(Math.max(n, minPax), maxPax);
  const baseTot = tierTotal(t.groupPrices, pax) ?? (t.priceMXN ?? 0) * pax;
  const tot = baseTot + addSum * pax;

  function bookNow() {
    if (!date) { onToast("Please choose a tour date first."); dateRef.current?.focus(); return; }
    const q = new URLSearchParams({ tour: t.slug, date, n: String(pax) });
    if (sel.length) q.set("addons", JSON.stringify(sel));
    router.push("/tour-booking?" + q.toString());
  }

  const stops = t.stops.map((s, si) => {
    const last = si === t.stops.length - 1;
    return (
      <div className="tt-stop" key={si}>
        <div className="tt-stop-line-wrap">
          <div className="tt-stop-num">{si + 1}</div>
          {!last && <div className="tt-stop-line"></div>}
        </div>
        <div className="tt-stop-c">
          <div className="tt-stop-time">{s[0]}</div>
          <div className="tt-stop-name">{s[1]}</div>
          {s[2] ? <div className="tt-stop-desc">{s[2]}</div> : null}
        </div>
      </div>
    );
  });

  return (
    <div className="tt-card">
      <div className="tt-img">
        {t.img ? (
          <div className="ph" style={{ backgroundImage: `url(${t.img})`, backgroundSize: "cover", backgroundPosition: "center" }}></div>
        ) : (
          <>
            <div className={`ph ${t.g}`}></div>
            <span className="tt-photo">Photo</span>
          </>
        )}
        <span className="tt-dur">{t.dur}</span>
        {!priced && <span className="tt-onreq" dangerouslySetInnerHTML={{ __html: tr("byo_onreq") }} />}
      </div>
      <div className="tt-body">
        <div className="tt-name">{t.name}</div>
        <div className="tt-sub">{t.sub}</div>
        <div className="tt-desc">{t.desc}</div>
        {t.stops.length > 0 && (
          <>
            <button type="button" className={`tt-itin-toggle${itinOpen ? " open" : ""}`}
              onClick={() => {
                setItinMax(itinRef.current?.scrollHeight ?? 900);
                setItinOpen((o) => !o);
              }}>
              See itinerary <span className="tt-chev">&#9662;</span>
            </button>
            <div className="tt-itin" style={{ maxHeight: itinOpen ? itinMax : 0 }}>
              <div className="tt-itin-inner" ref={itinRef}>{stops}</div>
            </div>
          </>
        )}
        <div className="tt-div"></div>
        {!priced ? (
          <div className="tt-ctrl">
            <div className="tt-price-row">
              <div className="tt-plabel">Pricing</div>
              <div className="tt-amount"><span className="tt-total onreq" dangerouslySetInnerHTML={{ __html: tr("byo_onreq") }} /></div>
            </div>
            <button type="button" className="tt-buy req" onClick={() => onRequest(t)}>Request this tour</button>
            <div className="tt-note">&#128274; Private for your group &middot; arranged personally with you</div>
          </div>
        ) : (
          <div className="tt-ctrl">
            <div className="tt-row">
              <div className="tt-field"><label>Date</label><input ref={dateRef} type="date" min={minDate} value={date} onChange={(e) => setDate(e.target.value)} /></div>
              <div className="tt-field">
                <label>People <span className="tt-info" data-tip="For groups of more than 6, contact us to arrange your private tour.">i</span></label>
                <div className="tt-step">
                  <button type="button" onClick={() => setN(Math.max(minPax, pax - 1))}>&minus;</button>
                  <div className="tt-count">{pax}</div>
                  <button type="button" onClick={() => setN(Math.min(maxPax, pax + 1))}>+</button>
                </div>
              </div>
            </div>
            <div className="tt-price-row">
              <div className="tt-plabel">Total</div>
              <div className="tt-amount">
                <span className="tt-total">{cur === "MXN" ? <>{fmtN(tot)} <span className="cur">MXN</span></> : fromMXN(tot)}</span>
                <span className="tt-per">{cur === "MXN" ? fmtUSD(tot) : `${fmtN(tot)} MXN`}</span>
              </div>
            </div>
            {!t.park && (
              <>
                <button type="button" className={`tt-addacts${actsOpen ? " open" : ""}`} onClick={() => setActsOpen((o) => !o)}>
                  <span>+ Add activities</span><span className="pl">+</span>
                </button>
                <div className={`tt-acts${actsOpen ? " open" : ""}`}>
                  <div className="tt-acts-note">Add parks &amp; activities to your trip &mdash; priced per person, bundled into one booking.</div>
                  {visibleAddons.map((x) => (
                    <label className="byo-act" key={x.name}>
                      <input
                        type="checkbox" className="byo-cb"
                        checked={sel.includes(x.name)}
                        onChange={(e) => setSel((s) => e.target.checked ? [...s, x.name] : s.filter((v) => v !== x.name))}
                      />
                      <span className="byo-ic">{x.icon}</span>
                      <span className="byo-nm">{x.name}</span>
                      {x.priceMXN !== null
                        ? <span className="byo-price">${fmtN(x.priceMXN)} {x.unit || "MXN/person"}</span>
                        : <span className="byo-onreq" dangerouslySetInnerHTML={{ __html: tr("byo_onreq") }} />}
                    </label>
                  ))}
                </div>
                <div className="tt-addon-line" style={{ display: selAddons.length ? "flex" : "none" }}>
                  <span>Tour + <span>{selAddons.length}</span> activities</span>
                  <span>+{fmtN(addSum * n)} MXN included</span>
                </div>
              </>
            )}
            <button type="button" className="tt-buy" onClick={bookNow}>Book now</button>
            <div className="tt-note">&#128274; Just your group — never combined with other people</div>
          </div>
        )}
      </div>
    </div>
  );
}

export function ToursClient({
  tours, addons, byoActs, whatsapp, email, initialView,
}: {
  tours: TourCardData[];
  addons: AddonData[];
  byoActs: AddonData[];
  whatsapp: string;
  email: string;
  initialView: "tours" | "parks";
}) {
  const router = useRouter();
  const { t: tr, tPh } = useLang();
  const [view, setView] = useState<"tours" | "parks">(initialView);
  const [town, setTown] = useState("Playa del Carmen");
  const [destInput, setDestInput] = useState("Playa del Carmen");
  const [destOpen, setDestOpen] = useState(false);
  const [toast, setToast] = useState("");
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [modal, setModal] = useState<TourCardData | null>(null);
  const [comment, setComment] = useState("");

  /* Build Your Own */
  const [byoOpen, setByoOpen] = useState(false);
  const [byoOk, setByoOk] = useState(false);
  const [byoCi, setByoCi] = useState("");
  const [byoCo, setByoCo] = useState("");
  const [byoA, setByoA] = useState(2);
  const [byoC, setByoC] = useState(0);
  const [byoAcc, setByoAcc] = useState<"yes" | "no">("no");
  const [byoActsOpen, setByoActsOpen] = useState(false);
  const [byoPicks, setByoPicks] = useState<string[]>([]);
  const [byoDream, setByoDream] = useState("");

  const minDate = localTomorrowISO();

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      const el = e.target as Element | null;
      if (!el?.closest?.(".dest-combo")) setDestOpen(false);
    };
    document.addEventListener("click", onDoc);
    return () => document.removeEventListener("click", onDoc);
  }, []);

  function showToast(m: string) {
    setToast(m);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(""), 3000);
  }

  const list = tours.filter((t) =>
    view === "parks" ? t.park : !t.park && (t.city || "Playa del Carmen") === town
  );

  const townMatches = TT_TOWNS.filter((c) => c.toLowerCase().includes(destInput.trim().toLowerCase()));

  const pickedPriced = byoPicks.some((n) => byoActs.find((a) => a.name === n)?.priceMXN != null);
  const pickedOnreq = byoPicks.some((n) => byoActs.find((a) => a.name === n)?.priceMXN == null);

  function byoBookNow() {
    const priced = byoPicks.filter((n) => byoActs.find((a) => a.name === n)?.priceMXN != null);
    if (!priced.length) return;
    const q = new URLSearchParams({ acts: JSON.stringify(priced), n: String((byoA + byoC) || 1) });
    if (byoCi || byoCo) q.set("dates", `${byoCi || "?"} → ${byoCo || "?"}`);
    router.push("/tour-booking?" + q.toString());
  }

  function byoSubmit() {
    let msg = "Hi TutCasa! \u{1F44B} I’d like to build my own custom tour:\n";
    msg += `\n\u{1F4C5} Dates: ${byoCi || "—"} → ${byoCo || "—"}\n\u{1F465} Adults: ${byoA} · Children: ${byoC}\n\u{1F3E0} Accommodation: ${byoAcc === "yes" ? "Yes" : "No"}`;
    if (byoPicks.length) msg += "\n\n✨ Activities of interest:\n- " + byoPicks.join("\n- ");
    if (byoDream.trim()) msg += "\n\n\u{1F4AD} Dreaming of: " + byoDream.trim();
    window.open(`https://wa.me/${whatsapp}?text=${encodeURIComponent(msg)}`, "_blank");
    setByoOk(true);
  }

  /* on-request modal message (rebuilt live as the comment changes) */
  const reqLines = modal
    ? "\u{1F334} Tour: " + modal.name + "\n\u{1F4AC} Pricing: On Request" + (comment.trim() ? "\n\n\u{1F4DD} " + comment.trim() : "")
    : "";
  const reqWa = modal
    ? `https://wa.me/${whatsapp}?text=${encodeURIComponent("Hi TutCasa! \u{1F44B} I’d like to request this tour:\n\n" + reqLines + "\n\nThank you!")}`
    : "";
  const reqMail = modal
    ? `mailto:${email || "hello@tutcasa.com"}?subject=${encodeURIComponent("Tour Request — " + modal.name)}&body=${encodeURIComponent("Hi TutCasa! \u{1F44B} I’d like to request this tour:\n\n" + reqLines + "\n\nThank you!")}`
    : "";

  return (
    <>
      <div className="backbar"><button className="backbtn" onClick={() => history.back()}>&larr; <T k="nav_back" /></button></div>

      <section className="tt-hero">
        <div className="sun"></div>
        <div className="wrap">
          <T as="div" className="eyebrow" k="exp_cta_b" />
          <T as="h1" k="nav_tours" />
          <T as="p" k="tt_sub" />
        </div>
      </section>

      <div className="dest-wrap" style={view === "parks" ? { display: "none" } : undefined}>
        <div className="dest-combo">
          <label>&#128205; Destination</label>
          <input
            className="dest-input" type="text" autoComplete="off" placeholder="Playa del Carmen"
            value={destInput}
            onFocus={() => { setDestInput(""); setDestOpen(true); }}
            onChange={(e) => { setDestInput(e.target.value); setDestOpen(true); }}
            onBlur={() => { if (!destInput) setDestInput(town); }}
          />
          <div className={`dest-list${destOpen ? " open" : ""}`}>
            {townMatches.length === 0 && <div className="dest-none">No destination found</div>}
            {townMatches.map((c) => (
              <div key={c} className={`dest-opt${c === town ? " on" : ""}`}
                onMouseDown={() => { setTown(c); setDestInput(c); setDestOpen(false); }}>
                {c}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="tt-tabs">
        <button type="button" className={`tt-tab${view === "tours" ? " on" : ""}`} onClick={() => setView("tours")}>&#127796; Tours</button>
        <button type="button" className={`tt-tab${view === "parks" ? " on" : ""}`} onClick={() => setView("parks")}>&#127906; Parks</button>
        <Link className="tt-tab" href="/experiences">&#127914; See all activities</Link>
      </div>
      <div className="wrap">
        <div className="tt-grid">
          {list.map((t) => (
            <TourCard key={t.slug} t={t} addons={addons} minDate={minDate} onToast={showToast}
              onRequest={(tour) => { setComment(""); setModal(tour); }} />
          ))}
          {list.length === 0 && (
            <div className="tt-empty">
              No {view === "parks" ? "parks" : `tours in ${town}`} yet — coming soon!
              {view === "parks" ? "" : " Switch back to Playa del Carmen to see all our tours."}
            </div>
          )}
        </div>
      </div>

      {/* contact / booking modal (on-request tours) */}
      <div className={`tt-ov${modal ? " open" : ""}`} onClick={(e) => { if (e.target === e.currentTarget) setModal(null); }}>
        <div className="tt-modal">
          <div className="tt-modal-head">
            <div className="tt-modal-title">{modal ? modal.name + " — Request" : "Book"}</div>
            <button className="tt-modal-x" onClick={() => setModal(null)}>&times;</button>
          </div>
          <div className="tt-modal-body">
            <div className="tt-sum">
              {modal && (
                <>
                  <div className="tt-sum-row"><span className="l">Tour</span><span className="v">{modal.name}</span></div>
                  <div className="tt-sum-row"><span className="l">Pricing</span><span className="v" dangerouslySetInnerHTML={{ __html: tr("byo_onreq") }} /></div>
                </>
              )}
            </div>
            <div className="tt-modal-note">&#10024; This tour is arranged personally. Our team will reach out shortly to confirm availability, dates and details.</div>
            <textarea className="tt-modal-ta" placeholder="Any questions or special requests? (optional)"
              value={comment} onChange={(e) => setComment(e.target.value)}></textarea>
            <div className="tt-btns">
              <a className="tt-wa" href={reqWa} target="_blank" rel="noopener">{WA_SVG} Send via WhatsApp</a>
              <a className="tt-email" href={reqMail}>&#9993;&#65039; Send via Email</a>
            </div>
          </div>
        </div>
      </div>
      <div className={`tt-toast${toast ? " show" : ""}`}>{toast}</div>

      <section className="wrap" style={{ paddingTop: 10 }}>
        <div className="byo-band">
          <span className="deco">&#128736;&#65039;</span>
          <T as="h2" k="exp_build_h" />
          <T as="p" k="exp_build_p" />
          <button className="btn-white" onClick={() => { setByoOpen(true); setByoOk(false); }}><T k="exp_build_b" /></button>
        </div>
      </section>

      {/* Build Your Own modal */}
      <div className={`byo-ov${byoOpen ? " open" : ""}`} onClick={(e) => { if (e.target === e.currentTarget) setByoOpen(false); }}>
        <div className="byo-modal">
          <div className="byo-head">
            <div><T as="h2" k="byo_h" /><T as="p" k="byo_sub" /></div>
            <button className="byo-x" onClick={() => setByoOpen(false)}>&times;</button>
          </div>
          <div className="byo-body" style={{ display: byoOk ? "none" : "block" }}>
            <div className="byo-trip">
              <T as="div" className="byo-trip-t" k="byo_trip" />
              <div className="byo-row2">
                <div className="byo-f"><T as="label" k="byo_ci" /><input type="date" value={byoCi} onChange={(e) => setByoCi(e.target.value)} /></div>
                <div className="byo-f"><T as="label" k="byo_co" /><input type="date" value={byoCo} onChange={(e) => setByoCo(e.target.value)} /></div>
              </div>
              <div className="byo-row3">
                <div className="byo-f"><T as="label" k="byo_adults" /><div className="byo-step"><button type="button" onClick={() => setByoA((v) => Math.max(1, v - 1))}>&minus;</button><span>{byoA}</span><button type="button" onClick={() => setByoA((v) => v + 1)}>+</button></div></div>
                <div className="byo-f"><T as="label" k="byo_children" /><div className="byo-step"><button type="button" onClick={() => setByoC((v) => Math.max(0, v - 1))}>&minus;</button><span>{byoC}</span><button type="button" onClick={() => setByoC((v) => v + 1)}>+</button></div></div>
                <div className="byo-f"><T as="label" k="byo_accom" /><div className="byo-toggle"><button type="button" className={byoAcc === "yes" ? "on" : undefined} onClick={() => setByoAcc("yes")}><T k="byo_yes" /></button><button type="button" className={byoAcc === "no" ? "on" : undefined} onClick={() => setByoAcc("no")}><T k="byo_no" /></button></div></div>
              </div>
              <button type="button" className={`byo-browse${byoActsOpen ? " open" : ""}`} onClick={() => setByoActsOpen((o) => !o)}>
                <span>+ <T k="byo_browse" /></span><span className="pl">+</span>
              </button>
              <div className={`byo-acts${byoActsOpen ? " open" : ""}`}>
                <T as="div" className="byo-acts-note" k="byo_pick" />
                <div>
                  {byoActs.map((x) => (
                    <label className="byo-act" key={x.name}>
                      <input type="checkbox" className="byo-cb"
                        checked={byoPicks.includes(x.name)}
                        onChange={(e) => setByoPicks((s) => e.target.checked ? [...s, x.name] : s.filter((v) => v !== x.name))} />
                      <span className="byo-ic">{x.icon}</span>
                      <span className="byo-nm">{x.name}</span>
                      <span className="byo-i" data-tip="Full details included in your custom quote.">i</span>
                      {x.priceMXN !== null
                        ? <span className="byo-price">${fmtN(x.priceMXN)} {x.unit ? x.unit : (tPh("byo_person") || "MXN/person")}</span>
                        : <span className="byo-onreq" dangerouslySetInnerHTML={{ __html: tr("byo_onreq") }} />}
                    </label>
                  ))}
                </div>
              </div>
            </div>
            <div className="byo-dream">
              <T as="div" className="byo-trip-t" k="byo_dream" />
              <textarea className="byo-ta" placeholder={tPh("byo_dream_ph")} value={byoDream} onChange={(e) => setByoDream(e.target.value)}></textarea>
            </div>
            <div className="byo-actions">
              <button type="button" className="byo-book" disabled={!pickedPriced} onClick={byoBookNow}><T k="byo_book" /> &rarr;</button>
              <button type="button" className="byo-touch" disabled={!pickedOnreq} onClick={byoSubmit}><T k="byo_touch" /></button>
            </div>
            <T as="div" className="byo-hint" k="byo_hint" />
          </div>
          <div className={`byo-ok${byoOk ? " show" : ""}`}>
            <div className="ok">&#10003;</div>
            <T as="h2" k="byo_ok_h" />
            <T as="p" k="byo_ok_p" />
          </div>
        </div>
      </div>
    </>
  );
}
