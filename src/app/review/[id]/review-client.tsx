"use client";

import { useActionState, useState } from "react";
import { submitReviewAction, type ReviewFormState } from "./actions";

const initial: ReviewFormState = { ok: true, message: "" };

export function ReviewClient({
  bookingId, guestName, listing,
}: { bookingId: string; guestName: string; listing: string }) {
  const [state, action, pending] = useActionState(submitReviewAction, initial);
  const [rating, setRating] = useState(5);
  const [hover, setHover] = useState(0);

  if (state.ok && state.message) {
    return (
      <div style={{ textAlign: "center", padding: "30px 10px" }}>
        <div style={{ fontSize: 44 }}>&#127881;</div>
        <h2 style={{ fontFamily: "'Baloo 2'", margin: "8px 0" }}>Review sent!</h2>
        <p style={{ color: "var(--grey)" }}>{state.message}</p>
      </div>
    );
  }

  return (
    <form action={action} style={{ display: "grid", gap: 14 }}>
      <input type="hidden" name="bookingId" value={bookingId} />
      <input type="hidden" name="rating" value={rating} />
      <div>
        <div style={{ fontSize: 12, fontWeight: 800, textTransform: "uppercase", letterSpacing: ".04em", color: "var(--grey)", marginBottom: 6 }}>
          Your rating for {listing}
        </div>
        <div style={{ display: "flex", gap: 6 }}>
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n} type="button"
              aria-label={`${n} star${n > 1 ? "s" : ""}`}
              onClick={() => setRating(n)}
              onMouseEnter={() => setHover(n)}
              onMouseLeave={() => setHover(0)}
              style={{ background: "none", border: "none", cursor: "pointer", fontSize: 34, lineHeight: 1, color: n <= (hover || rating) ? "var(--sol, #F5A623)" : "var(--line, #F0E2D2)", padding: 0 }}
            >
              &#9733;
            </button>
          ))}
        </div>
      </div>
      <label style={{ fontSize: 12, fontWeight: 800, textTransform: "uppercase", letterSpacing: ".04em", color: "var(--grey)" }}>
        Your name
        <input name="name" defaultValue={guestName} required maxLength={60}
          style={{ display: "block", width: "100%", marginTop: 4, borderRadius: 12, border: "1.5px solid var(--line)", padding: "10px 12px", fontSize: 15, fontFamily: "inherit" }} />
      </label>
      <label style={{ fontSize: 12, fontWeight: 800, textTransform: "uppercase", letterSpacing: ".04em", color: "var(--grey)" }}>
        How was your stay?
        <textarea name="body" required rows={5} maxLength={2000}
          placeholder="What you loved, tips for the next guests…"
          style={{ display: "block", width: "100%", marginTop: 4, borderRadius: 12, border: "1.5px solid var(--line)", padding: "10px 12px", fontSize: 15, fontFamily: "inherit", resize: "vertical" }} />
      </label>
      {!state.ok && state.message && (
        <div style={{ color: "var(--rosa)", fontWeight: 700, fontSize: 14 }}>{state.message}</div>
      )}
      <button disabled={pending}
        style={{ background: "var(--rosa)", color: "#fff", border: "none", borderRadius: 999, padding: "13px 22px", fontSize: 15, fontWeight: 800, cursor: "pointer", opacity: pending ? 0.6 : 1 }}>
        {pending ? "Sending…" : "Send my review"}
      </button>
    </form>
  );
}
