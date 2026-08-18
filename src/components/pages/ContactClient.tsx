"use client";

/** Contact page body ported 1:1 from the demo's Contact.html. */

import { useState } from "react";
import { BackBar } from "@/components/site/BackBar";
import { submitContactLead } from "@/app/leads-actions";

export function ContactClient({ whatsapp, email }: { whatsapp: string; email: string }) {
  const [sent, setSent] = useState(false);
  const [name, setName] = useState("");
  const [mail, setMail] = useState("");
  const [phone, setPhone] = useState("");
  const [subj, setSubj] = useState("A booking or reservation");
  const [msg, setMsg] = useState("");

  async function submit() {
    if (!name.trim() || !mail.trim() || !msg.trim()) {
      alert("Please add your name, email and a short message.");
      return;
    }
    setSent(true); // demo-style instant confirmation; the save is fire-and-forget
    void submitContactLead({ name, email: mail, phone, message: `[${subj}] ${msg}` });
  }

  const contactEmail = email || "hello@tutcasa.com";

  return (
    <>
      <BackBar />
      <div className="page-hero">
        <div className="sun"></div>
        <div className="eyebrow">We&rsquo;d love to hear from you</div>
        <h1>Contact us</h1>
        <p>Questions about a home, a booking, or listing your own property? Send us a note &mdash; or skip the form and message May on WhatsApp for the fastest reply.</p>
      </div>
      <div className="ct-grid">
        <div className="ct-card">
          <div style={{ display: sent ? "none" : undefined }}>
            <div className="ct-two">
              <div className="ct-fld"><label>Your name</label><input placeholder="Maria Lopez" value={name} onChange={(e) => setName(e.target.value)} /></div>
              <div className="ct-fld"><label>Email</label><input type="email" placeholder="you@email.com" value={mail} onChange={(e) => setMail(e.target.value)} /></div>
            </div>
            <div className="ct-two">
              <div className="ct-fld"><label>Phone (optional)</label><input type="tel" placeholder="+52 55 1234 5678" value={phone} onChange={(e) => setPhone(e.target.value)} /></div>
              <div className="ct-fld"><label>Subject</label>
                <select value={subj} onChange={(e) => setSubj(e.target.value)}>
                  <option>A booking or reservation</option>
                  <option>A specific home</option>
                  <option>Tours &amp; transfers</option>
                  <option>Listing my property</option>
                  <option>Something else</option>
                </select>
              </div>
            </div>
            <div className="ct-fld"><label>Message</label><textarea placeholder="Tell us how we can help…" value={msg} onChange={(e) => setMsg(e.target.value)}></textarea></div>
            <button className="btn-rosa" style={{ width: "100%" }} onClick={submit}>Send message</button>
          </div>
          <div className="ct-ok" style={{ display: sent ? "block" : undefined }}>
            <div className="c">&#10003;</div>
            <h3>Message sent!</h3>
            <p>Thanks for reaching out &mdash; we&rsquo;ll reply by email shortly, usually within a few hours.</p>
          </div>
        </div>
        <div className="ct-card ct-info">
          <h3>Reach us directly</h3>
          <a className="ct-item" href={`https://wa.me/${whatsapp}`} target="_blank" rel="noopener">
            <div className="ic">&#128241;</div><div><b>WhatsApp</b><span>Chat with May &mdash; replies in minutes</span></div>
          </a>
          <a className="ct-item" href={`mailto:${contactEmail}`}>
            <div className="ic">&#9993;&#65039;</div><div><b>Email</b><span>{contactEmail}</span></div>
          </a>
          <div className="ct-item">
            <div className="ic">&#128205;</div><div><b>Where we host</b><span>Playa del Carmen &amp; the Riviera Maya, Mexico &middot; Egypt &middot; Florida</span></div>
          </div>
          <a className="ct-item" href="https://www.instagram.com/tutcasa/" target="_blank" rel="noopener">
            <div className="ic">&#128248;</div><div><b>Follow along</b><span>@tutcasa on Instagram &amp; Facebook</span></div>
          </a>
        </div>
      </div>
    </>
  );
}
