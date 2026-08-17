"use client";

import { useActionState } from "react";
import { guestTransferAction, type GuestTransferState } from "./transfer-actions";

export interface GuestTransfer {
  travelDate: string;
  flightNumber: string;
  passengers: number;
  babySeat: boolean;
  status: string;
  amanahNote: string | null;
}

const initial: GuestTransferState = { ok: true, message: "" };
const inputCls =
  "w-full rounded-xl border-[1.5px] border-line bg-white px-3 py-2 text-sm outline-none focus:border-rosa";

const STATUS_UI: Record<string, { label: string; cls: string; note: string }> = {
  requested: { label: "Requested", cls: "bg-sol/15 text-terra", note: "Amanah Vacations is arranging your pickup — you'll see it confirmed here." },
  confirmed: { label: "Confirmed ✓", cls: "bg-cactus/15 text-cactus", note: "Your driver is booked! They'll meet you at arrivals with a sign." },
  need_details: { label: "One more detail needed", cls: "bg-rosa/15 text-rosa-deep", note: "" },
  done: { label: "Completed", cls: "bg-cielo/15 text-cielo", note: "Hope the ride was smooth! 🌴" },
  cancelled: { label: "Cancelled", cls: "bg-grey/15 text-grey", note: "" },
};

export function TransferSection({
  bookingId, guestName, checkIn, transfer, amanahWhatsapp, refCode,
}: {
  bookingId: string;
  guestName: string;
  checkIn: string;
  transfer: GuestTransfer | null;
  amanahWhatsapp: string;
  refCode: string;
}) {
  const [state, action, pending] = useActionState(guestTransferAction, initial);
  const showForm = !transfer || transfer.status === "need_details" || transfer.status === "cancelled";
  const ui = transfer ? STATUS_UI[transfer.status] : null;
  const wa = `https://wa.me/${amanahWhatsapp.replace(/[^\d]/g, "")}?text=${encodeURIComponent(
    `Hi Amanah Vacations! About my TutCasa airport transfer ${refCode} — `,
  )}`;

  return (
    <div className="mt-5 rounded-xl border border-line p-4">
      <div className="flex items-center justify-between gap-2">
        <h2 className="font-display text-base font-extrabold">🚐 Free airport pickup — included</h2>
        {transfer && ui && (
          <span className={`rounded-pill px-2.5 py-1 text-xs font-bold ${ui.cls}`}>{ui.label}</span>
        )}
      </div>

      {transfer && !showForm && (
        <>
          <p className="mt-2 text-sm text-grey">
            ✈️ {transfer.flightNumber} · {transfer.travelDate} · {transfer.passengers}{" "}
            {transfer.passengers === 1 ? "passenger" : "passengers"}
            {transfer.babySeat && " · baby seat"}
          </p>
          {ui?.note && <p className="mt-1 text-sm text-grey">{ui.note}</p>}
        </>
      )}

      {transfer?.status === "need_details" && transfer.amanahNote && (
        <div className="mt-2 rounded-xl bg-rosa/10 px-3 py-2 text-sm font-semibold text-rosa-deep">
          Amanah asks: {transfer.amanahNote}
        </div>
      )}

      {showForm && (
        <form action={action} className="mt-3 grid gap-2 sm:grid-cols-2">
          <input type="hidden" name="bookingId" value={bookingId} />
          <label className="text-xs font-bold">FULL NAME *
            <input name="fullName" required defaultValue={guestName} className={inputCls} />
          </label>
          <label className="text-xs font-bold">DAY OF TRAVEL *
            <input name="travelDate" type="date" required defaultValue={transfer?.travelDate ?? checkIn} className={inputCls} />
          </label>
          <label className="text-xs font-bold">FLIGHT NUMBER *
            <input name="flightNumber" required placeholder="e.g. AM 512" defaultValue={transfer?.flightNumber ?? ""} className={inputCls} />
          </label>
          <label className="text-xs font-bold">PASSENGERS *
            <input name="passengers" type="number" min="1" max="20" required defaultValue={transfer?.passengers ?? 2} className={inputCls} />
          </label>
          <label className="flex items-center gap-2 text-sm font-semibold sm:mt-5">
            <input type="checkbox" name="babySeat" defaultChecked={transfer?.babySeat ?? false} className="h-4 w-4 accent-rosa" />
            Baby seat needed
          </label>
          <label className="text-xs font-bold sm:col-span-2">NOTE
            <input name="note" placeholder="Anything the driver should know…" className={inputCls} />
          </label>
          <button disabled={pending}
            className="rounded-pill bg-rosa px-5 py-2.5 text-sm font-bold text-white disabled:opacity-50 sm:col-span-2">
            {pending ? "Sending…" : transfer ? "Update my transfer" : "Request my free pickup"}
          </button>
          {state.message && (
            <p className={`text-sm font-semibold sm:col-span-2 ${state.ok ? "text-cactus" : "text-rosa-deep"}`}>{state.message}</p>
          )}
        </form>
      )}

      {transfer && transfer.status !== "cancelled" && (
        <a href={wa} target="_blank" rel="noopener"
          className="mt-3 block rounded-pill border-[1.5px] border-[#1EBE5D] py-2.5 text-center text-sm font-bold text-[#1EBE5D] hover:bg-[#1EBE5D] hover:text-white">
          💬 Contact Amanah Vacations — your transfer &amp; tours agent
        </a>
      )}
    </div>
  );
}
