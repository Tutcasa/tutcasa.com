"use client";

import { useState } from "react";

/**
 * The floating concierge widget, ported from the demo site: a green
 * pill that opens a mini chat. Messages collect in-page and hand off
 * to WhatsApp with the conversation prefilled.
 */
export function ChatWithMay({ whatsapp }: { whatsapp: string }) {
  const [open, setOpen] = useState(false);
  const [log, setLog] = useState<{ me: boolean; text: string }[]>([]);
  const [draft, setDraft] = useState("");

  function waHref(extra?: string): string {
    const lines = log.filter((m) => m.me).map((m) => m.text);
    if (extra) lines.push(extra);
    const msg = lines.length
      ? `Hi May! 👋 ${lines.join("\n")}`
      : "Hi May! I'd like some help planning my stay 👋";
    return `https://wa.me/${whatsapp}?text=${encodeURIComponent(msg)}`;
  }

  function send() {
    const v = draft.trim();
    if (!v) return;
    setLog((l) => [
      ...l,
      { me: true, text: v },
      { me: false, text: "Got it 👍 I'll reply right here — and this is on its way to my WhatsApp too. Anything else?" },
    ]);
    setDraft("");
  }

  const presets = ["Help me pick a casa 🏠", "Airport pickup 🚐", "Plan a tour 🌴"];

  return (
    <>
      {open && (
        <div className="fixed bottom-24 right-5 z-[75] w-[330px] max-w-[calc(100vw-40px)] overflow-hidden rounded-[20px] border border-line bg-white shadow-lift">
          <div className="flex items-center gap-3 bg-[#1EBE5D] px-4 py-3.5 text-white">
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-white/20 font-display font-bold">
              M
            </span>
            <div className="leading-tight">
              <b>May · TutCasa Concierge</b>
              <div className="text-xs opacity-90">● usually replies in minutes</div>
            </div>
            <button
              onClick={() => setOpen(false)}
              aria-label="Close chat"
              className="ml-auto text-xl leading-none opacity-80 hover:opacity-100"
            >
              ×
            </button>
          </div>

          <div className="max-h-72 space-y-2 overflow-y-auto p-3.5">
            <div className="w-fit max-w-[85%] rounded-2xl rounded-tl-sm bg-crema px-3.5 py-2.5 text-sm">
              Hola 👋 I&apos;m May! Ask me anything — homes, tours, transfers,
              or something special for your trip.
            </div>
            {log.length === 0 && (
              <div className="flex flex-wrap gap-1.5 pt-1">
                {presets.map((p) => (
                  <button
                    key={p}
                    onClick={() => { setDraft(p.replace(/ .$/, "")); }}
                    className="rounded-pill border border-line px-3 py-1.5 text-xs font-semibold hover:border-rosa hover:text-rosa"
                  >
                    {p}
                  </button>
                ))}
              </div>
            )}
            {log.map((m, i) => (
              <div
                key={i}
                className={`w-fit max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm ${
                  m.me
                    ? "ml-auto rounded-tr-sm bg-rosa text-white"
                    : "rounded-tl-sm bg-crema"
                }`}
              >
                {m.text}
              </div>
            ))}
          </div>

          <div className="flex gap-2 border-t border-line p-3">
            <input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && send()}
              placeholder="Type a message…"
              className="w-full rounded-pill border-[1.5px] border-line px-3.5 py-2 text-sm outline-none focus:border-rosa"
            />
            <button
              onClick={send}
              aria-label="Send"
              className="rounded-pill bg-rosa px-4 text-sm font-bold text-white"
            >
              ➤
            </button>
          </div>
          <a
            href={waHref()}
            target="_blank"
            rel="noopener"
            className="block bg-[#1EBE5D]/10 py-2.5 text-center text-sm font-bold text-[#149a4a] hover:bg-[#1EBE5D]/20"
          >
            Continue on WhatsApp →
          </a>
        </div>
      )}

      <button
        onClick={() => setOpen((o) => !o)}
        className="fixed bottom-5 right-5 z-[70] flex items-center gap-2.5 rounded-pill bg-[#1EBE5D] px-5 py-3.5 font-bold text-white shadow-[0_10px_26px_rgba(30,190,93,.45)]"
        aria-expanded={open}
      >
        <svg viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5" aria-hidden>
          <path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5.1-1.3A10 10 0 1 0 12 2Zm0 18.2c-1.5 0-3-.4-4.2-1.1l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1 1 12 20.2Z" />
        </svg>
        <span className="text-left leading-tight">
          Chat with May
          <small className="block text-[11px] font-normal opacity-90">
            replies in minutes
          </small>
        </span>
      </button>
    </>
  );
}
