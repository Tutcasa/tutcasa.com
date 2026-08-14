"use client";

/** Wishlist page body ported 1:1 from the demo's wishlist.html. */

import Link from "next/link";
import { useWishlist } from "@/lib/wishlist";

export function WishlistClient() {
  const { all, toggle } = useWishlist();

  return (
    <>
      <section className="s-hero" style={{ paddingBottom: 6 }}>
        <div className="wrap">
          <h1>Your <span className="rosa">wishlist.</span></h1>
          <p className="sub">
            The casas you&rsquo;ve hearted, saved on this device.{" "}
            <a
              href="#"
              onClick={(e) => { e.preventDefault(); window.dispatchEvent(new CustomEvent("tc-auth-open", { detail: "login" })); }}
              style={{ color: "var(--rosa)", fontWeight: 600 }}
            >Log in</a>{" "}
            to keep them across devices.
          </p>
        </div>
      </section>

      <section className="results wrap">
        <div className="res-head">
          <h2><span>{all.length}</span> saved</h2>
          <span className="muted">All prices are all-in &mdash; no hidden fees</span>
        </div>
        <div className="casa-grid">
          {all.map((p) => (
            <article className="casa" key={p.id}>
              <div className={`casa-ph ${p.g || "g1"}`}>
                <span className="tag">{p.tag || ""}</span>
                <span
                  className="fav on"
                  role="button"
                  tabIndex={0}
                  aria-label="Remove from wishlist"
                  aria-pressed
                  onClick={() => toggle(p)}
                  onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); toggle(p); } }}
                >&#9829;</span>
              </div>
              <div className="casa-b">
                <div className="casa-top"><h4>{p.name}</h4>{p.rate ? <span className="rate">&#9733; {p.rate}</span> : null}</div>
                {p.meta ? <div className="loc">&#128205; {p.meta}</div> : null}
                {p.price ? <div className="casa-pr"><b>${p.price}</b> <span>/ night &middot; all-in</span></div> : null}
                <div className="casa-actions">
                  <Link className="mini rosa" href={`/stays/${p.id}`} style={{ textDecoration: "none", textAlign: "center", lineHeight: 1.9 }}>
                    View in collection
                  </Link>
                </div>
              </div>
            </article>
          ))}
        </div>
        {all.length === 0 && (
          <div className="no-res" style={{ display: "block", textAlign: "center", padding: "40px 10px" }}>
            <p style={{ fontSize: 18, fontWeight: 700, marginBottom: 6 }}>No saved casas yet &#128149;</p>
            <p style={{ color: "var(--grey)" }}>Tap the &#9825; on any home to save it here.</p>
            <Link href="/stays" style={{ display: "inline-block", marginTop: 16, background: "var(--rosa)", color: "#fff", fontWeight: 700, padding: "11px 20px", borderRadius: 999 }}>
              Browse all casas &rarr;
            </Link>
          </div>
        )}
      </section>
    </>
  );
}
