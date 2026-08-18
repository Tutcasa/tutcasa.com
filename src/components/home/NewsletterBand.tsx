"use client";

import { useActionState } from "react";
import { subscribeNewsletterAction } from "@/app/growth-actions";

/** Homepage bottom band: enter your email → we email a 10% welcome coupon. */
export function NewsletterBand() {
  const [state, action, pending] = useActionState(subscribeNewsletterAction, {
    ok: true,
    message: "",
  });

  return (
    <section className="wrap" style={{ padding: "10px 18px 56px" }}>
      <div
        style={{
          background: "linear-gradient(135deg, #FFF3E9, #FFE8EF)",
          borderRadius: 26,
          padding: "38px 26px",
          textAlign: "center",
          boxShadow: "0 6px 20px rgba(58,44,40,.06)",
        }}
      >
        <div className="eyebrow">&#127873; Get 10% off your first stay</div>
        <h2 className="sec-title" style={{ margin: "6px 0 8px" }}>
          Join the TutCasa family
        </h2>
        <p style={{ color: "var(--grey)", maxWidth: 520, margin: "0 auto 18px", fontSize: 15 }}>
          Enter your email and we&rsquo;ll send you a 10% discount coupon for your
          first booking &mdash; plus the occasional deal. No spam, ever.
        </p>
        {state.ok && state.message ? (
          <div style={{ fontWeight: 800, color: "var(--cactus)", fontSize: 16 }}>
            {state.message}
          </div>
        ) : (
          <form
            action={action}
            style={{
              display: "flex", gap: 10, justifyContent: "center",
              flexWrap: "wrap", maxWidth: 480, margin: "0 auto",
            }}
          >
            <input
              type="email"
              name="email"
              required
              placeholder="you@email.com"
              style={{
                flex: "1 1 220px", borderRadius: 999, border: "1.5px solid var(--line, #EADFD3)",
                padding: "12px 18px", fontSize: 15, outline: "none", background: "#fff",
              }}
            />
            <button className="btn-rosa" disabled={pending} style={{ whiteSpace: "nowrap" }}>
              {pending ? "Sending…" : "Send my coupon"}
            </button>
          </form>
        )}
        {!state.ok && state.message && (
          <div style={{ marginTop: 10, color: "var(--rosa-deep, #C2185B)", fontWeight: 700, fontSize: 13.5 }}>
            {state.message}
          </div>
        )}
      </div>
    </section>
  );
}
