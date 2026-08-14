"use client";

/**
 * Home hero ported 1:1 from the demo index.html: audience toggle
 * (guest/owner), Guide-me wizard with typing indicator, and the
 * classic search bar with where/who popovers.
 */

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { T, useLang } from "@/lib/i18n";

/* wizard result cards — same 8 homes the demo hardcodes */
const RESULTS = [
  { slug: "spiritum-marea", name: "Spiritum Marea", meta: "2 beds · pool · ★ 4.94", price: 160, base: 0 },
  { slug: "vista-playa", name: "Vista Playa", meta: "3 beds · ocean view · ★ 4.87", price: 200, base: 1 },
  { slug: "casa-selva", name: "Casa Selva", meta: "4 beds · cenote · ★ 4.91", price: 320, base: 2 },
  { slug: "nile-breeze", name: "Nile Breeze", meta: "3 beds · terrace · ★ 4.96", price: 110, base: 3 },
  { slug: "palma-azul", name: "Palma Azul", meta: "2 beds · rooftop · ★ 4.90", price: 145, base: 1 },
  { slug: "coral-suite", name: "Coral Suite", meta: "1 bed · beach access · ★ 4.85", price: 120, base: 0 },
  { slug: "villa-maya", name: "Villa Maya", meta: "5 beds · pool · ★ 4.98", price: 410, base: 3 },
  { slug: "jardin-verde", name: "Jardin Verde", meta: "3 beds · garden · ★ 4.83", price: 175, base: 2 },
];

const WIZ_DESTS = [
  { v: "Playa del Carmen", ic: "\u{1F3DD}\uFE0F", label: "Playa del Carmen", small: "beachfront" },
  { v: "Tulum", ic: "\u{1F6DB}", label: "Tulum", small: "jungle & villas" },
  { v: "Cancún", ic: "\u{1F3D6}\uFE0F", label: "Cancún", small: "resorts" },
  { v: "Nuba, Egypt", ic: "\u{1F3DC}\uFE0F", label: "Nuba, Egypt", small: "Nile-side" },
  { v: "Orlando", ic: "\u{1F3A2}", label: "Orlando", small: "parks & pools" },
  { v: "Surprise me", ic: "\u{1F3B2}", label: "Surprise me", small: "show the best" },
];

const WIZ_VIBES = [
  { v: "Relax", ic: "\u{1F9D8}", label: "Total relax", small: "pool & beach" },
  { v: "Family", ic: "\u{1F46A}", label: "Family trip", small: "space & safety" },
  { v: "Adventure", ic: "\u{1F99F}", label: "Adventure", small: "cenotes & ruins" },
  { v: "Romantic", ic: "\u{1F305}", label: "Romantic", small: "sunsets for two" },
  { v: "Big group", ic: "\u{1F389}", label: "Big group", small: "villas up to 20" },
];

type GuestKey = "a" | "c" | "b";

function Typing() {
  return (
    <div className="typing"><i></i><i></i><i></i></div>
  );
}

/* result-card photo strip: gradient cycling, count + dots (demo photoNav) */
function ResultCard({ r }: { r: (typeof RESULTS)[number] }) {
  const [idx, setIdx] = useState(0);
  const n = 5;
  const g = "g" + (((r.base + idx) % 6) + 1);
  function nav(e: React.MouseEvent, dir: number) {
    e.stopPropagation();
    setIdx((i) => (i + dir + n) % n);
  }
  return (
    <div className="rc">
      <div className={`ph ${g}`}>
        <button className="ph-arrow l" onClick={(e) => nav(e, -1)}>&#8249;</button>
        <button className="ph-arrow r" onClick={(e) => nav(e, 1)}>&#8250;</button>
        <span className="ph-count">{idx + 1} / {n}</span>
        <span className="ph-dots">
          {Array.from({ length: n }, (_, i) => (
            <i key={i} className={`ph-dot${i === idx ? " on" : ""}`}></i>
          ))}
        </span>
      </div>
      <div className="b">
        <h4>{r.name}</h4>
        <p>{r.meta}</p>
        <div className="pr"><b>${r.price}</b>/night &middot; all-in</div>
        <Link className="rc-btn" href={`/stays/${r.slug}`}>View details &rarr;</Link>
      </div>
    </div>
  );
}

export function HomeHero() {
  const router = useRouter();
  const { t } = useLang();

  const [audience, setAudience] = useState<"stay" | "own">("stay");
  const [mode, setMode] = useState<"guide" | "search">("guide");

  /* classic search bar */
  const [pop, setPop] = useState<"" | "where" | "who">("");
  const [where, setWhere] = useState("");
  const [destFilter, setDestFilter] = useState("");
  const [ci, setCi] = useState("");
  const [co, setCo] = useState("");

  /* guests — shared between the who-popover and wizard step 3 (demo `guests`) */
  const [guests, setGuests] = useState<Record<GuestKey, number>>({ a: 2, c: 0, b: 0 });
  const [decDisabled, setDecDisabled] = useState<Record<GuestKey, boolean>>({ a: false, c: false, b: false });
  const [whoText, setWhoText] = useState("");

  /* wizard */
  const [wz, setWz] = useState<{ step: 1 | 2 | 3 | 4; typing: boolean }>({ step: 1, typing: true });
  const [dest, setDest] = useState("");
  const [vibe, setVibe] = useState("");
  const [wizFilter, setWizFilter] = useState("");
  const [wCi, setWCi] = useState("");
  const [wCo, setWCo] = useState("");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  function goStep(step: 1 | 2 | 3 | 4, ms = 600) {
    if (timer.current) clearTimeout(timer.current);
    setWz({ step, typing: true });
    timer.current = setTimeout(() => setWz({ step, typing: false }), ms);
  }

  useEffect(() => {
    // demo runs step1() on load: typing dots, then the question after
    // 600ms (initial state is already step 1 + typing)
    timer.current = setTimeout(() => setWz({ step: 1, typing: false }), 600);
    // "click outside closes" — React delegates events at the document
    // node, so the demo's stopPropagation trick can't shield this
    // listener; guard by target instead
    const onDoc = (e: MouseEvent) => {
      const el = e.target as Element | null;
      if (el?.closest?.(".pop, [data-pop-cell]")) return;
      setPop("");
    };
    document.addEventListener("click", onDoc);
    return () => {
      document.removeEventListener("click", onDoc);
      if (timer.current) clearTimeout(timer.current);
    };
  }, []);

  function step(k: GuestKey, d: number) {
    const min = k === "a" ? 1 : 0;
    setGuests((g) => {
      const next = { ...g, [k]: Math.max(min, g[k] + d) };
      setDecDisabled((dd) => ({ ...dd, [k]: next[k] <= min }));
      const total = next.a + next.c;
      let s = total + " guest" + (total !== 1 ? "s" : "");
      if (next.b) s += ", " + next.b + " bab" + (next.b !== 1 ? "ies" : "y");
      setWhoText(s);
      return next;
    });
  }

  function pickWhere(city: string) {
    setWhere(city);
    setPop("");
  }

  function goSearch() {
    const params = new URLSearchParams();
    if (where) params.set("dest", where);
    if (ci) params.set("ci", ci);
    if (co) params.set("co", co);
    params.set("guests", String(guests.a + guests.c));
    router.push("/stays?" + params.toString());
  }

  function goMatches() {
    const params = new URLSearchParams({ match: "1" });
    if (dest) params.set("dest", dest);
    if (vibe) params.set("vibe", vibe);
    router.push("/stays?" + params.toString());
  }

  const wzDatesOk = !!(wCi && wCo && wCo > wCi);
  const chipVisible = (label: string) => label.toLowerCase().includes(destFilter.toLowerCase());
  const progress = wz.step;

  const stepper = (k: GuestKey, label: string, sub: string) => (
    <div className="stepper">
      <div className="lbl"><b>{label}</b><span>{sub}</span></div>
      <div className="step-ctrl">
        <button className={`dec-${k}`} disabled={decDisabled[k]} onClick={() => step(k, -1)}>&minus;</button>
        <span className={`n cnt-${k}`}>{guests[k]}</span>
        <button onClick={() => step(k, 1)}>+</button>
      </div>
    </div>
  );

  return (
    <section className="hero">
      <div className="sun"></div>
      <div className="wrap">
        <div className="aud">
          <button className={audience === "stay" ? "on" : undefined} onClick={() => setAudience("stay")}>
            &#127958;&#65039; <T k="home_aud_stay" />
          </button>
          <button className={audience === "own" ? "on own" : "own"} onClick={() => setAudience("own")}>
            &#128273; <T k="home_aud_own" />
          </button>
        </div>

        {/* GUEST VIEW */}
        <div className={audience === "stay" ? undefined : "hidden"}>
          <h1 dangerouslySetInnerHTML={{ __html: t("home_h1") }} />
          <T as="p" className="sub" k="home_sub" />

          <div className="modes">
            <button className={mode === "guide" ? "on" : undefined} onClick={() => setMode("guide")}>
              &#10024; <T k="home_guide" />
            </button>
            <button className={mode === "search" ? "on" : undefined} onClick={() => setMode("search")}>
              &#128269; <T k="home_search" />
            </button>
          </div>

          {/* CLASSIC SEARCH BAR */}
          <div className={`panel${mode === "search" ? "" : " hidden"}`}>
            <div className="searchbar">
              <div className="sb-cell" data-pop-cell onClick={(e) => { e.stopPropagation(); setPop("where"); }}>
                <label>Where</label>
                <div className={`val${where ? " filled" : ""}`}>{where || "Search destinations"}</div>
                <div className={`pop pop-where${pop === "where" ? " open" : ""}`} onClick={(e) => e.stopPropagation()}>
                  <input
                    className="where-search"
                    placeholder="Type a city or country…"
                    value={destFilter}
                    onChange={(e) => setDestFilter(e.target.value)}
                  />
                  <div>
                    <div className="chip-group">
                      <h5>Mexico &#127474;&#127475;</h5>
                      <div className="chips">
                        {["Playa del Carmen", "Tulum", "Cancún"].map((c) => (
                          <span key={c} className="chip" style={chipVisible(c) ? undefined : { display: "none" }} onClick={() => pickWhere(c)}>{c}</span>
                        ))}
                      </div>
                    </div>
                    <div className="chip-group">
                      <h5>Egypt &#127466;&#127468;</h5>
                      <div className="chips">
                        {["Nuba", "Cairo"].map((c) => (
                          <span key={c} className="chip" style={chipVisible(c) ? undefined : { display: "none" }} onClick={() => pickWhere(c)}>{c}</span>
                        ))}
                      </div>
                    </div>
                    <div className="chip-group">
                      <h5>USA &#127482;&#127480;</h5>
                      <div className="chips">
                        {["Orlando", "Miami"].map((c) => (
                          <span key={c} className="chip" style={chipVisible(c) ? undefined : { display: "none" }} onClick={() => pickWhere(c)}>{c}</span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="sb-cell">
                <label>Check in</label>
                <input type="date" value={ci} onChange={(e) => setCi(e.target.value)} />
              </div>
              <div className="sb-cell">
                <label>Check out</label>
                <input type="date" value={co} onChange={(e) => setCo(e.target.value)} />
              </div>
              <div className="sb-cell" data-pop-cell onClick={(e) => { e.stopPropagation(); setPop("who"); }}>
                <label>How many</label>
                <div className={`val${whoText ? " filled" : ""}`}>{whoText || "Add guests"}</div>
                <div className={`pop pop-who${pop === "who" ? " open" : ""}`} onClick={(e) => e.stopPropagation()}>
                  {stepper("a", "Adults", "13+")}
                  {stepper("c", "Children", "2–12")}
                  {stepper("b", "Babies", "under 2")}
                </div>
              </div>
              <div className="sb-cell go">
                <button className="go-btn" onClick={goSearch}>&#128269;</button>
              </div>
            </div>
          </div>

          {/* GUIDED WIZARD */}
          <div className={`panel${mode === "guide" ? "" : " hidden"}`}>
            <div className="wizard">
              <div className="wz-head">
                <div className="wz-avatar">M</div>
                <div><b>If you need help, talk to May</b><span>&#9679; usually replies in minutes</span></div>
                <div className="wz-progress">
                  {[1, 2, 3, 4].map((i) => (
                    <i key={i} className={i <= progress ? "on" : undefined}></i>
                  ))}
                </div>
              </div>
              <div className="wz-body">
                {wz.typing ? (
                  <Typing />
                ) : wz.step === 1 ? (
                  <>
                    <div className="wz-q">Hola &#128075; Where do you want to <span className="em">wake up</span>?</div>
                    <input
                      className="dest-search"
                      placeholder="Type a city or country…"
                      value={wizFilter}
                      onChange={(e) => setWizFilter(e.target.value)}
                    />
                    <div className="opts">
                      {WIZ_DESTS.map((d) => (
                        <div
                          key={d.v}
                          className="opt"
                          style={(d.label + d.small).toLowerCase().includes(wizFilter.toLowerCase()) ? undefined : { display: "none" }}
                          onClick={() => { setDest(d.v); goStep(2); }}
                        >
                          <span className="ic">{d.ic}</span>{d.label}<small>{d.small}</small>
                        </div>
                      ))}
                    </div>
                  </>
                ) : wz.step === 2 ? (
                  <>
                    <div className="wz-q">Nice choice &#128525; What&rsquo;s the <span className="em">vibe</span>?</div>
                    <div className="opts">
                      {WIZ_VIBES.map((v) => (
                        <div key={v.v} className="opt" onClick={() => { setVibe(v.v); goStep(3); }}>
                          <span className="ic">{v.ic}</span>{v.label}<small>{v.small}</small>
                        </div>
                      ))}
                    </div>
                    <button className="wz-back" onClick={() => goStep(1)}>&larr; back</button>
                  </>
                ) : wz.step === 3 ? (
                  <>
                    <div className="wz-q">Last one &mdash; <span className="em">when &amp; who</span>?</div>
                    <div className="dates-row">
                      <div className="date-field">
                        <label>Check in</label>
                        <input type="date" value={wCi} onChange={(e) => setWCi(e.target.value)} />
                      </div>
                      <div className="date-field">
                        <label>Check out</label>
                        <input type="date" value={wCo} onChange={(e) => setWCo(e.target.value)} />
                      </div>
                    </div>
                    <div className="who-box">
                      {stepper("a", "Adults", "13+")}
                      {stepper("c", "Children", "2–12")}
                      {stepper("b", "Babies", "under 2")}
                    </div>
                    <button className="btn btn-rosa" style={{ width: "100%" }} disabled={!wzDatesOk} onClick={() => goStep(4, 850)}>
                      Show my matches
                    </button>
                    <div className="wz-datehint" style={wzDatesOk ? { display: "none" } : undefined}>
                      &#128197; Add your check-in &amp; check-out dates to see matches
                    </div>
                    <button className="wz-back" onClick={() => goStep(2)}>&larr; back</button>
                  </>
                ) : (
                  <>
                    <div className="wz-q">
                      Perfecto &#127881; Casas made for <span className="em">{(vibe || "your trip").toLowerCase()}</span> in {dest}:
                    </div>
                    <div className="result-count">12 casas match &mdash; scroll to see them all</div>
                    <div className="result-cards scroll">
                      {RESULTS.map((r) => (
                        <ResultCard key={r.slug + r.name} r={r} />
                      ))}
                    </div>
                    <div className="wz-cta">
                      <button className="btn btn-rosa" style={{ width: "100%" }} onClick={goMatches}>See all my matches</button>
                    </div>
                    <button className="wz-back" onClick={() => goStep(1)}>&#8635; start over</button>
                  </>
                )}
              </div>
            </div>
            <button className="see-all" onClick={() => router.push("/stays")}>See all our properties &rarr;</button>
          </div>
        </div>

        {/* OWNER VIEW */}
        <div className={audience === "own" ? undefined : "hidden"}>
          <h2 className="hero-title">Your casa, <span className="rosa">fully managed.</span></h2>
          <p className="sub">Higher occupancy, honest reporting, zero headaches. We treat your home like our own. &#128273;</p>
          <div className="owner-hero">
            <span className="deco">&#128273;</span>
            <h2>Earn more, worry less.</h2>
            <p>Full-service management for the Riviera Maya and beyond &mdash; marketing, guests, cleaning, maintenance and payments, all handled.</p>
            <div className="stats">
              <div><b>70%+</b><span>average occupancy</span></div>
              <div><b>40+</b><span>homes managed</span></div>
              <div><b>24/7</b><span>owner support</span></div>
            </div>
            <Link className="btn" href="/list-my-property" style={{ display: "inline-block", textDecoration: "none" }}>
              List my property
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
