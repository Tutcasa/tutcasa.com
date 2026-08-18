"use client";

/** Loyalty page body ported 1:1 from the demo's Loyalty.html. */

import { useActionState, useRef, useState } from "react";
import { BackBar } from "@/components/site/BackBar";
import { submitReferralLead } from "@/app/leads-actions";
import { createReferralAction } from "@/app/growth-actions";
import type { LoyaltyContent } from "@/modules/settings";

/** "Get your invite link" — one shareable link per referrer; friends who book
    through it get $100 off, and the referrer earns $200 per confirmed stay. */
function InviteLink() {
  const [state, action, pending] = useActionState(createReferralAction, {
    ok: true, message: "",
  });
  const [copied, setCopied] = useState(false);

  function copy() {
    if (!state.link) return;
    void navigator.clipboard?.writeText(state.link).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <div className="loy-form" style={{ marginBottom: 26 }}>
      {state.ok && state.link ? (
        <div className="loy-ok" style={{ display: "block" }}>
          <div className="c">&#128279;</div>
          <h3>Your invite link is ready!</h3>
          <p>Share it anywhere &mdash; WhatsApp, Instagram, group chats. We also emailed it to you.</p>
          <div
            style={{
              display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap",
              alignItems: "center", marginTop: 14,
            }}
          >
            <code
              style={{
                background: "#FFF3E9", borderRadius: 12, padding: "10px 16px",
                fontSize: 14, fontWeight: 700, wordBreak: "break-all",
              }}
            >
              {state.link}
            </code>
            <button className="btn-rosa" onClick={copy}>
              {copied ? "Copied! ✓" : "Copy link"}
            </button>
          </div>
          <p style={{ marginTop: 12, fontSize: 13.5 }}>
            Every friend who books through it gets <b>$100 off</b> &mdash; and you earn{" "}
            <b>$200</b> each time a booking is confirmed. No limits.
          </p>
        </div>
      ) : (
        <>
          <h2>Get your personal invite link</h2>
          <div className="lead">
            The fastest way to share the love &mdash; one link, unlimited friends,
            $200 for you every time one of them books.
          </div>
          <form action={action}>
            <div className="loy-col">
              <div>
                <div className="lf"><label>Your name *</label><input name="name" required /></div>
              </div>
              <div>
                <div className="lf"><label>Your email *</label><input name="email" type="email" required /></div>
              </div>
            </div>
            <button className="btn-rosa" style={{ width: "100%", marginTop: 8 }} disabled={pending}>
              {pending ? "Creating your link…" : "Get my invite link →"}
            </button>
          </form>
          {!state.ok && state.message && (
            <div style={{ marginTop: 10, color: "var(--rosa)", fontWeight: 700, fontSize: 13.5 }}>
              {state.message}
            </div>
          )}
        </>
      )}
    </div>
  );
}

export function LoyaltyClient({ content: c }: { content: LoyaltyContent }) {
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
    void submitReferralLead({
      name: lnRef.current?.value ?? "", email: leRef.current?.value ?? "", phone: lp,
      friendName: fnRef.current?.value ?? "", friendEmail: feRef.current?.value ?? "", friendPhone: fp,
    });
  }

  return (
    <>
      <BackBar />
      <div className="page-hero">
        <div className="sun"></div>
        <div className="eyebrow">{c.hero.eyebrow}</div>
        <h1>{c.hero.title}</h1>
        <p>{c.hero.intro}</p>
      </div>
      <div className="loy-steps">
        <div className="loy-s"><div className="num">1</div><h3>{c.step1Title}</h3><p>{c.step1Text}</p></div>
        <div className="loy-s"><div className="num">2</div><div className="big">{c.friendAmount}</div><h3>{c.friendTitle}</h3><p>{c.friendText}</p></div>
        <div className="loy-s"><div className="num">3</div><div className="big">{c.youAmount}</div><h3>{c.youTitle}</h3><p>{c.youText}</p></div>
      </div>
      <div className="loy-band">
        <div className="em">&#127881;</div>
        <div><b>{c.bandTitle}</b><p>{c.bandText}</p></div>
      </div>
      <InviteLink />
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
