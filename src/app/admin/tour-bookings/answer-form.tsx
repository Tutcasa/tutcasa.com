"use client";

import { useActionState } from "react";
import { answerTourQuestionAction, type TourAnswerState } from "./actions";

const initial: TourAnswerState = { ok: true, message: "" };

/** Inline reply to Amanah's question on a tour booking. */
export function TourAnswerForm({ bookingId }: { bookingId: string }) {
  const [state, action, pending] = useActionState(answerTourQuestionAction, initial);
  return (
    <form action={action} className="mt-2 flex flex-wrap items-center gap-2">
      <input type="hidden" name="id" value={bookingId} />
      <input name="answer" required placeholder="Type your answer to Amanah…"
        className="min-w-[220px] flex-1 rounded-xl border-[1.5px] border-line bg-white px-3 py-2 text-sm outline-none focus:border-rosa" />
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
