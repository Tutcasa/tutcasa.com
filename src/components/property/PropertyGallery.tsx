"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Description-page gallery. Photos render clean (no text overlay); clicking
 * one opens an Airbnb-style full-screen viewer: every photo in one
 * scrollable column, opened at the photo you clicked. With no photos the
 * demo's labelled gradient tiles render unchanged.
 */

export interface GalleryPhoto {
  url: string;
  alt: string;
}

export function PropertyGallery({
  photos,
  title,
  labels,
  gs,
  gStart,
}: {
  photos: GalleryPhoto[];
  title: string;
  labels: string[];
  gs: string[];
  gStart: number;
}) {
  const [open, setOpen] = useState<number | null>(null);
  const shotRefs = useRef<(HTMLDivElement | null)[]>([]);

  const close = useCallback(() => setOpen(null), []);

  useEffect(() => {
    if (open === null) return;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") close(); };
    window.addEventListener("keydown", onKey);
    // land the viewer on the photo that was clicked
    shotRefs.current[open]?.scrollIntoView({ block: "start" });
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKey);
    };
  }, [open, close]);

  if (photos.length === 0) {
    return (
      <div className="pd-gallery">
        {labels.map((label, i) => (
          <div key={label} className={`pdph ${gs[(gStart + i) % gs.length]}`}>
            <span className="pdlabel">{label}</span>
          </div>
        ))}
      </div>
    );
  }

  const tiles = photos.slice(0, 5);
  const extra = photos.length - tiles.length;

  return (
    <>
      <div className="pd-gallery">
        {tiles.map((p, i) => (
          <div
            key={p.url}
            className="pdph"
            role="button"
            tabIndex={0}
            aria-label={`Open photo ${i + 1} of ${photos.length}`}
            style={{ cursor: "zoom-in" }}
            onClick={() => setOpen(i)}
            onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") setOpen(i); }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={p.url}
              alt=""
              style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }}
            />
            {i === tiles.length - 1 && extra > 0 && (
              <span
                style={{
                  position: "absolute", right: 10, bottom: 10,
                  background: "rgba(30,22,18,.72)", color: "#fff",
                  borderRadius: 999, padding: "6px 14px",
                  fontSize: 13, fontWeight: 700,
                }}
              >
                +{extra} photos
              </span>
            )}
          </div>
        ))}
      </div>

      {open !== null && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={`${title} — photos`}
          style={{
            position: "fixed", inset: 0, zIndex: 1000,
            background: "rgba(20,14,11,.96)",
            overflowY: "auto", overscrollBehavior: "contain",
          }}
        >
          <div
            style={{
              position: "sticky", top: 0, zIndex: 2,
              display: "flex", justifyContent: "space-between", alignItems: "center",
              padding: "14px 18px",
              background: "linear-gradient(rgba(20,14,11,.9), rgba(20,14,11,0))",
            }}
          >
            <span style={{ color: "#fff", fontWeight: 700, fontSize: 14 }}>
              {title} · {photos.length} photos
            </span>
            <button
              onClick={close}
              aria-label="Close photos"
              style={{
                background: "rgba(255,255,255,.14)", color: "#fff", border: 0,
                borderRadius: 999, width: 38, height: 38, fontSize: 18,
                cursor: "pointer", fontWeight: 700,
              }}
            >
              ✕
            </button>
          </div>
          <div style={{ maxWidth: 980, margin: "0 auto", padding: "6px 16px 60px", display: "grid", gap: 14 }}>
            {photos.map((p, i) => (
              <div key={p.url} ref={(el) => { shotRefs.current[i] = el; }} style={{ scrollMarginTop: 70 }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={p.url}
                  alt={p.alt}
                  loading={i < 3 ? "eager" : "lazy"}
                  style={{ width: "100%", borderRadius: 14, display: "block" }}
                />
                <div style={{ color: "rgba(255,255,255,.55)", fontSize: 12.5, marginTop: 6, textAlign: "center" }}>
                  {i + 1} / {photos.length}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  );
}
