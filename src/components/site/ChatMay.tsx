"use client";

/**
 * "Chat with May" widget ported 1:1 from the demo (wa-float + mchat):
 * messages collect in-page and hand off to WhatsApp prefilled.
 */

import { useEffect, useRef, useState } from "react";
import { T } from "@/lib/i18n";

export function ChatMay({ whatsapp }: { whatsapp: string }) {
  const [open, setOpen] = useState(false);
  const [log, setLog] = useState<{ me: boolean; text: string }[]>([]);
  const [draft, setDraft] = useState("");
  const bodyRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // click outside closes — guard by target since React delegates at
    // the document node (stopPropagation can't shield this listener)
    const onDoc = (e: MouseEvent) => {
      const el = e.target as Element | null;
      if (el?.closest?.(".mchat, .wa-float")) return;
      setOpen(false);
    };
    document.addEventListener("click", onDoc);
    return () => document.removeEventListener("click", onDoc);
  }, []);

  useEffect(() => {
    const b = bodyRef.current;
    if (b) b.scrollTop = b.scrollHeight;
  }, [log]);

  function waLink(msg: string) {
    return `https://wa.me/${whatsapp}?text=${encodeURIComponent(msg)}`;
  }
  function waPreset(msg: string) {
    window.open(waLink("Hi May! " + msg + " \u{1F44B}"), "_blank");
  }
  function sendInPage() {
    const v = draft.trim();
    if (!v) return;
    setLog((l) => [...l, { me: true, text: v }]);
    setDraft("");
    setTimeout(() => {
      setLog((l) => [
        ...l,
        { me: false, text: "Got it \u{1F44D} I’ll reply right here — and this is on its way to my WhatsApp too. Anything else you’d like to add?" },
      ]);
    }, 600);
  }
  function sendChat() {
    const v = draft.trim();
    const lines = log.filter((m) => m.me).map((m) => m.text);
    const txt = lines.length ? lines.join("\n") + (v ? "\n" + v : "") : v;
    window.open(
      waLink(txt ? "Hi May! " + txt + " \u{1F44B}" : "Hi May! I’d like some help planning my stay \u{1F44B}"),
      "_blank"
    );
  }

  return (
    <>
      <button className="wa-float" onClick={(e) => { e.stopPropagation(); setOpen((o) => !o); }}>
        &#9990; <T k="wa_title" />
      </button>
      <div className={`mchat${open ? " open" : ""}`} onClick={(e) => e.stopPropagation()}>
        <div className="mchat-head">
          <span className="av">M</span>
          <div>
            <b>May from TutCasa</b>
            <span><span className="dot"></span> usually replies in minutes</span>
          </div>
          <button className="mchat-x" onClick={() => setOpen(false)}>&times;</button>
        </div>
        <div className="mchat-body" ref={bodyRef}>
          <div className="mchat-bubble">
            Hi! I&rsquo;m May &#128075; Tell me what you&rsquo;re looking for and I&rsquo;ll help you plan the perfect stay &mdash; or answer anything about a booking.
          </div>
          <div className="mchat-quick">
            <button onClick={() => waPreset("I'd like help planning my stay")}>Plan my stay</button>
            <button onClick={() => waPreset("I have a question about a booking")}>Booking question</button>
            <button onClick={() => waPreset("I want to book a tour or transfer")}>Tours &amp; transfers</button>
          </div>
          {log.map((m, i) => (
            <div key={i} className={`mchat-bubble${m.me ? " me" : ""}`}>{m.text}</div>
          ))}
        </div>
        <div className="mchat-foot">
          <input
            className="mchat-input"
            placeholder="Type your message…"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") sendInPage(); }}
          />
          <button className="mchat-send alt" onClick={sendInPage}>&#10148; Send message</button>
          <button className="mchat-send" onClick={sendChat}>&#9990; Continue on WhatsApp</button>
        </div>
      </div>
    </>
  );
}
