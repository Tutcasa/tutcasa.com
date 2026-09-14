"use client";

import { useActionState, useTransition } from "react";
import type { GiftCardRow } from "@/modules/giftcards";
import { createGiftCardAction, setGiftCardStatusAction, type GiftFormState } from "./actions";

const initial: GiftFormState = { ok: true, message: "" };
const inputCls =
  "w-full rounded-xl border-[1.5px] border-line bg-white px-3 py-2.5 text-sm outline-none focus:border-rosa";

const money = (c: number) => `$${Math.round(c / 100).toLocaleString("en-US")}`;

export function GiftClient({ cards }: { cards: GiftCardRow[] }) {
  const [state, action, pending] = useActionState(createGiftCardAction, initial);
  const [busy, start] = useTransition();

  return (
    <div className="grid gap-6">
      <div className="rounded-card bg-paper p-5 shadow-soft">
        <div className="mb-3 text-[11px] font-extrabold uppercase tracking-wider text-grey">Issue a gift card</div>
        <form action={action} className="grid gap-2 sm:grid-cols-[130px_1fr_1fr_auto]">
          <input name="amountUSD" type="number" min="1" step="1" required placeholder="Amount USD" className={inputCls} />
          <input name="recipientEmail" type="email" placeholder="Recipient email (optional, your note)" className={inputCls} />
          <input name="message" placeholder="Note (optional, e.g. Birthday gift from Ana)" className={inputCls} />
          <button disabled={pending}
            className="rounded-pill bg-rosa px-4 py-2 text-sm font-bold text-white disabled:opacity-50">
            {pending ? "Creating…" : "+ Create card"}
          </button>
        </form>
        {state.message && (
          <p className={`mt-2 rounded-xl p-3 text-sm font-bold ${state.ok ? "bg-cactus/10 text-cactus" : "text-rosa-deep"}`}>
            {state.message}
          </p>
        )}
      </div>

      <div className="overflow-x-auto rounded-card bg-paper shadow-soft">
        <table className="w-full min-w-[680px] text-sm">
          <thead className="border-b border-line text-left text-xs uppercase text-grey">
            <tr>
              <th className="p-3">Card</th><th className="p-3">Value</th>
              <th className="p-3">Balance left</th><th className="p-3">Note</th>
              <th className="p-3">Status</th><th className="p-3">Created</th><th className="p-3"></th>
            </tr>
          </thead>
          <tbody>
            {cards.map((c) => (
              <tr key={c.id} className={`border-b border-line/60 ${c.status === "active" ? "" : "opacity-60"}`}>
                <td className="p-3 font-mono font-bold">****{c.last4}</td>
                <td className="p-3">{money(c.initialCents)}</td>
                <td className="p-3 font-bold text-cactus">{money(c.balanceCents)}</td>
                <td className="p-3 text-xs text-grey">
                  {c.recipientEmail && <div>{c.recipientEmail}</div>}
                  {c.message && <div>{c.message}</div>}
                </td>
                <td className="p-3">
                  <span className={`rounded-pill px-2.5 py-1 text-xs font-bold ${
                    c.status === "active" ? "bg-cactus/15 text-cactus"
                    : c.status === "used" ? "bg-cielo/15 text-cielo" : "bg-grey/15 text-grey"}`}>
                    {c.status}
                  </span>
                </td>
                <td className="p-3 text-xs text-grey">{new Date(c.createdAt).toLocaleDateString()}</td>
                <td className="p-3">
                  {c.status !== "used" && (
                    <button disabled={busy}
                      onClick={() => start(() => setGiftCardStatusAction(c.id, c.status === "active" ? "disabled" : "active"))}
                      className="text-xs font-bold text-grey hover:text-ink disabled:opacity-50">
                      {c.status === "active" ? "Disable" : "Re-enable"}
                    </button>
                  )}
                </td>
              </tr>
            ))}
            {cards.length === 0 && (
              <tr><td colSpan={7} className="p-8 text-center text-grey">No gift cards yet — issue the first above.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
