"use client";

/**
 * Checkout ported 1:1 from the demo's checkout.html (order summary +
 * Stripe-preview payment card + confirmation screen), with one addition
 * the demo lacked: an email field, required to create the REAL booking
 * hold / tour booking server-side. Card fields remain preview-only
 * exactly like the demo — no charge is taken (Stripe connects later).
 */

import { useEffect, useState } from "react";
import Link from "next/link";
import { BackBar } from "@/components/site/BackBar";
import { reserveAction, validateCouponAction } from "@/app/stays/[slug]/actions";
import { reserveTourAction } from "@/app/tours/[slug]/actions";
import { useCurrency } from "@/lib/currency";

export interface CheckoutLine {
  n: string;
  m: string;
  a: number; // display units (whole USD or MXN)
}

export type CheckoutPayload =
  | { kind: "stay"; slug: string; ci: string; co: string; guests: number }
  | { kind: "tour"; slug: string; date: string; groupSize: number; addons?: string[]; notes?: string }
  | { kind: "none" }; // demo-style preview confirm (acts-only carts)

/** Deposit split + security-deposit info, display units. */
export interface CheckoutSchedule {
  dueNow: number;
  balance: number;
  balanceBy?: string; // YYYY-MM-DD
  securityDeposit?: number;
}

const money = (n: number) => Number(n).toLocaleString("en-US");

const ERRORS: Record<string, string> = {
  DATES_TAKEN: "Those dates were just booked by another guest — pick different dates.",
  INVALID_DATES: "Please choose a valid date range.",
  MIN_STAY_NOT_MET: "This home has a minimum stay — extend your dates.",
  TOO_MANY_GUESTS: "That's more guests than this home sleeps.",
  LISTING_NOT_FOUND: "This home is no longer available.",
  INVALID_CONTACT: "Please add the name on card and a valid email.",
  UNAVAILABLE: "Some of those nights are already booked.",
  COUPON_INVALID: "That coupon can't be used for this booking (it may be tied to another email, home, or already used) — remove it or fix it, then try again.",
  TOUR_NOT_FOUND: "This tour is no longer available.",
  INVALID_DATE: "Please pick a valid tour date.",
  INVALID_GROUP: "Group size must be between 1 and 6.",
  ON_REQUEST: "This tour is arranged personally — message May to book it.",
};

export function CheckoutClient({
  lines,
  currency,
  dates,
  payload,
  schedule,
}: {
  lines: CheckoutLine[];
  currency: "USD" | "MXN";
  dates?: string;
  payload: CheckoutPayload;
  schedule?: CheckoutSchedule;
}) {
  const [guestName, setGuestName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [ccName, setCcName] = useState("");
  const [ccNum, setCcNum] = useState("");
  const [ccExp, setCcExp] = useState("");
  const [ccCvc, setCcCvc] = useState("");
  const [country, setCountry] = useState("Mexico");
  const [promo, setPromo] = useState("");
  const [promoMsg, setPromoMsg] = useState(false);
  const [coupon, setCoupon] = useState<{ code: string; discount: number } | null>(null);
  const [couponErr, setCouponErr] = useState<string | null>(null);
  const [checkingCoupon, setCheckingCoupon] = useState(false);
  const [paying, setPaying] = useState(false);
  const [paid, setPaid] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // a saved referral coupon (from an /invite/CODE link) fills in automatically
  useEffect(() => {
    try {
      const saved = localStorage.getItem("tc_ref_coupon");
      // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time read of an external store (localStorage) on mount
      if (saved && payload.kind === "stay") setPromo((p) => p || saved);
    } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const { cur: displayCur, fromUSD, fromMXN } = useCurrency();
  const totalBefore = lines.reduce((a, l) => a + (Number(l.a) || 0), 0);
  const discount = Math.min(coupon?.discount ?? 0, totalBefore);
  const total = totalBefore - discount;
  const cur = currency;

  async function applyCoupon() {
    setCouponErr(null);
    if (!promo.trim()) return;
    if (payload.kind !== "stay") { setPromoMsg(true); return; } // demo behavior for non-stay carts
    setCheckingCoupon(true);
    try {
      const res = await validateCouponAction(promo, payload.slug, payload.ci, payload.co, payload.guests, email.trim() || undefined);
      if (res.ok) { setCoupon({ code: res.code, discount: res.discount }); setPromoMsg(false); }
      else { setCoupon(null); setCouponErr(res.message); }
    } finally {
      setCheckingCoupon(false);
    }
  }

  function fmtCard(v: string) {
    const d = v.replace(/[^0-9]/g, "").slice(0, 16);
    let out = "";
    for (let i = 0; i < d.length; i++) { if (i > 0 && i % 4 === 0) out += " "; out += d[i]; }
    return out;
  }
  function fmtExp(v: string) {
    const d = v.replace(/[^0-9]/g, "").slice(0, 4);
    return d.length >= 3 ? d.slice(0, 2) + " / " + d.slice(2) : d;
  }

  async function pay() {
    setError(null);
    if (payload.kind === "none") { setPaid(true); window.scrollTo(0, 0); return; }
    const name = guestName.trim() || ccName.trim();
    const okEmail = /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email.trim());
    if (!name || !okEmail) { setError(ERRORS.INVALID_CONTACT); return; }
    if (!phone.trim()) { setError("Please add your phone number with country code."); return; }
    setPaying(true);
    try {
      const res =
        payload.kind === "stay"
          ? await reserveAction({
              listingSlug: payload.slug, checkIn: payload.ci, checkOut: payload.co,
              guests: payload.guests, guestName: name, guestEmail: email.trim(),
              guestPhone: phone.trim() || undefined,
              couponCode: coupon?.code,
            })
          : await reserveTourAction({
              tourSlug: payload.slug, tourDate: payload.date, groupSize: payload.groupSize,
              guestName: name, guestEmail: email.trim(), guestPhone: phone.trim() || undefined,
              addons: payload.addons, notes: payload.notes,
            });
      if (res.ok) { setPaid(true); window.scrollTo(0, 0); }
      else setError(ERRORS[res.error] ?? "Something went wrong — please try again.");
    } finally {
      setPaying(false);
    }
  }

  const empty = lines.length === 0;

  return (
    <>
      <BackBar />
      <div className="page-hero" style={{ padding: "26px 0 2px", display: paid ? "none" : undefined }}>
        <div className="sun"></div>
        <div className="eyebrow">Secure checkout</div>
        <h1>Review &amp; pay</h1>
      </div>
      <div className="co-wrap">
        <div className="co-empty" style={{ display: empty && !paid ? "block" : "none" }}>
          <div className="em">&#128717;&#65039;</div><h2>Your cart is empty</h2>
          <p>Add a tour or an experience and it&rsquo;ll show up here, ready to book.</p>
          <Link className="btn-rosa" href="/tours">Browse tours &amp; parks</Link>
        </div>
        <div className="co-grid" style={{ display: empty || paid ? "none" : undefined }}>
          <div className="co-card">
            <h3>Order summary</h3>
            <div className="co-sub">You can adjust anything with us on WhatsApp before you pay.</div>
            {dates && <div className="co-dates" style={{ display: "block" }}>&#128197; <b>Dates:</b> <span>{dates}</span></div>}
            <div>
              {lines.map((it, i) => (
                <div className="co-line" key={i}>
                  <div><div className="co-n">{it.n}</div><div className="co-m">{it.m || ""}</div></div>
                  <div className="co-a">${money(it.a)} {cur}</div>
                </div>
              ))}
            </div>
            <div className="co-promo">
              <input placeholder="Coupon code" value={promo} onChange={(e) => setPromo(e.target.value)} />
              <button onClick={applyCoupon} disabled={checkingCoupon}>{checkingCoupon ? "Checking…" : "Apply"}</button>
            </div>
            <div style={{ fontSize: "12.5px", color: "var(--cactus)", display: promoMsg ? "block" : "none", marginBottom: 8 }}>
              Coupon saved &mdash; we&rsquo;ll validate it before charging.
            </div>
            {couponErr && (
              <div style={{ fontSize: "12.5px", color: "var(--rosa)", fontWeight: 700, marginBottom: 8 }}>{couponErr}</div>
            )}
            {coupon && (
              <div className="co-row" style={{ color: "var(--cactus)", fontWeight: 700 }}>
                <span>Coupon {coupon.code}</span><span>&minus;${money(discount)} {cur}</span>
              </div>
            )}
            <div className="co-row"><span>Subtotal</span><span>${money(totalBefore)} {cur}</span></div>
            <div className="co-row big"><span>Total</span><span>${money(total)} {cur}</span></div>
            {cur === "MXN" && displayCur === "USD" && <div className="co-usd">&#8776; {fromMXN(total)}</div>}
            {displayCur !== cur && !(cur === "MXN" && displayCur === "USD") && (
              <div className="co-usd">&#8776; {cur === "USD" ? fromUSD(total) : fromMXN(total)}</div>
            )}
            {schedule && schedule.balance > 0 && (
              <>
                <div className="co-row" style={{ color: "var(--cactus)", fontWeight: 700 }}>
                  <span>Due today</span><span>${money(Math.max(0, schedule.dueNow - discount))} {cur}</span>
                </div>
                <div className="co-row">
                  <span>Balance{schedule.balanceBy ? ` — due by ${schedule.balanceBy}` : ""}</span>
                  {/* balance = discounted total minus what's due today */}
                  <span>${money(Math.max(0, total - Math.max(0, schedule.dueNow - discount)))} {cur}</span>
                </div>
              </>
            )}
            {schedule?.securityDeposit ? (
              <div style={{ fontSize: "12.5px", color: "var(--grey, #8a7a72)", marginTop: 6 }}>
                + ${money(schedule.securityDeposit)} {cur} security deposit.
              </div>
            ) : null}
          </div>
          <div className="co-card">
            <h3>Payment</h3>
            <div className="co-sub">Card details are handled by Stripe. TutCasa never sees your card number.</div>
            <div className="co-fld"><label>Guest full name</label><input placeholder="Maria Lopez" value={guestName} onChange={(e) => setGuestName(e.target.value)} /></div>
            <div className="co-fld"><label>Email for confirmation</label><input type="email" placeholder="you@email.com" value={email} onChange={(e) => setEmail(e.target.value)} /></div>
            <div className="co-fld"><label>Phone / WhatsApp (with country code)</label><input type="tel" placeholder="+52 984 123 4567" value={phone} onChange={(e) => setPhone(e.target.value)} /></div>
            <div className="co-fld"><label>Name on card</label><input placeholder="MARIA LOPEZ" value={ccName} onChange={(e) => setCcName(e.target.value)} /></div>
            <div className="co-fld"><label>Card number</label><input inputMode="numeric" placeholder="1234 1234 1234 1234" value={ccNum} onChange={(e) => setCcNum(fmtCard(e.target.value))} /></div>
            <div className="co-two">
              <div className="co-fld"><label>Expiry</label><input inputMode="numeric" placeholder="MM / YY" value={ccExp} onChange={(e) => setCcExp(fmtExp(e.target.value))} /></div>
              <div className="co-fld"><label>CVC</label><input inputMode="numeric" placeholder="123" value={ccCvc} onChange={(e) => setCcCvc(e.target.value.replace(/[^0-9]/g, "").slice(0, 4))} /></div>
            </div>
            <div className="co-fld"><label>Country</label>
              <select value={country} onChange={(e) => setCountry(e.target.value)}>
                <option>Mexico</option><option>United States</option><option>Canada</option><option>Egypt</option><option>United Kingdom</option><option>France</option>
              </select>
            </div>
            {error && (
              <div style={{ color: "var(--rosa)", fontSize: "13px", fontWeight: 700, marginBottom: 10 }}>{error}</div>
            )}
            <button className="co-pay" onClick={pay} disabled={paying}>
              <span>
                {paying
                  ? "Holding your dates…"
                  : `Reserve — $${money(schedule && schedule.balance > 0 ? Math.max(0, schedule.dueNow - discount) : total)} ${cur} due${schedule && schedule.balance > 0 ? " now" : ""}`}
              </span>
            </button>
            <div className="co-stripe">&#128274; <span>Secured by</span> <b style={{ color: "#635BFF" }}>Stripe</b></div>
            <div className="co-note">Preview mode: this shows the full checkout flow. The live Stripe charge is switched on at the backend step &mdash; no real payment is taken here.</div>
          </div>
        </div>
        <div className="paid" style={{ display: paid ? "block" : "none" }}>
          <div className="c">&#10003;</div><h2>Booking request received!</h2>
          <p>
            Thank you &mdash; your dates are on hold and a confirmation email is on
            its way. <b>No payment has been taken yet</b>: our team will confirm your
            booking and send a secure payment link for the amount due.
          </p>
          <div className="amt">Total to pay: ${money(total)} {cur}</div>
          <Link className="btn-rosa" href="/">Back to home</Link>
        </div>
      </div>
    </>
  );
}
