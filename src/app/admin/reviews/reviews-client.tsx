"use client";

import { useActionState, useTransition } from "react";
import {
  addReviewAction,
  deleteReviewAction,
  setReviewStatusAction,
  type ReviewAdminState,
} from "./actions";

export interface ReviewRow {
  id: string;
  listingTitle: string;
  guestName: string;
  rating: number;
  body: string;
  source: string;
  status: string;
  when: string;
  fromBooking: boolean;
}

const initial: ReviewAdminState = { ok: true, message: "" };
const inputCls =
  "w-full rounded-xl border-[1.5px] border-line bg-white px-3 py-2 text-sm outline-none focus:border-rosa";

function Stars({ n }: { n: number }) {
  return <span className="text-sol">{"★".repeat(n)}<span className="text-line">{"★".repeat(5 - n)}</span></span>;
}

export function ReviewsClient({
  reviews, listings,
}: { reviews: ReviewRow[]; listings: { id: string; title: string }[] }) {
  const [busy, start] = useTransition();
  const [addState, addAction, addPending] = useActionState(addReviewAction, initial);

  return (
    <div className="grid gap-6">
      <div className="grid gap-3">
        {reviews.map((r) => (
          <div key={r.id} className={`rounded-card bg-paper p-4 shadow-soft ${r.status === "pending" ? "border-l-4 border-sol" : ""}`}>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <b>{r.guestName}</b> <Stars n={r.rating} />
                <span className="ml-2 text-xs text-grey">{r.listingTitle} · {r.when} · via {r.fromBooking ? "guest link" : r.source}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className={`rounded-pill px-2.5 py-0.5 text-[11px] font-bold uppercase ${r.status === "published" ? "bg-cactus/15 text-cactus" : "bg-sol/15 text-terra"}`}>
                  {r.status}
                </span>
                <button disabled={busy}
                  onClick={() => start(() => setReviewStatusAction(r.id, r.status === "published" ? "pending" : "published"))}
                  className="rounded-pill border-[1.5px] border-line px-3 py-1 text-xs font-bold text-grey hover:border-cactus hover:text-cactus disabled:opacity-50">
                  {r.status === "published" ? "Unpublish" : "✓ Publish"}
                </button>
                <button disabled={busy}
                  onClick={() => { if (confirm("Delete this review permanently?")) start(() => deleteReviewAction(r.id)); }}
                  className="rounded-pill border-[1.5px] border-line px-3 py-1 text-xs font-bold text-grey hover:border-rosa hover:text-rosa-deep disabled:opacity-50">
                  Delete
                </button>
              </div>
            </div>
            <p className="mt-2 text-sm">{r.body}</p>
          </div>
        ))}
        {reviews.length === 0 && (
          <div className="rounded-card bg-paper p-8 text-center text-grey shadow-soft">
            No reviews yet — guests get a review link by email the day after check-out.
          </div>
        )}
      </div>

      <div className="rounded-card bg-paper p-4 shadow-soft">
        <div className="mb-3 text-[11px] font-extrabold uppercase tracking-wider text-grey">
          Add a review by hand <span className="font-normal normal-case">(e.g. copied from Airbnb — published immediately)</span>
        </div>
        <form action={addAction} className="grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
          <select name="listingId" required className={inputCls} defaultValue="">
            <option value="" disabled>Which home…</option>
            {listings.map((l) => <option key={l.id} value={l.id}>{l.title}</option>)}
          </select>
          <input name="name" required placeholder="Guest name" className={inputCls} />
          <select name="rating" defaultValue="5" className={inputCls}>
            {[5, 4, 3, 2, 1].map((n) => <option key={n} value={n}>{"★".repeat(n)}</option>)}
          </select>
          <select name="source" defaultValue="airbnb" className={inputCls}>
            <option value="airbnb">From Airbnb</option>
            <option value="google">From Google</option>
            <option value="vrbo">From Vrbo</option>
            <option value="guest">Direct guest</option>
          </select>
          <input name="stayedAt" type="date" className={inputCls} title="When they stayed (optional)" />
          <textarea name="body" required rows={3} placeholder="The review text…" className={`${inputCls} sm:col-span-2 lg:col-span-4`} />
          <button disabled={addPending}
            className="rounded-pill bg-rosa px-4 py-2 text-sm font-bold text-white disabled:opacity-50">
            {addPending ? "Adding…" : "+ Add review"}
          </button>
        </form>
        {addState.message && (
          <p className={`mt-2 text-sm font-semibold ${addState.ok ? "text-cactus" : "text-rosa-deep"}`}>{addState.message}</p>
        )}
      </div>
    </div>
  );
}
