"use client";

import { useTransition } from "react";
import { setStatusAction } from "./actions";
import type { TourBooking } from "@/modules/tours";

const NEXT: Record<string, { to: TourBooking["status"]; label: string }[]> = {
  pending: [
    { to: "paid", label: "Mark paid" },
    { to: "partner_confirmed", label: "Amanah confirmed" },
    { to: "cancelled", label: "Cancel" },
  ],
  paid: [
    { to: "partner_confirmed", label: "Amanah confirmed" },
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
  const opts = NEXT[status] ?? [];
  if (!opts.length) return null;
  return (
    <div className="flex flex-col gap-1.5">
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
    </div>
  );
}
