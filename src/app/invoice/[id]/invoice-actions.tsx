"use client";

import { useState } from "react";
import { emailInvoiceAction } from "./send-action";

/** Print (browser → save as PDF) + send-the-invoice-itself by email. */
export function InvoiceActions({ bookingId, defaultEmail }: { bookingId: string; defaultEmail: string }) {
  const [email, setEmail] = useState(defaultEmail);
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  return (
    <div className="mt-6 border-t border-line pt-4 print:hidden">
      <div className="flex flex-wrap items-end gap-2">
        <div className="flex flex-col gap-1">
          <div className="flex gap-2">
            <button
              onClick={() => window.print()}
              className="rounded-pill bg-rosa px-5 py-2.5 text-sm font-bold text-white"
            >
              ⬇ Download PDF
            </button>
            <button
              onClick={() => window.print()}
              className="rounded-pill border-[1.5px] border-line px-5 py-2.5 text-sm font-bold hover:border-rosa"
            >
              🖨 Print
            </button>
          </div>
          <span className="text-xs text-grey">PDF: pick “Save as PDF” as the destination in the dialog.</span>
        </div>
        <div className="flex grow items-end gap-2">
          <label className="grow text-xs font-bold">EMAIL THIS INVOICE TO
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-xl border-[1.5px] border-line bg-white px-3 py-2 text-sm outline-none focus:border-rosa"
            />
          </label>
          <button
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              setMsg(null);
              try {
                const res = await emailInvoiceAction(bookingId, email);
                setMsg(res.message);
              } finally {
                setBusy(false);
              }
            }}
            className="whitespace-nowrap rounded-pill border-[1.5px] border-rosa px-4 py-2 text-sm font-bold text-rosa hover:bg-rosa hover:text-white disabled:opacity-50"
          >
            {busy ? "Sending…" : "Send"}
          </button>
        </div>
      </div>
      {msg && <p className="mt-2 text-sm font-semibold text-cactus">{msg}</p>}
    </div>
  );
}
