"use client";

import { useActionState, useState, useTransition } from "react";
import { createPartnerAction, togglePartnerAction, deletePartnerAction, type AffiliateFormState } from "./actions";

export interface PartnerRow {
  id: string;
  code: string;
  name: string;
  pct: number;
  active: boolean;
  link: string;
  bookings: number;
  commissionCents: number;
}

const initial: AffiliateFormState = { ok: true, message: "" };
const inputCls =
  "rounded-xl border-[1.5px] border-line bg-white px-3 py-2.5 text-sm outline-none focus:border-rosa";

function CopyBtn({ link }: { link: string }) {
  const [ok, setOk] = useState(false);
  return (
    <button onClick={() => navigator.clipboard.writeText(link).then(() => { setOk(true); setTimeout(() => setOk(false), 1500); })}
      className="rounded-pill border-[1.5px] border-line px-3 py-1.5 text-xs font-bold text-grey hover:border-rosa hover:text-rosa" title={link}>
      {ok ? "✓ Copied!" : "Copy link"}
    </button>
  );
}

/** Paid marketing partners: their tracked link RAISES the guest's price
    by the commission % — opposite economics to the coupon-based
    affiliate links above. */
export function PartnersClient({ partners }: { partners: PartnerRow[] }) {
  const [state, action, pending] = useActionState(createPartnerAction, initial);
  const [busy, start] = useTransition();

  return (
    <div className="mt-8 grid gap-4 border-t border-line pt-6">
      <div>
        <h2 className="text-xl font-extrabold">Marketing partners (commission links)</h2>
        <p className="mt-1 text-sm text-grey">
          For influencers/agencies who bring guests: give them their tracked link.
          Anyone who arrives through it pays the nightly <b>plus the commission %</b> for
          30 days — the commission shows only in your Payments &amp; orders breakdown.
        </p>
      </div>
      <form action={action} className="flex flex-wrap items-center gap-2 rounded-card bg-paper p-4 shadow-soft">
        <input name="name" required placeholder="Partner name (e.g. Luisa M.)" className={inputCls} />
        <input name="code" required placeholder="CODE (goes in the link)" className={`${inputCls} uppercase`} />
        <input name="pct" type="number" min="0" max="100" step="0.5" required placeholder="Commission %" className={`${inputCls} w-36`} />
        <button disabled={pending}
          className="rounded-pill bg-rosa px-5 py-2.5 text-sm font-bold text-white disabled:opacity-50">
          {pending ? "Creating…" : "+ Create partner link"}
        </button>
        {state.message && (
          <span className={`w-full text-sm font-semibold ${state.ok ? "text-cactus" : "text-rosa-deep"}`}>{state.message}</span>
        )}
      </form>
      <div className="overflow-x-auto rounded-card bg-paper shadow-soft">
        <table className="w-full min-w-[720px] text-sm">
          <thead className="border-b border-line text-left text-xs uppercase text-grey">
            <tr>
              <th className="p-3">Partner</th><th className="p-3">Code</th>
              <th className="p-3">Commission</th><th className="p-3">Bookings</th>
              <th className="p-3">Commission earned</th><th className="p-3">Link</th>
              <th className="p-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {partners.map((p) => (
              <tr key={p.id} className={`border-b border-line/60 ${p.active ? "" : "opacity-50"}`}>
                <td className="p-3 font-semibold">{p.name}</td>
                <td className="p-3 font-mono font-bold">{p.code}</td>
                <td className="p-3 font-bold text-terra">{p.pct}%</td>
                <td className="p-3">{p.bookings}</td>
                <td className="p-3">${Math.round(p.commissionCents / 100).toLocaleString("en-US")}</td>
                <td className="p-3"><CopyBtn link={p.link} /></td>
                <td className="p-3">
                  <div className="flex gap-3">
                    <button disabled={busy} onClick={() => start(() => togglePartnerAction(p.id))}
                      className="text-xs font-bold text-grey hover:text-ink disabled:opacity-50">
                      {p.active ? "Turn off" : "Turn on"}
                    </button>
                    <button disabled={busy}
                      onClick={() => { if (window.confirm(`Delete partner ${p.name}? Old bookings keep their records.`)) start(() => deletePartnerAction(p.id)); }}
                      className="text-xs font-bold text-grey hover:text-rosa-deep disabled:opacity-50">
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {partners.length === 0 && (
              <tr><td colSpan={7} className="p-6 text-center text-grey">No marketing partners yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
