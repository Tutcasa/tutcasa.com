"use client";

/**
 * Stays page body ported 1:1 from the demo's Stays.html: search bar with
 * where/who popovers, filter chips, filters drawer, match banner (wizard
 * handoff), and the casa grid with photo-nav, hearts, map toggle.
 */

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { T, useLang } from "@/lib/i18n";
import { useCurrency } from "@/lib/currency";
import { useWishlist, type WishItem } from "@/lib/wishlist";

export interface StayCard {
  slug: string;
  name: string;
  city: string; // display city, e.g. "Nuba, Egypt"
  tokens: string[];
  beds: number;
  rate: string;
  reviews: number;
  price: number;
  lat: number;
  lng: number;
  g: string; // g1…g4
  tag: string;
  /** real photo URLs — when present the card shows them instead of gradients */
  photos: string[];
}

/* filter chips: label i18n key, filter token, icon (demo FILTERS) */
const FILTERS: { k: string; f: string; ic: string; raw?: string }[] = [
  { k: "st_f_all", f: "all", ic: "\u{1F3E0}" },
  { k: "st_f_beach", f: "beachfront", ic: "\u{1F3D6}️" },
  { k: "st_f_pool", f: "private pool", ic: "\u{1F3CA}" },
  { k: "st_f_playa", f: "playa del carmen", ic: "\u{1F3DD}️", raw: "Playa del Carmen" },
  { k: "st_f_tulum", f: "tulum", ic: "\u{1F6DB}", raw: "Tulum" },
  { k: "st_f_nuba", f: "nuba", ic: "\u{1F3DC}️", raw: "Nuba, Egypt" },
  { k: "st_f_florida", f: "florida", ic: "\u{1F334}", raw: "Florida" },
  { k: "st_f_villas", f: "villas", ic: "\u{1F3DA}" },
  { k: "st_f_pent", f: "penthouses", ic: "\u{1F3D9}" },
  { k: "st_f_family", f: "family", ic: "\u{1F46A}" },
];

const DEST_TOK: Record<string, string> = {
  "playa del carmen": "playa del carmen", tulum: "tulum", nuba: "nuba", orlando: "orlando",
};
const VIBE_TOK: Record<string, string> = {
  relax: "private pool", family: "family", "big group": "villas", romantic: "penthouses",
};

interface Filters { price: number; beds: number; toks: string[] }
const NO_FILTERS: Filters = { price: 600, beds: 0, toks: [] };

function matchProp(p: StayCard, activeFilter: string, f: Filters): boolean {
  if (activeFilter !== "all" && !p.tokens.includes(activeFilter)) return false;
  if (p.price > f.price) return false;
  if (f.beds && p.beds < f.beds) return false;
  for (const t of f.toks) if (!p.tokens.includes(t)) return false;
  return true;
}

function StayCasa({ p }: { p: StayCard }) {
  const router = useRouter();
  const { t } = useLang();
  const { fromUSD } = useCurrency();
  const { has, toggle } = useWishlist();
  const [idx, setIdx] = useState(0);
  const [mapOpen, setMapOpen] = useState(false);
  const [mapLoaded, setMapLoaded] = useState(false);
  const hasPhotos = p.photos.length > 0;
  const n = hasPhotos ? p.photos.length : 5;
  const base = parseInt(p.g.slice(1), 10) - 1;
  const g = "g" + (((base + idx) % 6) + 1);
  const on = has(p.slug);
  const item: WishItem = { id: p.slug, name: p.name, meta: p.city, price: String(p.price), rate: p.rate, tag: p.tag, g: p.g };

  return (
    <article className="casa">
      <div className={`casa-ph ${hasPhotos ? "g1" : g}`} style={{ position: "relative", overflow: "hidden" }}>
        {hasPhotos && (
          <>
            <Image
              src={p.photos[idx % n]}
              alt=""
              fill
              sizes="(max-width: 700px) 100vw, 380px"
              style={{ objectFit: "cover" }}
              priority={false}
            />
            {/* preload neighbours so arrows feel instant */}
            <div style={{ display: "none" }} aria-hidden>
              <Image src={p.photos[(idx + 1) % n]} alt="" width={16} height={12} sizes="380px" />
              <Image src={p.photos[(idx - 1 + n) % n]} alt="" width={16} height={12} sizes="380px" />
            </div>
          </>
        )}
        <span className="tag">{p.tag}</span>
        <span
          className={`fav${on ? " on" : ""}`}
          role="button"
          tabIndex={0}
          aria-label="Save to wishlist"
          aria-pressed={on}
          onClick={(e) => { e.preventDefault(); e.stopPropagation(); toggle(item); }}
          onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); toggle(item); } }}
          dangerouslySetInnerHTML={{ __html: on ? "&#9829;" : "&#9825;" }}
        />
        <button className="ph-arrow l" onClick={(e) => { e.stopPropagation(); setIdx((i) => (i - 1 + n) % n); }}>&#8249;</button>
        <button className="ph-arrow r" onClick={(e) => { e.stopPropagation(); setIdx((i) => (i + 1) % n); }}>&#8250;</button>
        <span className="ph-count">{idx + 1} / {n}</span>
        <span className="ph-dots">
          {Array.from({ length: n }, (_, i) => <i key={i} className={`ph-dot${i === idx ? " on" : ""}`}></i>)}
        </span>
      </div>
      <div className="casa-b">
        <div className="casa-top"><h4 className="casa-title-clamp" title={p.name}>{p.name}</h4>{p.reviews > 0 && <span className="rate">&#9733; {p.rate}</span>}</div>
        <div className="loc">&#128205; {p.city}</div>
        <div className="casa-meta">{p.beds} <span dangerouslySetInnerHTML={{ __html: t("st_beds") }} /> &middot; {p.tag}</div>
        <div className="casa-pr"><b>{fromUSD(p.price)}</b> <span dangerouslySetInnerHTML={{ __html: t("st_night") }} /></div>
        <div className="casa-actions">
          <button
            className="mini"
            onClick={() => {
              setMapOpen((o) => !o);
              setMapLoaded(true);
            }}
          >
            &#128506;&#65039; <T k="st_showmap" />
          </button>
          <button className="mini rosa" onClick={() => router.push(`/stays/${p.slug}`)}><T k="st_details" /></button>
        </div>
        <div className={`map-slot${mapOpen ? " open" : ""}`}>
          {mapLoaded && (
            <iframe
              loading="lazy"
              src={`https://maps.google.com/maps?q=${p.lat},${p.lng}&z=14&output=embed`}
              title={p.name}
            />
          )}
        </div>
      </div>
    </article>
  );
}

export function StaysClient({
  props,
  initial,
}: {
  props: StayCard[];
  initial: { match: boolean; dest: string; vibe: string; ci: string; co: string };
}) {
  const router = useRouter();
  const { t, tPh } = useLang();

  /* wizard match handoff (demo initMatches) */
  const initFilter = (initial.dest && DEST_TOK[initial.dest.toLowerCase()]) || "all";
  const initToks = useMemo(() => {
    const vt = initial.match && VIBE_TOK[initial.vibe.toLowerCase()];
    return vt ? [vt] : [];
  }, [initial.match, initial.vibe]);

  const [activeFilter, setActiveFilter] = useState(initFilter);
  const [moreFilters, setMoreFilters] = useState<Filters>({ ...NO_FILTERS, toks: initToks });
  const [showBanner, setShowBanner] = useState(initial.match);

  /* search bar */
  const [pop, setPop] = useState<"" | "where" | "who">("");
  const [where, setWhere] = useState(initial.dest);
  const [destFilter, setDestFilter] = useState("");
  const [ci, setCi] = useState(initial.ci);
  const [co, setCo] = useState(initial.co);
  const [guests, setGuests] = useState({ a: 0, c: 0, b: 0 });
  const [decDisabled, setDecDisabled] = useState({ a: false, c: false, b: false });
  const [whoText, setWhoText] = useState("");
  const resultsRef = useRef<HTMLElement>(null);

  /* filters drawer */
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [draft, setDraft] = useState<Filters>({ ...NO_FILTERS, toks: initToks });

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      const el = e.target as Element | null;
      if (el?.closest?.(".pop, [data-pop-cell]")) return;
      setPop("");
    };
    document.addEventListener("click", onDoc);
    return () => document.removeEventListener("click", onDoc);
  }, []);

  const list = props.filter((p) => matchProp(p, activeFilter, moreFilters));
  const draftCount = props.filter((p) => matchProp(p, activeFilter, draft)).length;
  const fcount = (moreFilters.price < 600 ? 1 : 0) + (moreFilters.beds ? 1 : 0) + moreFilters.toks.length;

  function step(k: "a" | "c" | "b", d: number) {
    setGuests((g) => {
      const next = { ...g, [k]: Math.max(0, g[k] + d) };
      setDecDisabled((dd) => ({ ...dd, [k]: next[k] <= 0 }));
      setWhoText(`${next.a + next.c} ${t("st_guests")}`);
      return next;
    });
  }

  function applySearch() {
    const w = where.toLowerCase();
    const hit = FILTERS.find((f) => f.raw && w.indexOf(f.f) > -1);
    if (hit) setActiveFilter(hit.f);
    resultsRef.current?.scrollIntoView({ behavior: "smooth" });
  }

  function clearMatch(e: React.MouseEvent) {
    e.preventDefault();
    setShowBanner(false);
    setActiveFilter("all");
    setMoreFilters({ ...NO_FILTERS, toks: [] });
    setDraft({ ...NO_FILTERS, toks: [] });
    router.replace("/stays");
  }

  const stepper = (k: "a" | "c" | "b", labelKey: string, sub: React.ReactNode) => (
    <div className="stepper">
      <div className="lbl"><b><T k={labelKey} /></b>{sub}</div>
      <div className="step-ctrl">
        <button disabled={decDisabled[k]} onClick={() => step(k, -1)}>&minus;</button>
        <span className="n">{guests[k]}</span>
        <button onClick={() => step(k, 1)}>+</button>
      </div>
    </div>
  );

  const chipVisible = (label: string) => label.toLowerCase().includes(destFilter.toLowerCase());
  const draftTok = (v: string, on: boolean) =>
    setDraft((d) => ({ ...d, toks: on ? [...d.toks, v] : d.toks.filter((x) => x !== v) }));

  return (
    <>
      <section className="s-hero">
        <div className="wrap">
          <T as="h1" k="st_h1" />
          <T as="p" className="sub" k="st_sub" />
        </div>
        <div className="searchbar">
          <div className="sb-cell" data-pop-cell onClick={(e) => { e.stopPropagation(); setPop("where"); }}>
            <label><T k="st_where" /></label>
            <div className={`val${where ? " filled" : ""}`}>
              {where || <T k="st_addwhere" />}
            </div>
            <div className={`pop pop-where${pop === "where" ? " open" : ""}`} onClick={(e) => e.stopPropagation()}>
              <input
                className="where-search"
                placeholder={tPh("st_where_ph")}
                value={destFilter}
                onChange={(e) => setDestFilter(e.target.value)}
              />
              <div>
                <div className="chip-group">
                  <h5>Mexico &#127474;&#127475;</h5>
                  <div className="chips">
                    {["Playa del Carmen", "Tulum"].map((c) => (
                      <span key={c} className="chip" style={chipVisible(c) ? undefined : { display: "none" }} onClick={() => { setWhere(c); setPop(""); }}>{c}</span>
                    ))}
                  </div>
                </div>
                <div className="chip-group">
                  <h5>Egypt &#127466;&#127468;</h5>
                  <div className="chips">
                    <span className="chip" style={chipVisible("Nuba") ? undefined : { display: "none" }} onClick={() => { setWhere("Nuba"); setPop(""); }}>Nuba</span>
                  </div>
                </div>
                <div className="chip-group">
                  <h5>USA &#127482;&#127480;</h5>
                  <div className="chips">
                    <span className="chip" style={chipVisible("Orlando") ? undefined : { display: "none" }} onClick={() => { setWhere("Orlando"); setPop(""); }}>Orlando</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div className="sb-cell"><label><T k="st_checkin" /></label><input type="date" value={ci} onChange={(e) => setCi(e.target.value)} /></div>
          <div className="sb-cell"><label><T k="st_checkout" /></label><input type="date" value={co} onChange={(e) => setCo(e.target.value)} /></div>
          <div className="sb-cell" data-pop-cell onClick={(e) => { e.stopPropagation(); setPop("who"); }}>
            <label><T k="st_who" /></label>
            <div className={`val${whoText ? " filled" : ""}`}>{whoText || <T k="st_addguests" />}</div>
            <div className={`pop pop-who${pop === "who" ? " open" : ""}`} onClick={(e) => e.stopPropagation()}>
              {stepper("a", "st_adults", <span>13+</span>)}
              {stepper("c", "st_children", <span>2&ndash;12</span>)}
              {stepper("b", "st_babies", <span><T k="st_under2" /></span>)}
            </div>
          </div>
          <div className="sb-cell go"><button className="go-btn" onClick={applySearch}>&#128269;</button></div>
        </div>
      </section>

      <div className="filterbar">
        <button className="filter-btn" onClick={() => { setDraft(moreFilters); setDrawerOpen(true); }}>
          <span>&#9776;</span> <T k="st_filters" /> <span className={`fcount${fcount ? " on" : ""}`}>{fcount || ""}</span>
        </button>
        <div className="filters">
          {FILTERS.map((fl) => (
            <button
              key={fl.f}
              className={`f-chip${fl.f === activeFilter ? " on" : ""}`}
              onClick={() => setActiveFilter(fl.f)}
            >
              <span className="ic">{fl.ic}</span>
              {fl.raw ? <span>{fl.raw}</span> : <T k={fl.k} />}
            </button>
          ))}
        </div>
      </div>

      <div className="tstrip">
        <span className="item"><span className="ic">&#128176;</span><span className="em"><T k="st_t1a" /></span>&nbsp;<T k="st_t1b" /></span>
        <span className="item"><span className="ic">&#128667;</span><T k="st_t2" /></span>
        <span className="item"><span className="ic">&#128172;</span><T k="st_t3" /></span>
        <span className="item"><span className="ic">&#127905;</span><T k="st_t4" /></span>
      </div>

      <div className="match-banner" style={showBanner ? { display: "flex" } : undefined}>
        <span className="mb-txt">
          &#10024; <T k="st_match_your" />
          {initial.vibe ? <> <b>{initial.vibe.toLowerCase()}</b></> : null}
          {initial.dest ? <> <T k="st_match_in" /> <b>{initial.dest}</b></> : null}
        </span>
        <Link href="/stays" onClick={clearMatch}><T k="st_seeall" /></Link>
      </div>

      <section className="results wrap" ref={resultsRef}>
        <div className="res-head">
          <h2><span>{list.length}</span> <T k="st_results" /></h2>
          <span className="muted"><T k="st_allin" /></span>
        </div>
        <div className="casa-grid">
          {list.map((p) => <StayCasa key={p.slug} p={p} />)}
        </div>
        {list.length === 0 && <div className="no-res" style={{ display: "block" }}><T k="st_none" /></div>}
      </section>

      <div
        className={`drawer-ov${drawerOpen ? " open" : ""}`}
        onClick={(e) => { if (e.target === e.currentTarget) setDrawerOpen(false); }}
      >
        <div className="drawer">
          <div className="drawer-head"><T as="h3" k="st_filters" /><button className="drawer-x" onClick={() => setDrawerOpen(false)}>&times;</button></div>
          <div className="drawer-body">
            <div className="fgroup">
              <h4><T k="st_fil_price" /></h4>
              <div style={{ marginBottom: 12 }}>
                <span className="price-val">{draft.price >= 600 ? "$600+" : `$${draft.price}`}</span>{" "}
                <span style={{ color: "var(--grey)", fontSize: "12.5px" }}><T k="st_allin_s" /></span>
              </div>
              <input
                className="range" type="range" min={80} max={600} step={10}
                value={draft.price}
                onChange={(e) => setDraft((d) => ({ ...d, price: +e.target.value }))}
              />
            </div>
            <div className="fgroup">
              <h4><T k="st_fil_beds" /></h4>
              <div className="pillrow">
                {[0, 1, 2, 3, 4].map((b) => (
                  <button key={b} className={`pill${draft.beds === b ? " on" : ""}`} onClick={() => setDraft((d) => ({ ...d, beds: b }))}>
                    {b === 0 ? <T k="st_fil_any" /> : `${b}+`}
                  </button>
                ))}
              </div>
            </div>
            <div className="fgroup">
              <h4><T k="st_fil_type" /></h4>
              {([["beachfront", "st_f_beach"], ["private pool", "st_f_pool"], ["villas", "st_f_villas"], ["penthouses", "st_f_pent"], ["family", "st_f_family"]] as const).map(([v, k]) => (
                <label className="check" key={v}>
                  <input type="checkbox" checked={draft.toks.includes(v)} onChange={(e) => draftTok(v, e.target.checked)} /> <T k={k} />
                </label>
              ))}
            </div>
          </div>
          <div className="drawer-foot">
            <button className="clear" onClick={() => setDraft({ ...NO_FILTERS, toks: [] })}><T k="st_fil_clear" /></button>
            <button className="apply" onClick={() => { setMoreFilters(draft); setDrawerOpen(false); }}>
              <T k="st_fil_show" /> <span>{draftCount}</span> <T k="st_fil_homes" />
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
