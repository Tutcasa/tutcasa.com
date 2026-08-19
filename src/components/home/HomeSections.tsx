"use client";

/**
 * Home page sections below the hero, ported 1:1 from the demo:
 * popular-casas carousel (with wishlist hearts), popular-experiences
 * carousel, and the reviews carousel. Arrow scrolling matches the
 * demo's scrollPop/scrollRev math.
 */

import { useRef, type ReactNode } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { T } from "@/lib/i18n";
import { useCurrency } from "@/lib/currency";
import { useWishlist, type WishItem } from "@/lib/wishlist";

export interface CasaCardData {
  slug: string;
  name: string;
  meta: string; // "Playa del Carmen · 2 beds · walk-out pool"
  wishMeta: string; // "Playa del Carmen"
  price: number;
  rate: string;
  tag: string;
  g: string; // g1…g4
  /** first real photo — card shows it instead of the gradient when present */
  photo?: string | null;
}

function Carousel({
  children,
  kind,
}: {
  children: ReactNode;
  kind: "casa" | "exp" | "rev";
}) {
  const track = useRef<HTMLDivElement>(null);
  function scroll(dir: number) {
    const t = track.current;
    if (!t) return;
    // demo: scrollRev uses 368px, scrollPop uses 80% of track width
    const left = kind === "rev" ? dir * 368 : dir * (t.clientWidth * 0.8);
    t.scrollBy({ left, behavior: "smooth" });
  }
  const trackClass = kind === "rev" ? "rev-track" : "pop-track";
  const wrapClass = kind === "rev" ? "rev-carousel" : "pop-carousel";
  return (
    <div className={wrapClass}>
      <button className="rev-arrow left" onClick={() => scroll(-1)} aria-label="Previous">&#8249;</button>
      <div className={trackClass} ref={track}>{children}</div>
      <button className="rev-arrow right" onClick={() => scroll(1)} aria-label="Next">&#8250;</button>
    </div>
  );
}

function CasaCard({ c }: { c: CasaCardData }) {
  const router = useRouter();
  const { fromUSD } = useCurrency();
  const { has, toggle } = useWishlist();
  const on = has(c.slug);
  const item: WishItem = {
    id: c.slug,
    name: c.name,
    meta: c.wishMeta,
    price: String(c.price),
    rate: c.rate,
    tag: c.tag,
    g: c.g,
  };
  // demo DOM: article.casa as a DIRECT child of .pop-track (the
  // `.pop-track > .casa` flex sizing depends on it) — so navigation is
  // an onClick, not a wrapping <a>.
  return (
    <article className="casa" onClick={() => router.push(`/stays/${c.slug}`)}>
      <div className={`casa-ph ${c.g}`} style={c.photo ? { position: "relative", overflow: "hidden" } : undefined}>
        {c.photo && (
          <Image src={c.photo} alt="" fill sizes="(max-width: 700px) 90vw, 360px" style={{ objectFit: "cover" }} />
        )}
        <span className="tag">{c.tag}</span>
        <span
          className={`fav${on ? " on" : ""}`}
          role="button"
          tabIndex={0}
          aria-label="Save to wishlist"
          aria-pressed={on}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            toggle(item);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              toggle(item);
            }
          }}
          dangerouslySetInnerHTML={{ __html: on ? "&#9829;" : "&#9825;" }}
        />
      </div>
      <div className="casa-b">
        <div className="casa-top">
          <h4>{c.name}</h4>
          <span className="rate">&#9733; {c.rate}</span>
        </div>
        <p>{c.meta}</p>
        <div className="casa-pr">
          <b>{fromUSD(c.price)}</b> <span>/ night &middot; all-in</span>
        </div>
      </div>
    </article>
  );
}

const EXPERIENCES = [
  { g: "e1", price: "from $45", title: <>Cenote &amp; jungle swim</>, sub: <>Half-day &middot; Playa del Carmen</> },
  { g: "e2", price: "from $89", title: <>Chich&eacute;n Itz&aacute; day trip</>, sub: <>Full day &middot; guided tour</> },
  { g: "e3", price: "from $60", title: <>Reef snorkel &amp; boat</>, sub: <>3 hours &middot; Cozumel</> },
  { g: "e4", price: "from $120", title: <>Xcaret park entry</>, sub: <>Full day &middot; transfers included</> },
];

const REVIEWS = [
  { face: "f1", init: "S", text: "“The airport pickup and WhatsApp concierge made this the easiest trip we’ve ever taken.”", who: <><b>Sarah M.</b> &middot; Toronto</>, src: "Airbnb" },
  { face: "f2", init: "J", text: "“They stocked the fridge before we landed and booked our cenote tour cheaper than any site.”", who: <><b>James &amp; Leila</b> &middot; Chicago</>, src: "Vrbo" },
  { face: "f3", init: "C", text: "“Paid by card, instant confirmation, zero surprises at checkout. Better than the photos.”", who: <><b>Camille D.</b> &middot; Montr&eacute;al</>, src: "Google" },
  { face: "f2", init: "A", text: "“May answered every question on WhatsApp within minutes. Felt like we had a local friend.”", who: <><b>Ahmed R.</b> &middot; London</>, src: "Airbnb" },
  { face: "f1", init: "M", text: "“The villa was spotless and exactly as pictured. Kids loved the pool, we loved the price.”", who: <><b>Maria &amp; Tom</b> &middot; Austin</>, src: "Google" },
  { face: "f3", init: "N", text: "“Booking direct saved us almost 20% versus the big sites for the same home. No-brainer.”", who: <><b>Nadia K.</b> &middot; Dubai</>, src: "Vrbo" },
];

export function PopularCasas({ casas }: { casas: CasaCardData[] }) {
  return (
    <section className="pop-sec wrap">
      <div className="sec-head">
        <div>
          <div className="eyebrow">&#128293; <T k="home_eyb_fav" /></div>
          <T as="h2" className="sec-title" k="home_pop_casas" />
        </div>
        <Link className="sec-link" href="/stays"><T k="home_seeall_props" /></Link>
      </div>
      <Carousel kind="casa">
        {casas.map((c) => (
          <CasaCard key={c.slug} c={c} />
        ))}
      </Carousel>
    </section>
  );
}

export interface ExpCardData {
  name: string;
  sub: string;
  img: string | null;
  priceLabel: string;
}

export function PopularExperiences({ items = [] }: { items?: ExpCardData[] }) {
  const router = useRouter();
  if (items.length > 0) {
    return (
      <section className="pop-sec wrap">
        <div className="sec-head">
          <div>
            <div className="eyebrow">&#127880; <T k="home_eyb_book" /></div>
            <T as="h2" className="sec-title" k="home_pop_exp" />
          </div>
          <Link className="sec-link" href="/tours"><T k="home_seeall_exp" /></Link>
        </div>
        <Carousel kind="exp">
          {items.map((e, i) => (
            <article className="exp" key={i} onClick={() => router.push("/tours")} style={{ cursor: "pointer" }}>
              <div className={`exp-ph e${(i % 4) + 1}`} style={e.img ? { position: "relative", overflow: "hidden" } : undefined}>
                {e.img && <Image src={e.img} alt="" fill sizes="300px" style={{ objectFit: "cover" }} />}
                <span className="exp-price" style={{ position: "absolute" }}>{e.priceLabel}</span>
              </div>
              <div className="exp-b">
                <h4>{e.name}</h4>
                <p>{e.sub}</p>
              </div>
            </article>
          ))}
        </Carousel>
      </section>
    );
  }
  return (
    <section className="pop-sec wrap">
      <div className="sec-head">
        <div>
          <div className="eyebrow">&#127880; <T k="home_eyb_book" /></div>
          <T as="h2" className="sec-title" k="home_pop_exp" />
        </div>
        <Link className="sec-link" href="/experiences"><T k="home_seeall_exp" /></Link>
      </div>
      <Carousel kind="exp">
        {EXPERIENCES.map((e, i) => (
          <article className="exp" key={i}>
            <div className={`exp-ph ${e.g}`}>
              <span className="exp-price">{e.price}</span>
            </div>
            <div className="exp-b">
              <h4>{e.title}</h4>
              <p>{e.sub}</p>
            </div>
          </article>
        ))}
      </Carousel>
    </section>
  );
}

export interface LiveReview {
  author: string;
  rating: number;
  text: string;
  when: string;
}

export function LovedByGuests({ live }: { live?: LiveReview[] }) {
  const useLive = !!live && live.length > 0;
  return (
    <section className="loved wrap">
      <T as="div" className="sec-t" k="home_loved" />
      <div className="sec-s">
        {useLive
          ? <>Real reviews from our Google Business profile &mdash; refreshed daily.</>
          : <>Verified reviews imported from Airbnb, Vrbo and Google &mdash; same homes, better price here.</>}
      </div>
      <Carousel kind="rev">
        {useLive
          ? live.map((r, i) => (
              <div className="rev" key={i}>
                <div className="st">{"★".repeat(Math.max(1, Math.min(5, Math.round(r.rating))))}</div>
                <p>&ldquo;{r.text.length > 220 ? `${r.text.slice(0, 220)}…` : r.text}&rdquo;</p>
                <div className="who">
                  <span className={`face f${(i % 3) + 1}`}>{r.author.charAt(0).toUpperCase()}</span>
                  <span><b>{r.author}</b> &middot; {r.when}</span>
                  <span className="src">Google</span>
                </div>
              </div>
            ))
          : REVIEWS.map((r, i) => (
              <div className="rev" key={i}>
                <div className="st">&#9733;&#9733;&#9733;&#9733;&#9733;</div>
                <p>{r.text}</p>
                <div className="who">
                  <span className={`face ${r.face}`}>{r.init}</span>
                  <span>{r.who}</span>
                  <span className="src">{r.src}</span>
                </div>
              </div>
            ))}
      </Carousel>
    </section>
  );
}

export function FamiliaBand() {
  return (
    <section className="familia wrap">
      <div className="card">
        <div className="photo"></div>
        <div className="body">
          <T as="h2" k="home_familia_h" />
          <p>
            TutCasa is a family business &mdash; a Canadian-Egyptian couple who fell in love with the Riviera Maya.
            Every home in our collection is one we&rsquo;d put our own parents in. And when you message us,
            it&rsquo;s really us answering.
          </p>
          <div className="stamps">
            <span className="stamp rosa">Airbnb Superhost</span>
            <span className="stamp">Vrbo Premier Host</span>
            <span className="stamp cactus">Secure card payment</span>
            <span className="stamp">Instant confirmation</span>
            <span className="stamp">40+ homes, personally inspected</span>
          </div>
        </div>
      </div>
    </section>
  );
}
