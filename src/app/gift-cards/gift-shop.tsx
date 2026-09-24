"use client";

import { useState } from "react";
import { startGiftCheckoutAction } from "./actions";

const PRESETS = [50, 100, 200, 500];

export function GiftShop({ paypal = false }: { paypal?: boolean }) {
  const [amount, setAmount] = useState(100);
  const [custom, setCustom] = useState("");
  const [buyerEmail, setBuyerEmail] = useState("");
  const [recipientEmail, setRecipientEmail] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const effective = custom ? Math.round(Number(custom)) || 0 : amount;

  async function buy(via: "stripe" | "paypal" = "stripe") {
    setErr(null);
    if (!(effective >= 25 && effective <= 5000)) { setErr("Pick an amount between $25 and $5,000."); return; }
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(buyerEmail.trim())) { setErr("Add your email — the gift card code is delivered there."); return; }
    setBusy(true);
    try {
      const res = await startGiftCheckoutAction({
        amountUSD: effective,
        buyerEmail: buyerEmail.trim(),
        recipientEmail: recipientEmail.trim() || undefined,
        message: message.trim() || undefined,
      }, via);
      if (res.url) { window.location.href = res.url; return; }
      setErr(res.error ?? "Something went wrong — try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="gift-grid">
      <div className="gift-visual">
        <div className="gift-card">
          <span className="palm">🌴</span>
          <div className="gc-brand">TUT CASA<small>GIFT CARD · RIVIERA MAYA</small></div>
          <div className="gc-amount">${effective >= 25 ? effective.toLocaleString("en-US") : "—"}</div>
          <span className="gc-code">GIFT-••••-••••</span>
        </div>
        <div className="gift-notes">
          <div>🎁 <b>Delivered by email</b> minutes after payment — with a unique code only the holder knows.</div>
          <div>💳 <b>Real stored value:</b> it covers up to its full amount at checkout, and whatever&rsquo;s left stays on the card for the next stay.</div>
          <div>♾️ <b>Never expires</b>, works on any home, and can be combined with a coupon.</div>
        </div>
      </div>

      <div className="gift-form">
        <div className="gf-title">1 · Pick the amount (USD)</div>
        <div className="amounts">
          {PRESETS.map((a) => (
            <button key={a} type="button" className={`amt${!custom && amount === a ? " on" : ""}`}
              onClick={() => { setAmount(a); setCustom(""); }}>
              ${a}
            </button>
          ))}
          <input
            type="number" min={25} max={5000} placeholder="Custom…"
            value={custom} onChange={(e) => setCustom(e.target.value)}
            style={{ width: 110, borderRadius: 999, textAlign: "center", fontWeight: 700 }}
          />
        </div>

        <div className="gf-title">2 · Who gets the code?</div>
        <label>Your email <span>(receipt + a copy of the code)</span>
          <input type="email" placeholder="you@email.com" value={buyerEmail}
            onChange={(e) => setBuyerEmail(e.target.value)} />
        </label>
        <label>Send it straight to someone? <span>(optional — leave empty to keep the code yourself)</span>
          <input type="email" placeholder="friend@email.com" value={recipientEmail}
            onChange={(e) => setRecipientEmail(e.target.value)} />
        </label>
        {recipientEmail.trim() && (
          <label>A personal message <span>(goes inside their gift email)</span>
            <textarea rows={3} maxLength={400} placeholder="Happy birthday! Pick any home you love… 🌴"
              value={message} onChange={(e) => setMessage(e.target.value)} />
          </label>
        )}

        <button className="btn-rosa" onClick={() => buy("stripe")} disabled={busy}>
          {busy ? "Taking you to secure payment…" : `Buy the $${effective >= 25 ? effective.toLocaleString("en-US") : "—"} gift card`}
        </button>
        {paypal && (
          <button type="button" onClick={() => buy("paypal")} disabled={busy}
            style={{ marginTop: 8, width: "100%", border: "1.5px solid #FFC439", background: "#FFC439", color: "#003087",
                     borderRadius: 999, padding: "12px 20px", fontWeight: 800, fontSize: 15, cursor: "pointer", opacity: busy ? 0.5 : 1 }}>
            Pay with PayPal
          </button>
        )}
        {err && <div className="gf-err">{err}</div>}
        <div className="gf-fine">
          Secure payment by card (Stripe){paypal ? " or PayPal" : ""}. The code arrives by email right after
          payment — keep or forward that email; for security the code is never
          shown anywhere else.
        </div>
      </div>
    </div>
  );
}
