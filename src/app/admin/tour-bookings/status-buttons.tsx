"use client";

import { useState, useTransition } from "react";
import { setStatusAction, sendTourPaymentLinkAction } from "./actions";
import type { TourBooking } from "@/modules/tours";
import { DeleteBookingButton } from "../delete-button";

const NEXT: Record<string, { to: TourBooking["status"]; label: string }[]> = {
  pending: [
    { to: "paid", label: "Mark paid" },
    { to: "cancelled", label: "Cancel" },
  ],
  paid: [
    { to: "cancelled", label: "Cancel" },
  ],
  partner_confirmed: [
    { to: "completed", label: "Mark completed" },
    { to: "cancelled", label: "Cancel" },
  ],
  completed: [],
  cancelled: [],
};

export function StatusButtons({ id, status }: { id: string; status: TourBooking["status"] }) {
  const [pending, start] = useTransition();
  const [linkMsg, setLinkMsg] = useState("");
  const opts = NEXT[status] ?? [];
  return (
    <div className="flex flex-col gap-1.5">
      {status === "pending" && (
        <>
          <button
            disabled={pending}
            onClick={() => start(async () => setLinkMsg((await sendTourPaymentLinkAction(id)).message))}
            className="rounded-pill border-[1.5px] border-rosa px-4 py-1.5 text-xs font-bold text-rosa hover:bg-rosa hover:text-white disabled:opacity-50"
          >
            Accept &amp; send payment link 💳
          </button>
          {linkMsg && <span className="max-w-[180px] text-[11px] font-semibold text-cactus">{linkMsg}</span>}
        </>
      )}
      {opts.map((o) => (
        <button
          key={o.to}
          disabled={pending}
          onClick={() => start(() => setStatusAction(id, o.to))}
          className={`rounded-pill border-[1.5px] px-4 py-1.5 text-xs font-bold disabled:opacity-50 ${
            o.to === "cancelled"
              ? "border-line text-grey hover:border-rosa hover:text-rosa"
              : "border-cactus text-cactus hover:bg-cactus hover:text-white"
          }`}
        >
          {o.label}
        </button>
      ))}
      <DeleteBookingButton id={id} kind="tour" what="this tour booking" />
    </div>
  );
}
