"use client";

/**
 * Explore-experiences page body ported 1:1 from the demo's
 * Experiences.html — including the compact round "+" add-to-my-tour
 * button with its hover tooltip. The my-tour list persists in
 * tc_mytour (shared with the tour checkout).
 */

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { T } from "@/lib/i18n";
import { useMyTour } from "@/lib/mytour";

const XP: { n: string; cats: string[]; ic: string; g: string }[] = [
  { n: "Cenotes", cats: ["water", "adventure"], ic: "\u{1F4A6}", g: "g6" },
  { n: "Chichén Itzá", cats: ["culture"], ic: "\u{1F3DB}️", g: "g2" },
  { n: "Tulum Ruins", cats: ["culture"], ic: "\u{1F3DB}️", g: "g3" },
  { n: "Cobá Ruins", cats: ["culture", "adventure"], ic: "\u{1F3DB}️", g: "g3" },
  { n: "Reef Snorkeling", cats: ["water"], ic: "\u{1F421}", g: "g1" },
  { n: "Cozumel", cats: ["water"], ic: "\u{1F40B}", g: "g1" },
  { n: "Isla Mujeres", cats: ["water", "relax"], ic: "⛵", g: "g1" },
  { n: "Isla Contoy", cats: ["water", "adventure"], ic: "\u{1F9A9}", g: "g6" },
  { n: "Whale Sharks", cats: ["water", "adventure"], ic: "\u{1F988}", g: "g1" },
  { n: "Holbox Island", cats: ["relax", "adventure"], ic: "\u{1F9A5}", g: "g4" },
  { n: "Catamaran", cats: ["water", "relax"], ic: "⛵", g: "g1" },
  { n: "Xcaret Park", cats: ["parks"], ic: "\u{1F3A1}", g: "g3" },
  { n: "Jungala Aqua", cats: ["parks"], ic: "\u{1F3CA}", g: "g6" },
  { n: "Zipline & ATV", cats: ["adventure"], ic: "\u{1F3CE}", g: "g2" },
  { n: "Sian Ka’an", cats: ["adventure"], ic: "\u{1F334}", g: "g3" },
  { n: "Swim with Dolphins", cats: ["water", "relax"], ic: "\u{1F42C}", g: "g1" },
  { n: "Spa Day", cats: ["relax"], ic: "\u{1F6CD}️", g: "g5" },
  { n: "Private Yacht", cats: ["relax"], ic: "\u{1F6F8}️", g: "g1" },
];

const XFILTERS: [string, string][] = [
  ["exp_f_all", "all"], ["exp_f_water", "water"], ["exp_f_culture", "culture"],
  ["exp_f_adventure", "adventure"], ["exp_f_parks", "parks"], ["exp_f_relax", "relax"],
];

const X_TOWNS = ["Playa del Carmen", "Tulum", "Cancún", "Cozumel", "Akumal", "Puerto Morelos", "Puerto Aventuras", "Bacalar", "Holbox", "Isla Mujeres", "Valladolid", "Cobá", "Chichén Itzá", "Mérida", "Mahahual", "Nuba", "Hurghada", "Cairo", "Orlando", "Miami"];

export function ExperiencesClient() {
  const router = useRouter();
  const { list, has, toggle, clear, count } = useMyTour();
  const [cat, setCat] = useState("all");
  const [town, setTown] = useState("Playa del Carmen");
  const [destInput, setDestInput] = useState("Playa del Carmen");
  const [destOpen, setDestOpen] = useState(false);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      const el = e.target as Element | null;
      if (!el?.closest?.(".dest-combo")) setDestOpen(false);
    };
    document.addEventListener("click", onDoc);
    return () => document.removeEventListener("click", onDoc);
  }, []);

  const items = XP.filter((x) => (cat === "all" || x.cats.includes(cat)) && town === "Playa del Carmen");
  const townMatches = X_TOWNS.filter((c) => c.toLowerCase().includes(destInput.trim().toLowerCase()));

  function bookMyTour() {
    if (!list.length) return;
    router.push("/tour-booking?" + new URLSearchParams({ acts: JSON.stringify(list), n: "1" }).toString());
  }

  return (
    <>
      <div className="backbar"><button className="backbtn" onClick={() => history.back()}>&larr; <T k="nav_back" /></button></div>

      <section className="xp-hero">
        <div className="sun"></div>
        <div className="wrap">
          <T as="h1" k="exp_h1" />
          <T as="p" k="exp_sub" />
        </div>
      </section>

      <div className="dest-wrap">
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

      <div className="xfilters">
        {XFILTERS.map(([k, f]) => (
          <button key={f} className={`xchip${f === cat ? " on" : ""}`} onClick={() => setCat(f)}>
            <T k={k} />
          </button>
        ))}
      </div>

      <section className="wrap">
        <div className="xp-grid">
          {items.map((x) => {
            const added = has(x.n);
            return (
              <div className="xp" key={x.n}>
                <div className={`xp-img ${x.g}`}></div>
                <span className="xp-cat">{x.ic}</span>
                <span className="xp-photo">Photo</span>
                <div className="xp-body"><div className="xp-name">{x.n}</div></div>
                <button
                  type="button"
                  className={`xp-addbtn${added ? " on" : ""}`}
                  data-tip={added ? "Added — tap to remove" : "Add this to my tour"}
                  aria-label="Add this to my tour"
                  onClick={() => toggle(x.n)}
                >
                  <span className="plus">{added ? "✓" : "+"}</span>
                </button>
              </div>
            );
          })}
          {items.length === 0 && (
            <div className="xp-empty">No experiences in {town} yet — coming soon! Switch back to Playa del Carmen.</div>
          )}
        </div>
      </section>

      <section className="xp-cta wrap">
        <div className="xp-cta-inner">
          <span className="deco">&#127905;</span>
          <T as="h2" k="exp_cta_h" />
          <T as="p" k="exp_cta_p" />
          <Link className="btn-white" href="/tours"><T k="exp_cta_b" /></Link>
        </div>
      </section>

      <div className={`mytour-bar${count ? " show" : ""}`}>
        <div>
          <b>{count} {count === 1 ? "activity" : "activities"}</b>
          <small>in my tour list</small>
        </div>
        <button className="mytour-send" onClick={bookMyTour}>Book now &rarr;</button>
        <button className="mytour-clear" onClick={clear} aria-label="Clear list">&times;</button>
      </div>
    </>
  );
}
