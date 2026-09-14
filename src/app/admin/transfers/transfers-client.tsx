"use client";

import { useActionState, useEffect, useRef, useState, useTransition } from "react";
import type { Transfer } from "@/modules/transfers";
import { saveTransferAction, cancelTransferAction, answerAmanahAction, deleteTransferAction, type TransferFormState } from "./actions";

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

  // close the form only AFTER the server confirms the save — closing on
  // click unmounted the form and cancelled the submission entirely
  const doneRef = useRef(onDone);
  useEffect(() => { doneRef.current = onDone; });
  useEffect(() => {
    if (state.ok && state.message) {
      const t = setTimeout(() => doneRef.current?.(), 1200); // let the ✓ message be seen
      return () => clearTimeout(t);
    }
  }, [state]);

  return (
    <form action={action} className="grid gap-2 lg:grid-cols-3">
      {transfer ? (
        <>
          <input type="hidden" name="transferId" value={transfer.id} />
          <input type="hidden" name="bookingId" value={transfer.bookingId ?? ""} />
        </>
      ) : (
        <label className="text-xs font-bold lg:col-span-3">BOOKING <span className="font-normal text-grey">(optional — leave empty for a standalone request)</span>
          <select name="bookingId" value={bookingId}
            onChange={(e) => setBookingId(e.target.value)} className={inputCls}>
            <option value="">— No booking (standalone request) —</option>
            {bookings.map((b) => <option key={b.id} value={b.id}>{b.label}</option>)}
          </select>
        </label>
      )}
      <label className="text-xs font-bold">DIRECTION *
        <select name="kind" defaultValue={transfer?.kind ?? "pickup"} className={inputCls}>
          <option value="pickup">🛬 Airport pickup (arrival)</option>
          <option value="dropoff">🛫 Drop-off at airport (departure)</option>
        </select>
      </label>
      <label className="text-xs font-bold">FULL NAME *
        <input name="fullName" required className={inputCls}
          defaultValue={transfer?.fullName ?? picked?.guestName ?? ""} key={bookingId + "n"} />
      </label>
      <label className="text-xs font-bold">DAY OF TRAVEL *
        <input name="travelDate" type="date" required className={inputCls}
          defaultValue={transfer?.travelDate ?? picked?.checkIn ?? ""} key={bookingId + "d"} />
      </label>
      <label className="text-xs font-bold">FLIGHT NUMBER <span className="font-normal text-grey">(if known)</span>
        <input name="flightNumber" placeholder="e.g. AM 512" className={inputCls}
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
      <label className="text-xs font-bold">WHATSAPP NUMBER
        <input name="whatsapp" type="tel" placeholder="+52 984 123 4567" className={inputCls}
          defaultValue={transfer?.whatsapp ?? ""} />
      </label>
      <label className="text-xs font-bold">ADDRESS &amp; UNIT <span className="font-normal text-grey">(pickup or drop-off point)</span>
        <input name="address" placeholder="e.g. Mareazul, Torre B, unit 402" className={inputCls}
          defaultValue={transfer?.address ?? ""} />
      </label>
      <label className="text-xs font-bold">NOTE
        <input name="note" placeholder="Anything the driver should know…" className={inputCls}
          defaultValue={transfer?.note ?? ""} />
      </label>
      <div className="flex items-center gap-3 lg:col-span-3">
        <button disabled={pending}
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

/** Reply to Amanah's question and put the transfer back in their queue. */
function AnswerForm({ transferId }: { transferId: string }) {
  const [state, action, pending] = useActionState(answerAmanahAction, initial);
  return (
    <form action={action} className="mt-2 flex flex-wrap items-center gap-2">
      <input type="hidden" name="transferId" value={transferId} />
      <input name="answer" required placeholder="Type your answer to Amanah…"
        className={`${inputCls} flex-1 min-w-[220px]`} />
      <button disabled={pending}
        className="rounded-pill bg-rosa px-4 py-2 text-xs font-bold text-white disabled:opacity-50">
        {pending ? "Sending…" : "Send answer to Amanah"}
      </button>
      {state.message && (
        <span className={`w-full text-xs font-semibold ${state.ok ? "text-cactus" : "text-rosa-deep"}`}>{state.message}</span>
      )}
    </form>
  );
}

export function TransfersClient({
  transfers, bookings,
}: { transfers: Transfer[]; bookings: BookingOption[] }) {
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const [busy, start] = useTransition();
  // a booking can have ONE pickup + ONE drop-off — only fully covered
  // bookings leave the create dropdown
  const withoutTransfer = bookings.filter(
    (b) => transfers.filter((t) => t.bookingId === b.id && t.status !== "cancelled").length < 2);

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
                <span className="font-mono text-xs font-bold">TC-{t.invoiceNo || t.id.slice(0, 8).toUpperCase()}</span>{" "}
                <b>{t.fullName}</b>
                <span className={`ml-2 rounded-pill px-2.5 py-1 text-xs font-bold ${BADGE[t.status]}`}>{LABEL[t.status]}</span>
                <div className="text-xs text-grey">
                  {t.kind === "dropoff" ? "🛫 Drop-off" : "🛬 Pickup"} · ✈️ {t.flightNumber} · {t.travelDate} · {t.passengers} pax
                  {t.babySeat && " · 👶 baby seat"}{t.listingTitle ? ` → ${t.listingTitle}` : " · standalone"}
                  {t.address && ` · 📍 ${t.address}`}{t.whatsapp && ` · 💬 ${t.whatsapp}`}
                  {!t.sentAt && " · ⚠️ not delivered to Amanah yet"}
                </div>
                {/* who pays: UP TO 4 pax is free for the guest (TutCasa
                    pays Amanah, then bills the host); MORE THAN 4 pay —
                    prepaid at checkout or to the driver on the day */}
                <div className={`mt-0.5 text-xs font-semibold ${t.passengers > 4 ? "text-terra" : "text-cactus"}`}>
                  {t.passengers > 4
                    ? "💳 Guest pays — prepaid at booking, or to the driver on the day"
                    : "🏠 Free for the guest — TutCasa pays Amanah, billed to the host"}
                </div>
                {t.status === "need_details" && t.amanahNote && (
                  <div className="mt-1 rounded-xl bg-rosa/10 px-3 py-2 text-sm">
                    <div className="font-semibold text-rosa-deep">Amanah asks: {t.amanahNote}</div>
                    <AnswerForm transferId={t.id} />
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
                <button disabled={busy}
                  onClick={() => { if (window.confirm("Delete this transfer permanently?")) start(() => deleteTransferAction(t.id)); }}
                  className="rounded-pill border-[1.5px] border-line px-3 py-1 text-xs font-bold text-grey hover:border-rosa-deep hover:text-rosa-deep disabled:opacity-50">
                  Delete
                </button>
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
