"use client";

/**
 * "Contact us" widget — an AI concierge chat backed by /api/chat
 * (Claude, streaming), in the demo's original mchat shell. If the AI
 * isn't configured (no API key) or errors, the widget falls back to the
 * WhatsApp handoff, so guests always have a way to reach a human.
 */

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { T } from "@/lib/i18n";

interface Msg {
  me: boolean;
  text: string;
}

export function ChatMay({ whatsapp }: { whatsapp: string }) {
  const [open, setOpen] = useState(false);
  const [log, setLog] = useState<Msg[]>([]);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [aiDown, setAiDown] = useState(false);
  const bodyRef = useRef<HTMLDivElement>(null);
  const logRef = useRef<Msg[]>([]);
  logRef.current = log;

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
  }, [log, busy]);

  function waLink(msg: string) {
    return `https://wa.me/${whatsapp}?text=${encodeURIComponent(msg)}`;
  }

  async function ask(text: string) {
    const v = text.trim();
    if (!v || busy) return;
    const base = [...logRef.current, { me: true, text: v }];
    setLog(base);
    setDraft("");
    setBusy(true);
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: base.slice(-24).map((m) => ({ role: m.me ? "user" : "assistant", content: m.text })),
        }),
      });
      const ctype = res.headers.get("content-type") ?? "";
      if (!res.ok || ctype.includes("application/json")) {
        // no API key configured, throttled, or a request error → WhatsApp
        setAiDown(true);
        setLog([...base, {
          me: false,
          text: "I can't answer automatically right now — tap “Continue on WhatsApp” below and a real person will help you in minutes. \u{1F4AC}",
        }]);
        return;
      }
      const reader = res.body?.getReader();
      if (!reader) throw new Error("no stream");
      const decoder = new TextDecoder();
      let answer = "";
      setLog([...base, { me: false, text: "…" }]);
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        answer += decoder.decode(value, { stream: true });
        setLog([...base, { me: false, text: answer }]);
      }
      if (!answer.trim()) {
        setLog([...base, { me: false, text: "Hmm, I didn't catch that — could you rephrase?" }]);
      }
    } catch {
      setAiDown(true);
      setLog([...logRef.current.filter((m) => m.text !== "…"), {
        me: false,
        text: "Something went wrong on my side — please use “Continue on WhatsApp” below and we'll help you right away.",
      }]);
    } finally {
      setBusy(false);
    }
  }

  function handoff() {
    const lines = logRef.current.filter((m) => m.me).map((m) => m.text);
    const txt = lines.length
      ? `Hi TutCasa! ${lines.join("\n")} \u{1F44B}`
      : "Hi TutCasa! I’d like some help planning my stay \u{1F44B}";
    window.open(waLink(txt), "_blank");
  }

  /** the bot cites site paths like /stays/casa-selva or prefilled
      /booking?stay=… links — make them tappable */
  function renderText(text: string) {
    const parts = text.split(/(\/(?:stays|tours|experiences|faq|policies|loyalty|contact|concierge|invite|booking)(?:\/[a-z0-9-]*)?(?:\?[a-zA-Z0-9=&%-]+)?)/g);
    return parts.map((p, i) =>
      p.startsWith("/") ? (
        <Link key={i} href={p} style={{ color: "var(--rosa)", fontWeight: 700 }} onClick={() => setOpen(false)}>
          {p}
        </Link>
      ) : (
        <span key={i}>{p}</span>
      ),
    );
  }

  return (
    <>
      <button className="wa-float" onClick={(e) => { e.stopPropagation(); setOpen((o) => !o); }}>
        &#128172; <T k="wa_title" />
      </button>
      <div className={`mchat${open ? " open" : ""}`} onClick={(e) => e.stopPropagation()}>
        <div className="mchat-head">
          <span className="av">T</span>
          <div>
            <b>TutCasa assistant</b>
            <span><span className="dot"></span> {aiDown ? "humans on WhatsApp" : "answers instantly"}</span>
          </div>
          <button className="mchat-x" onClick={() => setOpen(false)}>&times;</button>
        </div>
        <div className="mchat-body" ref={bodyRef}>
          <div className="mchat-bubble">
            Hi! &#128075; Ask me anything &mdash; our homes, prices, tours, transfers,
            or how booking works. For anything personal I&rsquo;ll hand you to a real
            person on WhatsApp.
          </div>
          {log.length === 0 && (
            <div className="mchat-quick">
              <button onClick={() => ask("Help me pick a home — what do you have?")}>Find me a home</button>
              <button onClick={() => ask("How does booking and payment work?")}>How booking works</button>
              <button onClick={() => ask("What tours and parks can I book?")}>Tours &amp; parks</button>
            </div>
          )}
          {log.map((m, i) => (
            <div key={i} className={`mchat-bubble${m.me ? " me" : ""}`}>
              {m.me ? m.text : renderText(m.text)}
            </div>
          ))}
          {busy && log[log.length - 1]?.me && <div className="mchat-bubble">typing&hellip;</div>}
        </div>
        <div className="mchat-foot">
          <input
            className="mchat-input"
            placeholder="Type your question…"
            value={draft}
            disabled={busy}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") void ask(draft); }}
          />
          <button className="mchat-send alt" disabled={busy} onClick={() => void ask(draft)}>
            &#10148; {busy ? "Thinking…" : "Send"}
          </button>
          <button className="mchat-send" onClick={handoff}>&#9990; Continue on WhatsApp</button>
        </div>
      </div>
    </>
  );
}
