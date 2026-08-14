"use client";

import { useActionState, useTransition } from "react";
import {
  addAddonAction,
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
};

const initial: ListingFormState = { ok: true, message: "" };
const inputCls =
  "w-full rounded-xl border-[1.5px] border-line bg-white px-3 py-2.5 text-sm outline-none focus:border-rosa";

export function AddonsEditor({
  listingId, addons,
}: { listingId: string; addons: AdminAddon[] }) {
  const [state, action, pending] = useActionState(addAddonAction, initial);
  const [busy, start] = useTransition();

  return (
    <div className="grid gap-4">
      <p className="text-sm text-grey">
        Optional extras guests can add at checkout — airport pickup, mid-stay
        cleaning, chef night, crib… Priced per stay, per night, per guest, or
        per guest per night.
      </p>

      {addons.length > 0 && (
        <div className="grid gap-2">
          {addons.map((a) => (
            <div key={a.id}
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
          ))}
        </div>
      )}

      <form action={action} className="grid gap-2 sm:grid-cols-[2fr_100px_1.4fr_auto]">
        <input type="hidden" name="id" value={listingId} />
        <input name="name" required placeholder="Extra option name…" className={inputCls} />
        <input name="priceUSD" type="number" min="0" step="1" required placeholder="USD" className={inputCls} />
        <select name="mode" className={inputCls}>
          <option value="flat">Once per stay</option>
          <option value="per_night">Per night</option>
          <option value="per_guest">Per guest</option>
          <option value="per_guest_night">Per guest / night</option>
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
