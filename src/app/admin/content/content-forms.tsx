"use client";

import { useActionState } from "react";
import { saveContactAction, uploadDeckAction, type ContentFormState } from "./actions";
import type { ContactSettings, InvestorSettings } from "@/modules/settings";

const initial: ContentFormState = { ok: true, message: "" };
const inputCls =
  "w-full rounded-xl border-[1.5px] border-line bg-white px-3 py-2.5 text-sm outline-none focus:border-rosa";

export function ContactForm({ contact }: { contact: ContactSettings }) {
  const [state, action, pending] = useActionState(saveContactAction, initial);
  return (
    <form action={action} className="grid gap-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="text-xs font-bold">WHATSAPP (digits only, with country code)
          <input name="whatsapp" defaultValue={contact.whatsapp} className={inputCls} />
        </label>
        <label className="text-xs font-bold">CONTACT EMAIL
          <input name="email" type="email" defaultValue={contact.email} className={inputCls} />
        </label>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="text-xs font-bold">INSTAGRAM URL
          <input name="instagram" defaultValue={contact.instagram} className={inputCls} />
        </label>
        <label className="text-xs font-bold">FACEBOOK URL
          <input name="facebook" defaultValue={contact.facebook} className={inputCls} />
        </label>
      </div>
      {state.message && (
        <p className={`text-sm font-semibold ${state.ok ? "text-cactus" : "text-rosa-deep"}`}>{state.message}</p>
      )}
      <button disabled={pending}
        className="w-fit rounded-pill bg-rosa px-6 py-2.5 text-sm font-bold text-white disabled:opacity-50">
        {pending ? "Saving…" : "Save contact info"}
      </button>
    </form>
  );
}

export function DeckForm({ investor }: { investor: InvestorSettings }) {
  const [state, action, pending] = useActionState(uploadDeckAction, initial);
  return (
    <form action={action} className="grid gap-3">
      {investor.deck_url ? (
        <p className="text-sm">
          Current deck:{" "}
          <a href={investor.deck_url} target="_blank" rel="noopener"
             className="font-semibold text-rosa hover:underline">
            {investor.deck_name || "investor-deck.pdf"} ↗
          </a>
        </p>
      ) : (
        <p className="text-sm text-grey">No deck uploaded yet.</p>
      )}
      <div className="flex flex-wrap items-center gap-2">
        <input type="file" name="deck" accept="application/pdf" required className="text-sm" />
        <button disabled={pending}
          className="rounded-pill bg-rosa px-5 py-2 text-sm font-bold text-white disabled:opacity-50">
          {pending ? "Uploading…" : investor.deck_url ? "Replace PDF" : "Upload PDF"}
        </button>
      </div>
      {state.message && (
        <p className={`text-sm font-semibold ${state.ok ? "text-cactus" : "text-rosa-deep"}`}>{state.message}</p>
      )}
      <p className="text-xs text-grey">
        Uploading a new PDF replaces the old one — the &ldquo;Request investor
        deck&rdquo; flow always serves the latest file.
      </p>
    </form>
  );
}
