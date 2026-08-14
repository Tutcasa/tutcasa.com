"use client";

/** The demo's shared "← Back" bar (history.back()). */

import { T } from "@/lib/i18n";

export function BackBar() {
  return (
    <div className="backbar">
      <button className="backbtn" onClick={() => history.back()}>
        &larr; <T k="nav_back" />
      </button>
    </div>
  );
}
