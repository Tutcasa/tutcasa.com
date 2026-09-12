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
import { startPaymentAction, createPaymentIntentAction } from "@/app/invoice/[id]/pay-actions";
import { StripePayForm, publishableKeyMode, type PayIntent } from "./StripePayForm";
import { submitPlanRequest } from "@/app/leads-actions";
import { reserveTourAction, validateTourCouponAction } from "@/app/tours/[slug]/actions";
import { useCurrency } from "@/lib/currency";

export interface CheckoutLine {
  n: string;
  m: string;
  a: number; // display units (whole USD or MXN)
}

export type CheckoutPayload =
  | { kind: "stay"; slug: string; ci: string; co: string; guests: number; addonIds?: string[] }
  | { kind: "tour"; slug: string; date: string; groupSize: number; addons?: string[]; notes?: string }
  | { kind: "plan"; acts: string[]; people: number; dates?: string } // build-your-own request
  | { kind: "none" }; // demo-style preview confirm

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
  INVALID_CONTACT: "Please add your name and a valid email.",
  UNAVAILABLE: "Some of those nights are already booked.",
  COUPON_INVALID: "That coupon can't be used for this booking (it may be tied to another email, home, or already used) — remove it or fix it, then try again.",
  TOUR_NOT_FOUND: "This tour is no longer available.",
  INVALID_DATE: "Please pick a valid tour date.",
  INVALID_GROUP: "That group size isn&rsquo;t available for this tour — adjust the number of people.".replace("&rsquo;", "’"),
  ON_REQUEST: "This tour is arranged personally — contact us to book it.",
};

export function CheckoutClient({
  lines,
  currency,
  dates,
  payload,
  schedule,
  requestToBook = false,
}: {
  lines: CheckoutLine[];
  currency: "USD" | "MXN";
  dates?: string;
  payload: CheckoutPayload;
  schedule?: CheckoutSchedule;
  /** request-to-book home: collect a request, show NO payment step */
  requestToBook?: boolean;
}) {
  const [guestName, setGuestName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [promo, setPromo] = useState("");
  const [promoMsg, setPromoMsg] = useState(false);
  const [coupon, setCoupon] = useState<{ code: string; discount: number } | null>(null);
  const [couponErr, setCouponErr] = useState<string | null>(null);
  const [checkingCoupon, setCheckingCoupon] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const [paying, setPaying] = useState(false);
  const [paid, setPaid] = useState(false);
  const [paidNow, setPaidNow] = useState(false); // card charged on-page
  const [intent, setIntent] = useState<PayIntent | null>(null);
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
  const cur = currency;
  /** every quoted number renders in the DISPLAY currency (USD by default,
      the picker switches it); the charge stays in the cart's native
      currency and is shown once, honestly, under the total */
  const show = (a: number) => (cur === "MXN" ? fromMXN(a) : fromUSD(a));
  const totalBefore = lines.reduce((a, l) => a + (Number(l.a) || 0), 0);
  const discount = Math.min(coupon?.discount ?? 0, totalBefore);
  const total = totalBefore - discount;

  async function applyCoupon() {
    setCouponErr(null);
    if (!promo.trim()) return;
    if (payload.kind !== "stay" && payload.kind !== "tour") { setPromoMsg(true); return; }
    setCheckingCoupon(true);
    try {
      const res = payload.kind === "stay"
        ? await validateCouponAction(promo, payload.slug, payload.ci, payload.co, payload.guests, email.trim() || undefined)
        : await validateTourCouponAction(promo, payload.slug, payload.groupSize, payload.addons, email.trim() || undefined);
      if (res.ok && res.code != null) { setCoupon({ code: res.code, discount: res.discount ?? 0 }); setPromoMsg(false); }
      else { setCoupon(null); setCouponErr((res as { message?: string }).message ?? "That coupon can\u2019t be used here."); }
    } finally {
      setCheckingCoupon(false);
    }
  }

  async function pay() {
    setError(null);
    if (payload.kind === "none") {
      if (!agreed) { setError("Please read and agree to TutCasa's terms and conditions first."); return; }
      setPaid(true); window.scrollTo(0, 0); return;
    }
    if (payload.kind === "plan") {
      const nm = guestName.trim();
      const okMail = /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email.trim());
      if (!nm || !okMail) { setError("Please add your name and a valid email."); return; }
      if (!phone.trim()) { setError("Please add your phone number with country code."); return; }
      if (!agreed) { setError("Please read and agree to TutCasa's terms and conditions first."); return; }
      setPaying(true);
      try {
        const r = await submitPlanRequest({
          name: nm, email: email.trim(), phone: phone.trim(),
          activities: payload.acts, people: payload.people, dates: payload.dates,
          totalLabel: `${money(total)} ${cur}`,
        });
        if (r.ok) { setPaid(true); window.scrollTo(0, 0); }
        else setError("Something went wrong — please try again.");
      } finally {
        setPaying(false);
      }
      return;
    }
    const name = guestName.trim();
    const okEmail = /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email.trim());
    if (!name || !okEmail) { setError(ERRORS.INVALID_CONTACT); return; }
    if (!phone.trim()) { setError("Please add your phone number with country code."); return; }
    if (!agreed) { setError("Please read and agree to TutCasa's terms and conditions first."); return; }
    setPaying(true);
    try {
      const res =
        payload.kind === "stay"
          ? await reserveAction({
              listingSlug: payload.slug, checkIn: payload.ci, checkOut: payload.co,
              guests: payload.guests, guestName: name, guestEmail: email.trim(),
              guestPhone: phone.trim() || undefined,
              couponCode: coupon?.code,
              addonIds: payload.addonIds,
            })
          : await reserveTourAction({
              tourSlug: payload.slug, tourDate: payload.date, groupSize: payload.groupSize,
              guestName: name, guestEmail: email.trim(), guestPhone: phone.trim() || undefined,
              addons: payload.addons, notes: payload.notes,
              couponCode: coupon?.code,
            });
      if (res.ok) {
        // instant stays AND instant (Amanah) tours pay ON THIS PAGE
        // (Payment Element); if the publishable key can't drive the
        // embedded form we fall back to Stripe's hosted page. Requests
        // (request-to-book stays + our own tours) keep the review flow:
        // nothing charged, payment link comes after acceptance.
        const goesToStripe = payload.kind === "tour"
          ? ("instant" in res && res.instant)
          : !requestToBook;
        if (goesToStripe && "bookingId" in res && res.bookingId) {
          const pi = await createPaymentIntentAction(res.bookingId);
          if (pi.clientSecret && pi.mode && publishableKeyMode() === pi.mode) {
            setIntent({
              clientSecret: pi.clientSecret,
              amountCents: pi.amountCents ?? 0,
              currency: pi.currency ?? cur,
              invoiceId: res.bookingId,
            });
            window.scrollTo(0, 0);
            return;
          }
          if (!pi.offline) {
            const pay = await startPaymentAction(res.bookingId);
            if (pay.url) { window.location.href = pay.url; return; }
          }
        }
        setPaid(true); window.scrollTo(0, 0);
      }
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
        <div className="eyebrow">{requestToBook ? "Booking request" : "Secure checkout"}</div>
        <h1>{requestToBook ? "Review & request" : "Review & pay"}</h1>
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
                  <div className="co-a">{show(it.a)}</div>
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
                <span>Coupon {coupon.code}</span><span>&minus;{show(discount)}</span>
              </div>
            )}
            <div className="co-row"><span>Subtotal</span><span>{show(totalBefore)}</span></div>
            <div className="co-row big"><span>Total</span><span>{show(total)}</span></div>
            {displayCur !== cur && (
              <div className="co-usd">Charged in {cur}: ${money(total)} {cur}</div>
            )}
            {schedule && schedule.balance > 0 && (
              <>
                <div className="co-row" style={{ color: "var(--cactus)", fontWeight: 700 }}>
                  <span>{requestToBook ? "Due once approved" : "Due today"}</span><span>{show(total - Math.max(0, schedule.balance - discount))}</span>
                </div>
                <div className="co-row">
                  <span>Balance{schedule.balanceBy ? ` — due by ${schedule.balanceBy}` : ""}</span>
                  {/* balance = discounted total minus what's due today */}
                  <span>{show(Math.max(0, schedule.balance - discount))}</span>
                </div>
              </>
            )}
          </div>
          <div className="co-card">
            <h3>{requestToBook ? "Your details" : intent ? "Pay securely" : "Payment"}</h3>
            <div className="co-sub">
              {requestToBook
                ? "No payment now — the owner reviews your request first. You'll get a secure payment link once it's approved."
                : intent
                  ? "Your dates are held — complete the payment to confirm the booking."
                  : "Card details are handled by Stripe. TutCasa never sees your card number."}
            </div>
            {intent ? (
              <StripePayForm intent={intent} onPaid={() => { setPaidNow(true); setPaid(true); window.scrollTo(0, 0); }} />
            ) : (<>
            <div className="co-fld"><label>Guest full name</label><input placeholder="Maria Lopez" value={guestName} onChange={(e) => setGuestName(e.target.value)} /></div>
            <div className="co-fld"><label>Email for confirmation</label><input type="email" placeholder="you@email.com" value={email} onChange={(e) => setEmail(e.target.value)} /></div>
            <div className="co-fld"><label>Phone / WhatsApp (with country code)</label><input type="tel" placeholder="+52 984 123 4567" value={phone} onChange={(e) => setPhone(e.target.value)} /></div>

            <label style={{ display: "flex", gap: 8, alignItems: "flex-start", fontSize: "13px", margin: "4px 0 10px", cursor: "pointer" }}>
              <input type="checkbox" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} style={{ marginTop: 2 }} />
              <span>
                I have read and agree to TutCasa&rsquo;s{" "}
                <Link href="/policies" target="_blank" style={{ color: "var(--rosa)", fontWeight: 700 }}>
                  terms &amp; conditions
                </Link>.
              </span>
            </label>
            {error && (
              <div style={{ color: "var(--rosa)", fontSize: "13px", fontWeight: 700, marginBottom: 10 }}>{error}</div>
            )}
            <button className="co-pay" onClick={pay} disabled={paying}>
              <span>
                {paying
                  ? (requestToBook ? "Sending your request…" : "Holding your dates…")
                  : requestToBook
                    ? "Send booking request — no charge now"
                    : `Continue to payment — ${show(schedule && schedule.balance > 0 ? total - Math.max(0, schedule.balance - discount) : total)} due${schedule && schedule.balance > 0 ? " now" : ""}`}
              </span>
            </button>
            {!requestToBook && (
              <div className="co-stripe">&#128274; <span>Payments secured by</span> <b style={{ color: "#635BFF" }}>Stripe</b></div>
            )}
            </>)}
          </div>
        </div>
        <div className="paid" style={{ display: paid ? "block" : "none" }}>
          <div className="c">&#10003;</div>
          <h2>{paidNow ? "Paid & confirmed! 🎉" : payload.kind === "plan" ? "Plan request received!" : requestToBook ? "Booking request sent!" : "Booking request received!"}</h2>
          {paidNow ? (
            <p>
              Your payment went through and the booking is <b>confirmed</b> —
              the receipt and confirmation email are on their way to your inbox.
              ¡Nos vemos pronto! 🌴
            </p>
          ) : payload.kind === "plan" ? (
            <p>
              Thank you &mdash; we got your custom plan and we&rsquo;ll come back
              within 24 hours with your exact quote. <b>Nothing is charged</b> until
              you approve it.
            </p>
          ) : requestToBook ? (
            <p>
              Thank you &mdash; your request is now <b>under review by the owner</b> and
              a confirmation email of your request is on its way to your inbox.
              <b> Nothing has been charged.</b> As soon as the owner approves it,
              you&rsquo;ll receive an email with your secure payment link.
            </p>
          ) : (
            <p>
              Thank you &mdash; your dates are on hold and a confirmation email is on
              its way. <b>No payment has been taken yet</b>: our team will confirm your
              booking and send a secure payment link for the amount due.
            </p>
          )}
          <div className="amt">Total to pay: {show(total)}{displayCur !== cur ? ` (charged in ${cur}: $${money(total)} ${cur})` : ""}</div>
          <Link className="btn-rosa" href="/">Back to home</Link>
        </div>
      </div>
    </>
  );
}
