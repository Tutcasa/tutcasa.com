"use client";

import { useActionState, useState, useTransition } from "react";
import {
  addAddonAction,
  updateAddonAction,
  toggleAddonAction,
  deleteAddonAction,
  type ListingFormState,
} from "./actions";

export interface AdminAddon {
  id: string;
  name: string;
  priceCents: number;
  mode: string;
  active: boolean;
}

const MODE_LABEL: Record<string, string> = {
  flat: "per stay",
  per_night: "per night",
  per_guest: "per guest",
  per_guest_night: "per guest / night",
  for_4: "up to 4 people",
  over_4: "more than 4 people",
};

const MODE_OPTIONS: [string, string][] = [
  ["flat", "Once per stay"],
  ["per_night", "Per night"],
  ["per_guest", "Per guest"],
  ["per_guest_night", "Per guest / night"],
  ["for_4", "Variant: up to 4 people"],
  ["over_4", "Variant: more than 4 people"],
];

const initial: ListingFormState = { ok: true, message: "" };
const inputCls =
  "w-full rounded-xl border-[1.5px] border-line bg-white px-3 py-2.5 text-sm outline-none focus:border-rosa";

function AddonRow({ a }: { a: AdminAddon }) {
  const [editing, setEditing] = useState(false);
  const [busy, start] = useTransition();
  const [state, action, pending] = useActionState(updateAddonAction, initial);

  if (editing) {
    return (
      <form action={action}
        className={`grid gap-2 rounded-xl border-[1.5px] border-rosa/50 bg-white px-3 py-2 sm:grid-cols-[2fr_100px_1.4fr_auto_auto] ${a.active ? "" : "opacity-70"}`}>
        <input type="hidden" name="addonId" value={a.id} />
        <input name="name" required defaultValue={a.name} className={inputCls} />
        <input name="priceUSD" type="number" min="0" step="1" required
               defaultValue={Math.round(a.priceCents / 100)} className={inputCls} />
        <select name="mode" defaultValue={a.mode} className={inputCls}>
          {MODE_OPTIONS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>
        <button disabled={pending}
          className="rounded-pill bg-rosa px-4 py-2 text-sm font-bold text-white disabled:opacity-50">
          {pending ? "Saving…" : "Save"}
        </button>
        <button type="button" onClick={() => setEditing(false)}
          className="rounded-pill border-[1.5px] border-line px-4 py-2 text-sm font-bold text-grey">
          Close
        </button>
        {state.message && (
          <p className={`sm:col-span-5 text-xs font-semibold ${state.ok ? "text-cactus" : "text-rosa-deep"}`}>{state.message}</p>
        )}
      </form>
    );
  }
  return (
    <div
      className={`flex items-center justify-between gap-3 rounded-xl border-[1.5px] border-line bg-white px-3 py-2 text-sm ${a.active ? "" : "opacity-50"}`}>
      <div>
        <b>{a.name}</b>{" "}
        <span className="text-grey">
          ${Math.round(a.priceCents / 100)} {MODE_LABEL[a.mode] ?? a.mode}
        </span>
        {!a.active && (
          <span className="ml-2 rounded-pill bg-grey/15 px-2 py-0.5 text-[10px] font-bold uppercase text-grey">off</span>
        )}
      </div>
      <div className="flex items-center gap-3">
        <button type="button" onClick={() => setEditing(true)}
          className="text-xs font-bold text-grey hover:text-ink">
          Edit
        </button>
        <button type="button" disabled={busy}
          onClick={() => start(() => toggleAddonAction(a.id))}
          className="text-xs font-bold text-grey hover:text-ink disabled:opacity-50">
          {a.active ? "Turn off" : "Turn on"}
        </button>
        <button type="button" disabled={busy}
          onClick={() => start(() => deleteAddonAction(a.id))}
          className="text-xs font-bold text-grey hover:text-rosa-deep disabled:opacity-50">
          Delete
        </button>
      </div>
    </div>
  );
}

export function AddonsEditor({
  listingId, addons,
}: { listingId: string; addons: AdminAddon[] }) {
  const [state, action, pending] = useActionState(addAddonAction, initial);

  return (
    <div className="grid gap-4">
      <p className="text-sm text-grey">
        Optional extras guests can add at checkout — airport pickup, mid-stay
        cleaning, chef night, crib… Priced per stay, per night, per guest, or
        per guest per night.
      </p>

      {addons.length > 0 && (
        <div className="grid gap-2">
          {addons.map((a) => <AddonRow key={a.id} a={a} />)}
        </div>
      )}

      <form action={action} className="grid gap-2 sm:grid-cols-[2fr_100px_1.4fr_auto]">
        <input type="hidden" name="id" value={listingId} />
        <input name="name" required placeholder="Extra option name…" className={inputCls} />
        <input name="priceUSD" type="number" min="0" step="1" required placeholder="USD" className={inputCls} />
        <select name="mode" className={inputCls}>
          {MODE_OPTIONS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>
        <button disabled={pending}
          className="rounded-pill border-[1.5px] border-rosa px-4 py-2 text-sm font-bold text-rosa hover:bg-rosa hover:text-white disabled:opacity-50">
          {pending ? "Adding…" : "+ Add"}
        </button>
      </form>
      {state.message && (
        <p className={`text-sm font-semibold ${state.ok ? "text-cactus" : "text-rosa-deep"}`}>{state.message}</p>
      )}
    </div>
  );
}
