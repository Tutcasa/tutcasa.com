import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: { absolute: "Page not found · TutCasa" },
};

/** Branded 404 — replaces the raw Next.js default. Renders inside the root
    layout so the site header/footer are already present. */
export default function NotFound() {
  return (
    <section className="wrap" style={{ textAlign: "center", padding: "80px 20px 100px", maxWidth: 620, margin: "0 auto" }}>
      <div style={{ fontSize: 56, lineHeight: 1 }}>🧭</div>
      <h1 style={{ fontFamily: "'Baloo 2', 'Trebuchet MS', sans-serif", fontSize: 34, fontWeight: 800, margin: "18px 0 8px", color: "var(--ink, #3A2C28)" }}>
        This page went on holiday.
      </h1>
      <p style={{ color: "var(--grey, #8A7A72)", fontSize: 16, lineHeight: 1.6, margin: "0 auto 26px", maxWidth: 460 }}>
        We couldn&rsquo;t find the page you were looking for — it may have moved,
        or the link might be out of date. Let&rsquo;s get you back on track.
      </p>
      <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
        <Link className="btn btn-rosa" href="/" style={{ textDecoration: "none" }}>
          Back to home
        </Link>
        <Link className="btn" href="/stays" style={{ textDecoration: "none" }}>
          Browse all stays
        </Link>
      </div>
    </section>
  );
}
