"use client";

/** Loyalty page body ported 1:1 from the demo's Loyalty.html. */

import { useRef, useState } from "react";
import { BackBar } from "@/components/site/BackBar";

export function LoyaltyClient() {
  const [sent, setSent] = useState(false);
  const lnRef = useRef<HTMLInputElement>(null);
  const leRef = useRef<HTMLInputElement>(null);
  const fnRef = useRef<HTMLInputElement>(null);
  const feRef = useRef<HTMLInputElement>(null);
  const [lp, setLp] = useState("");
  const [fp, setFp] = useState("");

  function submit() {
    for (const r of [lnRef, leRef, fnRef, feRef]) {
      if (!r.current?.value.trim()) {
        alert("Please fill in your name & email and your friend’s name & email.");
        r.current?.focus();
        return;
      }
    }
    setSent(true);
  }

  return (
    <>
      <BackBar />
      <div className="page-hero">
        <div className="sun"></div>
        <div className="eyebrow">Friendship &amp; loyalty program</div>
        <h1>Share the love, get rewarded</h1>
        <p>Tell a friend about TutCasa and you both win. They save on their first stay, and you earn credit toward your next one &mdash; no limits, stack as many as you like.</p>
      </div>
      <div className="loy-steps">
        <div className="loy-s"><div className="num">1</div><h3>Refer a friend</h3><p>Send us your details and your friend&rsquo;s below. We&rsquo;ll send them a warm welcome and their coupon.</p></div>
        <div className="loy-s"><div className="num">2</div><div className="big">$100</div><h3>Your friend saves</h3><p>They get a <b>$100 discount coupon</b> to use on their first TutCasa booking.</p></div>
        <div className="loy-s"><div className="num">3</div><div className="big">$200</div><h3>You earn</h3><p>Once they complete a reservation, you receive a <b>$200 coupon</b> toward your next stay.</p></div>
      </div>
      <div className="loy-band">
        <div className="em">&#127881;</div>
        <div><b>No limits, fully stackable.</b><p>Refer as many friends as you like &mdash; every completed booking earns you another $200. Coupons stack on a single stay.</p></div>
      </div>
      <div className="loy-form">
        <div style={{ display: sent ? "none" : undefined }}>
          <h2>Start sharing the love</h2>
          <div className="lead">Fill in both sides and we&rsquo;ll take care of the rest.</div>
          <div className="loy-col">
            <div>
              <h4>Your details</h4>
              <div className="lf"><label>Your name *</label><input ref={lnRef} /></div>
              <div className="lf"><label>Your email *</label><input ref={leRef} type="email" /></div>
              <div className="lf"><label>Your phone</label><input type="tel" value={lp} onChange={(e) => setLp(e.target.value)} /></div>
            </div>
            <div>
              <h4>Your friend</h4>
              <div className="lf"><label>Friend&rsquo;s name *</label><input ref={fnRef} /></div>
              <div className="lf"><label>Friend&rsquo;s email *</label><input ref={feRef} type="email" /></div>
              <div className="lf"><label>Friend&rsquo;s phone</label><input type="tel" value={fp} onChange={(e) => setFp(e.target.value)} /></div>
            </div>
          </div>
          <button className="btn-rosa" style={{ width: "100%", marginTop: 8 }} onClick={submit}>Start sharing the love now &rarr;</button>
        </div>
        <div className="loy-ok" style={{ display: sent ? "block" : undefined }}>
          <div className="c">&#10003;</div>
          <h3>Love is on its way!</h3>
          <p>We&rsquo;ll email your friend their $100 coupon, and your $200 reward lands as soon as they book.</p>
        </div>
      </div>
    </>
  );
}
