"use client";

import { useEffect } from "react";

/**
 * Remembers which marketing partner sent this visitor: a landing on any
 * page with ?via=CODE (or ?ref=CODE) stores the code for 30 days, so
 * every quote and booking in that window carries the partner's
 * commission. Renders nothing.
 */
export function CaptureRef() {
  useEffect(() => {
    try {
      const q = new URLSearchParams(window.location.search);
      const code = (q.get("via") || q.get("ref") || "").trim();
      if (code && /^[A-Z0-9_-]{2,32}$/i.test(code)) {
        document.cookie = `tc_via=${encodeURIComponent(code)}; path=/; max-age=${30 * 24 * 3600}; samesite=lax`;
      }
    } catch {}
  }, []);
  return null;
}
