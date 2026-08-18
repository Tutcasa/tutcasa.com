"use client";

import { useState, useTransition, useActionState } from "react";
import type { Booking, BookingStatus } from "@/modules/bookings";
import {
  setBookingStatusAction,
  updateBookingAction,
  type BookingFormState,
} from "./actions";

const BADGE: Record<string, string> = {
  pending: "bg-sol/15 text-terra",
  confirmed: "bg-cactus/15 text-cactus",
  cancelled: "bg-grey/15 text-grey",
  completed: "bg-cielo/15 text-cielo",
};

const NEXT: Record<BookingStatus, { to: BookingStatus; label: string }[]> = {
  pending: [
    { to: "confirmed", label: "Confirm" },
    { to: "cancelled", label: "Cancel" },
  ],
  confirmed: [
    { to: "completed", label: "Mark completed" },
    { to: "cancelled", label: "Cancel" },
  ],
  cancelled: [],
  completed: [],
};

export interface ListingOption { id: string; title: string }

const initial: BookingFormState = { ok: true, message: "" };
const inputCls =
  "w-full rounded-xl border-[1.5px] border-line bg-white px-3 py-2 text-sm outline-none focus:border-rosa";

function money(cents: number): string {
  return `$${new Intl.NumberFormat("en-US").format(Math.round(cents / 100))}`;
}

export function BookingRow({
  booking: b, listings,
}: { booking: Booking; listings: ListingOption[] }) {
  const [open, setOpen] = useState(false);
  const [busy, start] = useTransition();
  const [state, action, pending] = useActionState(updateBookingAction, initial);
  const nextOpts = NEXT[b.status] ?? [];

  return (
    <>
      <tr className="border-b border-line/60">
        <td className="p-3 font-mono text-xs">
          {b.invoiceNo ? <b>#{b.invoiceNo}</b> : b.id.slice(0, 8).toUpperCase()}
          <div className="text-[10px] text-grey">{b.id.slice(0, 8).toUpperCase()}</div>
        </td>
        <td className="p-3 font-semibold">
          {b.listingTitle}
          <div className="text-xs font-normal text-grey">{b.listingCity}</div>
        </td>
        <td className="whitespace-nowrap p-3">
          {b.checkIn} → {b.checkOut}
          <div className="text-xs text-grey">{b.guests} guests</div>
        </td>
        <td className="p-3">
          {b.guestName}
          <div className="text-xs text-grey">{b.guestEmail}</div>
          {b.guestPhone && <div className="text-xs text-grey">{b.guestPhone}</div>}
          <div className="text-[10px] text-grey">requested {new Date(b.createdAt).toLocaleString()}</div>
          {b.source === "amanah" && (
            <span className="mt-1 inline-block rounded-pill bg-terra/15 px-2 py-0.5 text-[10px] font-bold uppercase text-terra">
              Amanah Vacations{b.partnerRef ? ` · ${b.partnerRef}` : ""}
            </span>
          )}
        </td>
        <td className="p-3 font-bold">{money(b.totalCents)}</td>
        <td className="p-3">
          <span className={`rounded-pill px-2.5 py-1 text-xs font-bold ${BADGE[b.status]}`}>{b.status}</span>
          {b.status === "pending" && b.holdExpiresAt && (
            <div className="mt-1 text-[10px] text-grey">hold expires {new Date(b.holdExpiresAt).toLocaleString()}</div>
          )}
        </td>
        <td className="p-3">
          <div className="flex flex-col items-stretch gap-1.5">
            {nextOpts.map((o) => (
              <button
                key={o.to}
                disabled={busy}
                onClick={() => start(() => setBookingStatusAction(b.id, o.to))}
                className={`rounded-pill border-[1.5px] px-4 py-1.5 text-xs font-bold disabled:opacity-50 ${
                  o.to === "cancelled"
                    ? "border-line text-grey hover:border-rosa hover:text-rosa"
                    : "border-cactus text-cactus hover:bg-cactus hover:text-white"
                }`}
              >
                {o.label}
              </button>
            ))}
            <button
              onClick={() => setOpen((v) => !v)}
              className="rounded-pill border-[1.5px] border-line px-4 py-1.5 text-xs font-bold text-grey hover:border-ink hover:text-ink"
            >
              {open ? "Close" : "Edit"}
            </button>
          </div>
        </td>
      </tr>

      {open && (
        <tr className="border-b border-line/60 bg-crema/40">
          <td colSpan={7} className="p-4">
            <form action={action} className="grid gap-2 lg:grid-cols-4">
              <input type="hidden" name="id" value={b.id} />
              <label className="text-xs font-bold">HOME
                <select name="listingId" defaultValue={b.listingId} className={inputCls}>
                  {listings.map((l) => (
                    <option key={l.id} value={l.id}>{l.title}</option>
                  ))}
                </select>
              </label>
              <label className="text-xs font-bold">GUEST NAME
                <input name="guestName" required defaultValue={b.guestName} className={inputCls} />
              </label>
              <label className="text-xs font-bold">EMAIL
                <input name="guestEmail" type="email" required defaultValue={b.guestEmail} className={inputCls} />
              </label>
              <label className="text-xs font-bold">PHONE
                <input name="guestPhone" defaultValue="" placeholder="unchanged if blank" className={inputCls} />
              </label>
              <label className="text-xs font-bold">CHECK-IN
                <input name="checkIn" type="date" required defaultValue={b.checkIn} className={inputCls} />
              </label>
              <label className="text-xs font-bold">CHECK-OUT
                <input name="checkOut" type="date" required defaultValue={b.checkOut} className={inputCls} />
              </label>
              <label className="text-xs font-bold">GUESTS
                <input name="guests" type="number" min="1" required defaultValue={b.guests} className={inputCls} />
              </label>
              <label className="text-xs font-bold">TOTAL (USD)
                <input name="totalUSD" type="number" min="0" step="1" required
                       defaultValue={Math.round(b.totalCents / 100)} className={inputCls} />
              </label>
              <div className="flex items-end gap-3 lg:col-span-4">
                <button disabled={pending}
                  className="rounded-pill bg-rosa px-5 py-2 text-sm font-bold text-white disabled:opacity-50">
                  {pending ? "Saving…" : "Save booking"}
                </button>
                {state.message && (
                  <span className={`text-sm font-semibold ${state.ok ? "text-cactus" : "text-rosa-deep"}`}>
                    {state.message}
                  </span>
                )}
              </div>
            </form>
          </td>
        </tr>
      )}
    </>
  );
}
