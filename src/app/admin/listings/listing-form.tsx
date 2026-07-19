"use client";

import { useActionState } from "react";
import { saveListingAction, type ListingFormState } from "./actions";

export interface AdminListing {
  id: string;
  title: string;
  headline: string;
  city: string;
  description: string;
  maxGuests: number;
  bedrooms: number;
  bathrooms: number;
  minStay: number;
  status: string;
  nightlyCents: number;
  cleaningCents: number;
  taxPct: number;
}

const initial: ListingFormState = { ok: true, message: "" };

export function ListingForm({ listing }: { listing: AdminListing }) {
  const [state, action, pending] = useActionState(saveListingAction, initial);
  const inputCls =
    "w-full rounded-xl border-[1.5px] border-line bg-white px-3 py-2.5 text-sm outline-none focus:border-rosa";

  return (
    <form action={action} className="grid gap-3">
      <input type="hidden" name="id" value={listing.id} />
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="text-xs font-bold">TITLE *
          <input name="title" required defaultValue={listing.title} className={inputCls} />
        </label>
        <label className="text-xs font-bold">CARD TAG
          <input name="headline" defaultValue={listing.headline} placeholder="e.g. Oceanfront" className={inputCls} />
        </label>
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        <label className="text-xs font-bold">CITY
          <input name="city" defaultValue={listing.city} className={inputCls} />
        </label>
        <label className="text-xs font-bold">STATUS
          <select name="status" defaultValue={listing.status ?? "published"} className={inputCls}>
            <option value="published">Published</option>
            <option value="draft">Draft (hidden)</option>
            <option value="archived">Archived</option>
          </select>
        </label>
        <label className="text-xs font-bold">MIN STAY (nights)
          <input name="minStay" type="number" min="1" defaultValue={listing.minStay} className={inputCls} />
        </label>
      </div>
      <label className="text-xs font-bold">DESCRIPTION
        <textarea name="description" rows={4} defaultValue={listing.description} className={inputCls} />
      </label>
      <div className="grid gap-3 sm:grid-cols-3">
        <label className="text-xs font-bold">MAX GUESTS
          <input name="maxGuests" type="number" min="1" defaultValue={listing.maxGuests} className={inputCls} />
        </label>
        <label className="text-xs font-bold">BEDROOMS
          <input name="bedrooms" type="number" min="0" defaultValue={listing.bedrooms} className={inputCls} />
        </label>
        <label className="text-xs font-bold">BATHROOMS
          <input name="bathrooms" type="number" min="0" step="0.5" defaultValue={listing.bathrooms} className={inputCls} />
        </label>
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        <label className="text-xs font-bold">NIGHTLY (USD) *
          <input name="nightlyUSD" type="number" min="1" step="1" required
                 defaultValue={listing.nightlyCents / 100} className={inputCls} />
        </label>
        <label className="text-xs font-bold">CLEANING (USD)
          <input name="cleaningUSD" type="number" min="0" step="1"
                 defaultValue={listing.cleaningCents / 100} className={inputCls} />
        </label>
        <label className="text-xs font-bold">TAX %
          <input name="taxPct" type="number" min="0" step="0.1"
                 defaultValue={listing.taxPct} className={inputCls} />
        </label>
      </div>
      {state.message && (
        <p className={`text-sm font-semibold ${state.ok ? "text-cactus" : "text-rosa-deep"}`}>{state.message}</p>
      )}
      <button
        disabled={pending}
        className="w-fit rounded-pill bg-rosa px-6 py-2.5 text-sm font-bold text-white disabled:opacity-50"
      >
        {pending ? "Saving…" : "Save changes"}
      </button>
      <p className="text-xs text-grey">
        Guests always see the all-in price: (nightly × nights + cleaning) + tax.
      </p>
    </form>
  );
}
