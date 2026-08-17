"use client";

import { useActionState, useState, useTransition } from "react";
import type { Transfer } from "@/modules/transfers";
import { saveTransferAction, cancelTransferAction, type TransferFormState } from "./actions";

export interface BookingOption {
  id: string;
  label: string;      // "#1002 · Casa Selva · 2026-10-05 · Sarah"
  guestName: string;
  checkIn: string;
}

const initial: TransferFormState = { ok: true, message: "" };
const inputCls =
  "w-full rounded-xl border-[1.5px] border-line bg-white px-3 py-2 text-sm outline-none focus:border-rosa";

const BADGE: Record<string, string> = {
  requested: "bg-sol/15 text-terra",
  confirmed: "bg-cactus/15 text-cactus",
  need_details: "bg-rosa/15 text-rosa-deep",
  done: "bg-cielo/15 text-cielo",
  cancelled: "bg-grey/15 text-grey",
};
const LABEL: Record<string, string> = {
  requested: "Requested",
  confirmed: "Confirmed",
  need_details: "Needs details",
  done: "Done",
  cancelled: "Cancelled",
};

function TransferForm({
  bookings, transfer, onDone,
}: { bookings: BookingOption[]; transfer?: Transfer; onDone?: () => void }) {
  const [state, action, pending] = useActionState(saveTransferAction, initial);
  const [bookingId, setBookingId] = useState(transfer?.bookingId ?? "");
  const picked = bookings.find((b) => b.id === bookingId);

  return (
    <form action={action} className="grid gap-2 lg:grid-cols-3">
      {transfer ? (
        <input type="hidden" name="bookingId" value={transfer.bookingId} />
      ) : (
        <label className="text-xs font-bold lg:col-span-3">BOOKING *
          <select name="bookingId" required value={bookingId}
            onChange={(e) => setBookingId(e.target.value)} className={inputCls}>
            <option value="">Choose a booking…</option>
            {bookings.map((b) => <option key={b.id} value={b.id}>{b.label}</option>)}
          </select>
        </label>
      )}
      <label className="text-xs font-bold">FULL NAME *
        <input name="fullName" required className={inputCls}
          defaultValue={transfer?.fullName ?? picked?.guestName ?? ""} key={bookingId + "n"} />
      </label>
      <label className="text-xs font-bold">DAY OF TRAVEL *
        <input name="travelDate" type="date" required className={inputCls}
          defaultValue={transfer?.travelDate ?? picked?.checkIn ?? ""} key={bookingId + "d"} />
      </label>
      <label className="text-xs font-bold">FLIGHT NUMBER *
        <input name="flightNumber" required placeholder="e.g. AM 512" className={inputCls}
          defaultValue={transfer?.flightNumber ?? ""} />
      </label>
      <label className="text-xs font-bold">PASSENGERS *
        <input name="passengers" type="number" min="1" max="20" required className={inputCls}
          defaultValue={transfer?.passengers ?? 2} />
      </label>
      <label className="mt-5 flex items-center gap-2 text-sm font-semibold">
        <input type="checkbox" name="babySeat" defaultChecked={transfer?.babySeat ?? false}
          className="h-4 w-4 accent-rosa" />
        Baby seat needed
      </label>
      <label className="text-xs font-bold">NOTE
        <input name="note" placeholder="Anything the driver should know…" className={inputCls}
          defaultValue={transfer?.note ?? ""} />
      </label>
      <div className="flex items-center gap-3 lg:col-span-3">
        <button disabled={pending} onClick={() => state.ok && onDone?.()}
          className="rounded-pill bg-rosa px-5 py-2 text-sm font-bold text-white disabled:opacity-50">
          {pending ? "Sending…" : transfer ? "Update & resend to Amanah" : "Save & send to Amanah"}
        </button>
        {state.message && (
          <span className={`text-sm font-semibold ${state.ok ? "text-cactus" : "text-rosa-deep"}`}>{state.message}</span>
        )}
      </div>
    </form>
  );
}

export function TransfersClient({
  transfers, bookings,
}: { transfers: Transfer[]; bookings: BookingOption[] }) {
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const [busy, start] = useTransition();
  const withoutTransfer = bookings.filter((b) => !transfers.some((t) => t.bookingId === b.id));

  return (
    <div className="grid gap-4">
      <div>
        <button onClick={() => setAdding((v) => !v)}
          className="rounded-pill bg-rosa px-5 py-2 text-sm font-bold text-white">
          {adding ? "Close" : "+ New transfer"}
        </button>
        {adding && (
          <div className="mt-3 rounded-card bg-paper p-4 shadow-soft">
            <TransferForm bookings={withoutTransfer} onDone={() => setAdding(false)} />
          </div>
        )}
      </div>

      <div className="grid gap-3">
        {transfers.map((t) => (
          <div key={t.id} className="rounded-card bg-paper p-4 shadow-soft">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <span className="font-mono text-xs font-bold">TC-{t.invoiceNo}</span>{" "}
                <b>{t.fullName}</b>
                <span className={`ml-2 rounded-pill px-2.5 py-1 text-xs font-bold ${BADGE[t.status]}`}>{LABEL[t.status]}</span>
                <div className="text-xs text-grey">
                  ✈️ {t.flightNumber} · {t.travelDate} · {t.passengers} pax
                  {t.babySeat && " · 👶 baby seat"} → {t.listingTitle}
                  {!t.sentAt && " · ⚠️ not delivered to Amanah yet"}
                </div>
                {t.status === "need_details" && t.amanahNote && (
                  <div className="mt-1 rounded-xl bg-rosa/10 px-3 py-1.5 text-sm font-semibold text-rosa-deep">
                    Amanah asks: {t.amanahNote}
                  </div>
                )}
              </div>
              <div className="flex gap-2">
                <button onClick={() => setEditing(editing === t.id ? null : t.id)}
                  className="rounded-pill border-[1.5px] border-line px-3 py-1 text-xs font-bold text-grey hover:border-ink hover:text-ink">
                  {editing === t.id ? "Close" : t.status === "need_details" ? "Fix & resend" : "Edit"}
                </button>
                {t.status !== "done" && t.status !== "cancelled" && (
                  <button disabled={busy} onClick={() => start(() => cancelTransferAction(t.id))}
                    className="rounded-pill border-[1.5px] border-line px-3 py-1 text-xs font-bold text-grey hover:border-rosa hover:text-rosa-deep disabled:opacity-50">
                    Cancel
                  </button>
                )}
              </div>
            </div>
            {editing === t.id && (
              <div className="mt-3 border-t border-line pt-3">
                <TransferForm bookings={bookings} transfer={t} onDone={() => setEditing(null)} />
              </div>
            )}
          </div>
        ))}
        {transfers.length === 0 && (
          <div className="rounded-card bg-paper p-8 text-center text-grey shadow-soft">
            No transfers yet — add one above, or guests fill their own from
            their booking page.
          </div>
        )}
      </div>
    </div>
  );
}
