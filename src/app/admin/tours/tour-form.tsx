"use client";

import { useActionState } from "react";
import { saveTourAction, type TourFormState } from "./actions";
import type { Tour } from "@/modules/tours";

const initial: TourFormState = { ok: true, message: "" };

export function TourForm({ tour }: { tour?: Tour }) {
  const [state, action, pending] = useActionState(saveTourAction, initial);
  const inputCls =
    "w-full rounded-xl border-[1.5px] border-line bg-white px-3 py-2.5 text-sm outline-none focus:border-rosa";

  return (
    <form action={action} className="grid gap-3">
      {tour && <input type="hidden" name="id" value={tour.id} />}
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="text-xs font-bold">TITLE *
          <input name="title" required defaultValue={tour?.title} className={inputCls} />
        </label>
        <label className="text-xs font-bold">SUBTITLE
          <input name="subtitle" defaultValue={tour?.subtitle ?? ""} className={inputCls} />
        </label>
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        <label className="text-xs font-bold">CITY
          <input name="city" defaultValue={tour?.city ?? ""} className={inputCls} />
        </label>
        <label className="text-xs font-bold">DURATION LABEL
          <input name="durationLabel" placeholder="e.g. Full day" defaultValue={tour?.durationLabel} className={inputCls} />
        </label>
        <label className="text-xs font-bold">PRICE (MXN / person) *
          <input name="priceMXN" type="number" min="0" step="1" required
                 defaultValue={tour ? tour.priceCents / 100 : ""} className={inputCls} />
        </label>
      </div>
      <label className="text-xs font-bold">DESCRIPTION
        <textarea name="description" rows={3} defaultValue={tour?.description} className={inputCls} />
      </label>
      <div className="grid gap-3 sm:grid-cols-4">
        <label className="text-xs font-bold">MIN GROUP
          <input name="minGroup" type="number" min="1" defaultValue={tour?.minGroup ?? 1} className={inputCls} />
        </label>
        <label className="text-xs font-bold">MAX GROUP
          <input name="maxGroup" type="number" min="1" defaultValue={tour?.maxGroup ?? 12} className={inputCls} />
        </label>
        <label className="text-xs font-bold">TYPE
          <select name="category" defaultValue={tour?.category ?? "tour"} className={inputCls}>
            <option value="tour">Tour</option>
            <option value="park">Park</option>
          </select>
        </label>
        <label className="text-xs font-bold">STATUS
          <select name="status" defaultValue={tour?.status ?? "published"} className={inputCls}>
            <option value="published">Published</option>
            <option value="draft">Draft</option>
            <option value="archived">Archived</option>
          </select>
        </label>
      </div>
      {state.message && (
        <p className={`text-sm font-semibold ${state.ok ? "text-cactus" : "text-rosa-deep"}`}>{state.message}</p>
      )}
      <button
        disabled={pending}
        className="w-fit rounded-pill bg-rosa px-6 py-2.5 text-sm font-bold text-white disabled:opacity-50"
      >
        {pending ? "Saving…" : tour ? "Save changes" : "Add tour"}
      </button>
    </form>
  );
}
