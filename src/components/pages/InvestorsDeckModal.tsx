"use client";

/** Investors page deck-request modal + CTA buttons (demo Investors.html). */

import { useEffect, useState } from "react";

export function DeckButton({ label }: { label: string }) {
  return (
    <button className="btn btn-rosa" onClick={() => window.dispatchEvent(new Event("tc-deck-open"))}>
      {label}
    </button>
  );
}

export function DeckModal() {
  const [open, setOpen] = useState(false);
  const [sent, setSent] = useState(false);
  const [err, setErr] = useState(false);
  const [f, setF] = useState({ name: "", company: "", industry: "", position: "", email: "", msg: "" });

  useEffect(() => {
    const onOpen = () => { setSent(false); setErr(false); setOpen(true); };
    window.addEventListener("tc-deck-open", onOpen);
    return () => window.removeEventListener("tc-deck-open", onOpen);
  }, []);

  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setF((s) => ({ ...s, [k]: e.target.value }));

  function send() {
    const ok = f.name.trim() && /.+@.+\..+/.test(f.email.trim());
    if (!ok) { setErr(true); return; }
    setSent(true);
  }

  return (
    <div className={`au-ov${open ? " open" : ""}`} onClick={(e) => { if (e.target === e.currentTarget) setOpen(false); }}>
      <div className="au-modal" style={{ maxWidth: 460 }}>
        <button className="au-x" onClick={() => setOpen(false)}>&times;</button>
        <div className="au-head">
          <h2>Request the investor deck</h2>
          <p>Tell us a little about you and we&rsquo;ll send the deck to your inbox.</p>
        </div>
        <div className="au-body">
          <div className={`au-step${!sent ? " on" : ""}`}>
            <div className="gc-two" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div className="au-field"><label>Full name *</label><input placeholder="Your name" value={f.name} onChange={set("name")} /></div>
              <div className="au-field"><label>Company name</label><input placeholder="Your company" value={f.company} onChange={set("company")} /></div>
            </div>
            <div className="gc-two" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div className="au-field"><label>Industry</label><input placeholder="e.g. Venture capital" value={f.industry} onChange={set("industry")} /></div>
              <div className="au-field"><label>Position</label><input placeholder="e.g. Partner" value={f.position} onChange={set("position")} /></div>
            </div>
            <div className="au-field"><label>Email *</label><input type="email" placeholder="you@email.com" value={f.email} onChange={set("email")} /></div>
            <div className="au-field"><label>Message</label>
              <textarea rows={3} style={{ width: "100%", border: "1.5px solid var(--line)", borderRadius: 11, padding: "11px 13px", fontFamily: "'Outfit'", fontSize: 14, outline: "none" }}
                placeholder="Anything you’d like us to know?" value={f.msg} onChange={set("msg")}></textarea>
            </div>
            <div style={{ display: err ? "block" : "none", color: "var(--rosa)", fontSize: "12.5px", fontWeight: 700, marginBottom: 8 }}>
              Please add your name and a valid email.
            </div>
            <button className="au-primary" onClick={send}>Send request</button>
            <div className="au-note">We respect your privacy. Detailed materials are shared with qualified investors, subject to confidentiality where applicable.</div>
          </div>
          <div className={`au-step${sent ? " on" : ""}`}>
            <div className="au-ok">
              <div className="c">&#10003;</div>
              <h2 style={{ fontSize: 22, fontWeight: 800 }}>Request received!</h2>
              <p style={{ color: "var(--grey)", marginTop: 8 }}>Thank you &mdash; our team will review your request and send the investor deck shortly.</p>
            </div>
            <button className="au-primary" onClick={() => setOpen(false)}>Done</button>
          </div>
        </div>
      </div>
    </div>
  );
}
