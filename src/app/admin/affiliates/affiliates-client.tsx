"use client";

import { useActionState, useState } from "react";
import { createAffiliateAction, type AffiliateFormState } from "./actions";

export interface AffiliateRow {
  id: string;
  code: string;
  name: string;
  email: string;
  link: string;
  bookings: number;
  discountCents: number;
  rewards: number;
  createdAt: string;
}

const initial: AffiliateFormState = { ok: true, message: "" };
const inputCls =
  "rounded-xl border-[1.5px] border-line bg-white px-3 py-2.5 text-sm outline-none focus:border-rosa";

function CopyLink({ link }: { link: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={() => {
        navigator.clipboard.writeText(link).then(() => {
          setCopied(true);
          setTimeout(() => setCopied(false), 1600);
        });
      }}
      className="rounded-pill border-[1.5px] border-line px-3 py-1.5 text-xs font-bold text-grey hover:border-rosa hover:text-rosa"
      title={link}
    >
      {copied ? "✓ Copied!" : "Copy link"}
    </button>
  );
}

export function AffiliatesClient({ affiliates }: { affiliates: AffiliateRow[] }) {
  const [state, action, pending] = useActionState(createAffiliateAction, initial);

  return (
    <div className="grid gap-6">
      <div className="rounded-card bg-paper p-5 shadow-soft">
        <div className="mb-3 text-[11px] font-extrabold uppercase tracking-wider text-grey">
          New affiliate link
        </div>
        <form action={action} className="flex flex-wrap items-center gap-2">
          <input name="name" required placeholder="Name" className={inputCls} />
          <input name="email" type="email" required placeholder="email@example.com" className={inputCls} />
          <button disabled={pending}
            className="rounded-pill bg-rosa px-5 py-2.5 text-sm font-bold text-white disabled:opacity-50">
            {pending ? "Creating…" : "+ Create & email the link"}
          </button>
        </form>
        {state.message && (
          <p className={`mt-2 text-sm font-semibold ${state.ok ? "text-cactus" : "text-rosa-deep"}`}>{state.message}</p>
        )}
        <p className="mt-2 text-xs text-grey">
          Asking again for the same email returns the SAME link (and re-sends the email).
        </p>
      </div>

      <div className="overflow-x-auto rounded-card bg-paper shadow-soft">
        <table className="w-full min-w-[760px] text-sm">
          <thead className="border-b border-line text-left text-xs uppercase text-grey">
            <tr>
              <th className="p-3">Affiliate</th>
              <th className="p-3">Code</th>
              <th className="p-3">Bookings via link</th>
              <th className="p-3">Discounts given</th>
              <th className="p-3">Rewards earned</th>
              <th className="p-3">Link</th>
            </tr>
          </thead>
          <tbody>
            {affiliates.map((a) => (
              <tr key={a.id} className="border-b border-line/60">
                <td className="p-3 font-semibold">{a.name}
                  <div className="text-xs font-normal text-grey">{a.email}</div>
                </td>
                <td className="p-3 font-mono font-bold">{a.code}</td>
                <td className="p-3">{a.bookings}</td>
                <td className="p-3">${Math.round(a.discountCents / 100)}</td>
                <td className="p-3">{a.rewards} × $200</td>
                <td className="p-3"><CopyLink link={a.link} /></td>
              </tr>
            ))}
            {affiliates.length === 0 && (
              <tr><td colSpan={6} className="p-8 text-center text-grey">
                No affiliate links yet — create the first one above.
              </td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
