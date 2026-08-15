"use client";

import { useActionState, useState } from "react";
import { createManualBookingAction, type BookingFormState } from "./actions";
import type { ListingOption } from "./booking-row";

const initial: BookingFormState = { ok: true, message: "" };
const inputCls =
  "w-full rounded-xl border-[1.5px] border-line bg-white px-3 py-2 text-sm outline-none focus:border-rosa";

/** Phone/WhatsApp/walk-in reservations, entered by the team. */
export function NewBookingForm({ listings }: { listings: ListingOption[] }) {
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState(createManualBookingAction, initial);

  return (
    <div className="mb-4">
      <button
        onClick={() => setOpen((v) => !v)}
        className="rounded-pill bg-rosa px-5 py-2 text-sm font-bold text-white"
      >
        {open ? "Close" : "+ New booking"}
      </button>

      {open && (
        <form action={action} className="mt-3 grid gap-2 rounded-card bg-paper p-4 shadow-soft lg:grid-cols-4">
          <label className="text-xs font-bold">HOME *
            <select name="listingId" required className={inputCls}>
              <option value="">Choose…</option>
              {listings.map((l) => (
                <option key={l.id} value={l.id}>{l.title}</option>
              ))}
            </select>
          </label>
          <label className="text-xs font-bold">CHECK-IN *
            <input name="checkIn" type="date" required className={inputCls} />
          </label>
          <label className="text-xs font-bold">CHECK-OUT *
            <input name="checkOut" type="date" required className={inputCls} />
          </label>
          <label className="text-xs font-bold">GUESTS *
            <input name="guests" type="number" min="1" defaultValue={2} required className={inputCls} />
          </label>
          <label className="text-xs font-bold">GUEST NAME *
            <input name="guestName" required className={inputCls} />
          </label>
          <label className="text-xs font-bold">EMAIL
            <input name="guestEmail" type="email" className={inputCls} />
          </label>
          <label className="text-xs font-bold">PHONE / WHATSAPP
            <input name="guestPhone" className={inputCls} />
          </label>
          <label className="text-xs font-bold">STATUS
            <select name="status" defaultValue="confirmed" className={inputCls}>
              <option value="confirmed">Confirmed (dates locked)</option>
              <option value="pending">Pending request</option>
            </select>
          </label>
          <label className="text-xs font-bold lg:col-span-2">TOTAL (USD) <span className="font-normal text-grey">— leave blank to auto-price with all fees &amp; discounts</span>
            <input name="totalUSD" type="number" min="0" step="1" placeholder="auto" className={inputCls} />
          </label>
          <div className="flex items-end gap-3 lg:col-span-2">
            <button disabled={pending}
              className="rounded-pill bg-rosa px-5 py-2 text-sm font-bold text-white disabled:opacity-50">
              {pending ? "Creating…" : "Create booking"}
            </button>
            {state.message && (
              <span className={`text-sm font-semibold ${state.ok ? "text-cactus" : "text-rosa-deep"}`}>
                {state.message}
              </span>
            )}
          </div>
        </form>
      )}
    </div>
  );
}
