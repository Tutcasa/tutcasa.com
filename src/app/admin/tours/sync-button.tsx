"use client";

import { useState, useTransition } from "react";
import { syncAmanahAction } from "./actions";

export function SyncButton() {
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, start] = useTransition();
  return (
    <div className="mb-4 flex flex-wrap items-center gap-3 rounded-card bg-paper p-4 shadow-soft">
      <div className="text-sm">
        <b>Amanah sync</b>
        <div className="text-xs text-grey">
          Pulls tours, images, itineraries and group prices 1:1 from
          amanahvacations.com — no markup, always identical.
        </div>
      </div>
      <button
        disabled={busy}
        onClick={() => start(async () => setMsg(await syncAmanahAction()))}
        className="ml-auto rounded-pill bg-rosa px-5 py-2 text-sm font-bold text-white disabled:opacity-50"
      >
        {busy ? "Syncing…" : "Sync from Amanah now"}
      </button>
      {msg && (
        <div className={`w-full text-sm font-semibold ${msg.ok ? "text-cactus" : "text-rosa-deep"}`}>
          {msg.text}
        </div>
      )}
    </div>
  );
}
