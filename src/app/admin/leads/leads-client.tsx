"use client";

import { useState, useTransition } from "react";
import type { Lead } from "@/modules/leads";
import { markLeadHandledAction, deleteLeadAction } from "./actions";

const KIND: Record<string, { label: string; cls: string }> = {
  contact: { label: "Contact", cls: "bg-cielo/15 text-cielo" },
  list_property: { label: "List property", cls: "bg-rosa/15 text-rosa" },
  loyalty_referral: { label: "Referral", cls: "bg-cactus/15 text-cactus" },
  partnership: { label: "Partnership", cls: "bg-sol/15 text-terra" },
  newsletter: { label: "Newsletter", cls: "bg-grey/15 text-grey" },
};

export function LeadsClient({ leads }: { leads: Lead[] }) {
  const [filter, setFilter] = useState("all");
  const [busy, start] = useTransition();
  const kinds = ["all", ...Object.keys(KIND).filter((k) => leads.some((l) => l.kind === k))];
  const shown = leads.filter((l) => filter === "all" || l.kind === filter);

  return (
    <div>
      <div className="mb-4 flex flex-wrap gap-1.5">
        {kinds.map((k) => (
          <button key={k} onClick={() => setFilter(k)}
            className={`rounded-pill border-[1.5px] px-4 py-1.5 text-sm font-bold capitalize ${
              filter === k ? "border-ink bg-ink text-white" : "border-line bg-paper hover:border-rosa hover:text-rosa"
            }`}>
            {k === "all" ? `All (${leads.length})` : `${KIND[k].label} (${leads.filter((l) => l.kind === k).length})`}
          </button>
        ))}
      </div>

      <div className="grid gap-3">
        {shown.map((l) => (
          <div key={l.id} className={`rounded-card bg-paper p-4 shadow-soft ${l.status === "handled" ? "opacity-60" : ""}`}>
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div className="min-w-0">
                <span className={`rounded-pill px-2.5 py-1 text-xs font-bold ${KIND[l.kind]?.cls ?? ""}`}>
                  {KIND[l.kind]?.label ?? l.kind}
                </span>
                {l.status === "new" && (
                  <span className="ml-1 rounded-pill bg-rosa px-2 py-0.5 text-[10px] font-bold uppercase text-white">new</span>
                )}
                <div className="mt-1 font-bold">{l.name || "(no name)"}
                  <span className="ml-2 font-normal text-sm text-grey">{l.email}{l.phone ? ` · ${l.phone}` : ""}</span>
                </div>
                <div className="mt-1 grid gap-0.5 text-sm text-grey">
                  {Object.entries(l.payload).filter(([, v]) => v).map(([k, v]) => (
                    <div key={k} className="whitespace-pre-wrap"><b className="text-ink">{k}:</b> {v}</div>
                  ))}
                </div>
                <div className="mt-1 text-[11px] text-grey">{new Date(l.createdAt).toLocaleString()}</div>
              </div>
              <div className="flex gap-2">
                {l.email && (
                  <a href={`mailto:${l.email}`}
                    className="rounded-pill border-[1.5px] border-line px-3 py-1 text-xs font-bold text-grey hover:border-ink hover:text-ink">
                    Reply
                  </a>
                )}
                <button disabled={busy} onClick={() => start(() => markLeadHandledAction(l.id))}
                  className={`rounded-pill border-[1.5px] px-3 py-1 text-xs font-bold disabled:opacity-50 ${l.status === "new" ? "border-cactus text-cactus hover:bg-cactus hover:text-white" : "border-line text-grey"}`}>
                  {l.status === "new" ? "Mark handled" : "Reopen"}
                </button>
                <button disabled={busy} onClick={() => start(() => deleteLeadAction(l.id))}
                  className="rounded-pill border-[1.5px] border-line px-3 py-1 text-xs font-bold text-grey hover:border-rosa hover:text-rosa-deep disabled:opacity-50">
                  Delete
                </button>
              </div>
            </div>
          </div>
        ))}
        {shown.length === 0 && (
          <div className="rounded-card bg-paper p-8 text-center text-grey shadow-soft">
            No leads yet — contact, list-my-property and referral submissions land here.
          </div>
        )}
      </div>
    </div>
  );
}
