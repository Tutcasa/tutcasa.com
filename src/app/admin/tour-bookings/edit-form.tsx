"use client";

import { useState, useActionState } from "react";
import { updateTourBookingAction, type TourAnswerState } from "./actions";

const initial: TourAnswerState = { ok: true, message: "" };
const inputCls =
  "w-full rounded-xl border-[1.5px] border-line bg-white px-3 py-2 text-sm outline-none focus:border-rosa";

export function TourEditForm({ b }: {
  b: { id: string; guestName: string; guestEmail: string; guestPhone: string | null;
       tourDate: string; groupSize: number; totalCents: number };
}) {
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState(updateTourBookingAction, initial);

  if (!open) {
    return (
      <button onClick={() => setOpen(true)}
        className="rounded-pill border-[1.5px] border-line px-4 py-2 text-sm font-bold text-grey hover:border-ink hover:text-ink">
        Edit
      </button>
    );
  }
  return (
    <div className="mt-3 w-full rounded-xl bg-crema/60 p-3 sm:col-span-2">
      <form action={action} className="grid gap-2 sm:grid-cols-3">
        <input type="hidden" name="id" value={b.id} />
        <label className="text-xs font-bold">GUEST NAME
          <input name="guestName" required defaultValue={b.guestName} className={inputCls} />
        </label>
        <label className="text-xs font-bold">EMAIL
          <input name="guestEmail" type="email" required defaultValue={b.guestEmail} className={inputCls} />
        </label>
        <label className="text-xs font-bold">PHONE
          <input name="guestPhone" defaultValue="" placeholder="unchanged if blank" className={inputCls} />
        </label>
        <label className="text-xs font-bold">TOUR DATE
          <input name="tourDate" type="date" required defaultValue={b.tourDate} className={inputCls} />
        </label>
        <label className="text-xs font-bold">PEOPLE
          <input name="groupSize" type="number" min="1" required defaultValue={b.groupSize} className={inputCls} />
        </label>
        <label className="text-xs font-bold">TOTAL (USD)
          <input name="totalUSD" type="number" min="0" step="1" required
                 defaultValue={Math.round(b.totalCents / 100)} className={inputCls} />
        </label>
        <div className="flex items-center gap-3 sm:col-span-3">
          <button disabled={pending}
            className="rounded-pill bg-rosa px-5 py-2 text-sm font-bold text-white disabled:opacity-50">
            {pending ? "Saving…" : "Save booking"}
          </button>
          <button type="button" onClick={() => setOpen(false)}
            className="rounded-pill border-[1.5px] border-line px-4 py-2 text-xs font-bold text-grey">
            Close
          </button>
          {state.message && (
            <span className={`text-sm font-semibold ${state.ok ? "text-cactus" : "text-rosa-deep"}`}>
              {state.message}
            </span>
          )}
        </div>
      </form>
    </div>
  );
}
