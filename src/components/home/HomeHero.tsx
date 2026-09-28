"use client";

/**
 * Home hero: audience toggle (guest / owner), then — for guests — the
 * framed family film beside the headline, a one-line search pill and a
 * trust strip reaching over the frame, and four pinned homes (the first
 * four in the admin's Display order). Search-only by the client's choice
 * (the old Guide-me wizard was removed 2026-09-28).
 */

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import "@/styles/home-hero.css";
import { T, useLang } from "@/lib/i18n";
import { useCurrency } from "@/lib/currency";

/** a pinned home card (server-built from the published listings) */
export type HeroHome = {
  slug: string;
  name: string;
  price: number; // all-in USD per night
  city: string;
  photo: string | null;
};

type GuestKey = "a" | "c" | "b";

const VIDEO = "https://vlcbibnvhanzdklvzpdy.supabase.co/storage/v1/object/public/listing-photos/site/familia.mp4";

/** After picking a start date, suggest the next night so the check-out
    calendar opens on the right month (guest adjusts freely). */
function suggestCheckout(ci: string, co: string): string {
  if (!ci || (co && co > ci)) return co;
  const d = new Date(`${ci}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString().slice(0, 10);
}

const CITY_COUNTRY: Record<string, string> = {
  "Playa del Carmen": "mexico", Tulum: "mexico",
  Nuba: "egypt nubia", Cairo: "egypt",
  Orlando: "usa united states america florida", Miami: "usa united states america florida",
};

export function HomeHero({ homes = [] }: { homes?: HeroHome[] }) {
  const router = useRouter();
  const { t } = useLang();
  const { fromUSD } = useCurrency();

  const [audience, setAudience] = useState<"stay" | "own">("stay");
  const [pop, setPop] = useState<"" | "where" | "who">("");
  const [where, setWhere] = useState("");
  const [destFilter, setDestFilter] = useState("");
  const [ci, setCi] = useState("");
  const [co, setCo] = useState("");
  const ciRef = useRef<HTMLInputElement>(null);
  const coRef = useRef<HTMLInputElement>(null);
  const [guests, setGuests] = useState<Record<GuestKey, number>>({ a: 2, c: 0, b: 0 });
  const [decDisabled, setDecDisabled] = useState<Record<GuestKey, boolean>>({ a: false, c: false, b: false });
  const [whoText, setWhoText] = useState("");

  useEffect(() => {
    // click outside closes the popovers — guard by target (React delegates
    // events at the document node, so stopPropagation can't shield this)
    const onDoc = (e: MouseEvent) => {
      const el = e.target as Element | null;
      if (el?.closest?.(".pop, [data-pop-cell]")) return;
      setPop("");
    };
    document.addEventListener("click", onDoc);
    return () => document.removeEventListener("click", onDoc);
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

  const chipVisible = (label: string) => {
    const q = destFilter.trim().toLowerCase();
    if (!q) return true;
    return label.toLowerCase().includes(q) || (CITY_COUNTRY[label] ?? "").includes(q);
  };

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

  const wherePop = (
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
                        {["Playa del Carmen", "Tulum"].map((c) => (
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
  );
  const whoPop = (
    <div className={`pop pop-who${pop === "who" ? " open" : ""}`} onClick={(e) => e.stopPropagation()}>
      {stepper("a", "Adults", "13+")}
      {stepper("c", "Children", "2–12")}
      {stepper("b", "Babies", "under 2")}
    </div>
  );
  const shortDate = (d: string) => d
    ? new Date(`${d}T12:00:00Z`).toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" })
    : "";
  /* the client's design: one slim pill — Where · [Check-In | Check-Out] · Guests · SEARCH */
  const searchPill = (
    <div className="hn-bar">
      <div className="hn-cell hn-where" data-pop-cell onClick={(e) => { e.stopPropagation(); setPop("where"); }}>
        <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>
        <span className={where ? "v" : "ph"}>{where || "Where"}</span>
        {wherePop}
      </div>
      <div className="hn-group">
        <div className="hn-cell" onClick={() => ciRef.current?.showPicker?.()}>
          <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3.5" y="5" width="17" height="15" rx="2.5" /><path d="M3.5 10h17M8 3v4M16 3v4" /></svg>
          <span className={ci ? "v" : "ph"}>{ci ? shortDate(ci) : "Check-In"}</span>
          <input ref={ciRef} type="date" tabIndex={-1} aria-label="Check-in date" value={ci}
                 onChange={(e) => { setCi(e.target.value); setCo(suggestCheckout(e.target.value, co)); }} />
        </div>
        <i className="hn-sep" />
        <div className="hn-cell" onClick={() => coRef.current?.showPicker?.()}>
          <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3.5" y="5" width="17" height="15" rx="2.5" /><path d="M3.5 10h17M8 3v4M16 3v4" /></svg>
          <span className={co ? "v" : "ph"}>{co ? shortDate(co) : "Check-Out"}</span>
          <input ref={coRef} type="date" tabIndex={-1} aria-label="Check-out date" min={ci || undefined} value={co}
                 onChange={(e) => setCo(e.target.value)} />
        </div>
      </div>
      <div className="hn-group hn-guests" data-pop-cell onClick={(e) => { e.stopPropagation(); setPop("who"); }}>
        <div className="hn-cell">
          <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="8" r="4" /><path d="M4.5 20c1.2-3.6 4.2-5.5 7.5-5.5s6.3 1.9 7.5 5.5" /></svg>
          <span className={whoText ? "v" : "ph"}>{whoText || "Guests"}</span>
          <svg className="chev" viewBox="0 0 24 24" aria-hidden="true"><path d="m6 9 6 6 6-6" /></svg>
        </div>
        {whoPop}
      </div>
      <button className="hn-go" onClick={goSearch}>Search</button>
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
            <div className="hn">
              <div className="hn-top">
                <div className="hn-frame" aria-hidden="true">
                  <video src={VIDEO} autoPlay muted loop playsInline />
                </div>
                <div className="hn-main">
                  <h1 dangerouslySetInnerHTML={{ __html: t("home_h1") }} />
                  <T as="p" className="sub" k="home_sub" />
                  {searchPill}
                  <div className="hn-trust">
                    <div className="hn-ti">
                      <div><b><span className="stars" aria-hidden="true">&#9733;&#9733;&#9733;&#9733;&#9733;</span> 4.9</b><small>average rating reviews</small></div>
                    </div>
                    <div className="hn-ti">
                      <span className="coin" aria-hidden="true">$0</span>
                      <div><b>$0</b><small>Hidden Fees</small></div>
                    </div>
                    <div className="hn-ti hn-flash">
                      <span className="emo" aria-hidden="true">&#128661;</span>
                      <div><b>Free Airport Pickup</b><small>Help from Booking to Departure</small></div>
                    </div>
                    <div className="hn-ti">
                      <span className="emo" aria-hidden="true">&#128106;</span>
                      <div><b>500+</b><small>Guests Hosted</small></div>
                    </div>
                  </div>
                </div>
              </div>
              {homes.length > 0 && (
                <div className="hn-picks">
                  {homes.slice(0, 4).map((p) => (
                    <Link key={p.slug} href={`/stays/${p.slug}`} className="hn-pick"
                          style={p.photo ? { backgroundImage: `url(${p.photo})` } : undefined}>
                      <b>{p.name.split(/\s*[,–]\s*/)[0]}</b>
                      <small>{p.city}</small>
                      <i>from {fromUSD(p.price)} / night</i>
                    </Link>
                  ))}
                </div>
              )}
            </div>
        </div>

        {/* OWNER VIEW */}
        <div className={audience === "own" ? undefined : "hidden"}>
          <h2 className="hero-title">Start your hosting journey <span className="rosa">with us today</span></h2>
          <p className="sub">Higher occupancy. Transparent reporting. Hassle-free ROI. &#128273;</p>
          <div className="owner-hero">
            <span className="deco">&#128273;</span>
            <h2>Trusted by Hosts for 3+ Years</h2>
            <p>TUT CASA helps homeowners like you earn more from their properties while welcoming wonderful guests, without the hassle of managing bookings and guests yourself.</p>
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
