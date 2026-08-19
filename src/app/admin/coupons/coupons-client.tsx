"use client";

import { useActionState, useTransition } from "react";
import {
  addCouponAction,
  toggleCouponAction,
  deleteCouponAction,
  type CouponFormState,
} from "./actions";

export interface AdminCoupon {
  id: string;
  code: string;
  kind: string;
  percentOff: number | null;
  amountCents: number | null;
  minNights: number;
  maxUses: number | null;
  usedCount: number;
  expiresAt: string | null;
  active: boolean;
  note: string | null;
  perUserLimit: number | null;
  allowedEmail: string | null;
  blockOnSale: boolean;
  listingTitle: string | null;
  redeemedCents: number; // total discount given on bookings using this code
  redeemedBookings: number;
}

const initial: CouponFormState = { ok: true, message: "" };
const inputCls =
  "w-full rounded-xl border-[1.5px] border-line bg-white px-3 py-2.5 text-sm outline-none focus:border-rosa";

export function CouponsClient({
  coupons,
  listings,
}: {
  coupons: AdminCoupon[];
  listings: { id: string; title: string }[];
}) {
  const [state, action, pending] = useActionState(addCouponAction, initial);
  const [busy, start] = useTransition();

  return (
    <div className="grid gap-6">
      <div className="rounded-card bg-paper p-5 shadow-soft">
        <div className="mb-3 text-[11px] font-extrabold uppercase tracking-wider text-grey">New coupon</div>
        <form action={action} className="grid gap-2 sm:grid-cols-2 lg:grid-cols-6">
          <input name="code" required placeholder="CODE (e.g. WELCOME10)" className={`${inputCls} uppercase`} />
          <select name="kind" className={inputCls}>
            <option value="percent">% off total</option>
            <option value="fixed">Fixed USD off</option>
          </select>
          <input name="value" type="number" min="0.5" step="0.5" required placeholder="Value" className={inputCls} />
          <input name="minNights" type="number" min="0" placeholder="Min nights" className={inputCls} />
          <input name="maxUses" type="number" min="1" placeholder="Max uses (∞)" className={inputCls} />
          <input name="expiresAt" type="date" className={inputCls} title="Expires (never if empty)" />
          <select name="listingId" className={inputCls} title="Restrict to one home (optional)">
            <option value="">Any home</option>
            {listings.map((l) => <option key={l.id} value={l.id}>{l.title}</option>)}
          </select>
          <input name="perUserLimit" type="number" min="1" placeholder="Uses per guest (∞)" className={inputCls} title="How many times ONE guest (by email) can use it" />
          <input name="allowedEmail" type="email" placeholder="Only for email… (optional)" className={inputCls} />
          <input name="note" placeholder="Internal note (optional)" className={inputCls} />
          <label className="flex items-center gap-2 text-xs font-bold">
            <input type="checkbox" name="blockOnSale" /> Not valid on sale prices
          </label>
          <button disabled={pending}
            className="rounded-pill bg-rosa px-4 py-2 text-sm font-bold text-white disabled:opacity-50">
            {pending ? "Creating…" : "+ Create"}
          </button>
        </form>
        {state.message && (
          <p className={`mt-2 text-sm font-semibold ${state.ok ? "text-cactus" : "text-rosa-deep"}`}>{state.message}</p>
        )}
      </div>

      <div className="flex justify-end">
        <a href="/admin/coupons/report"
          className="rounded-pill border-[1.5px] border-line bg-paper px-4 py-2 text-sm font-bold hover:border-rosa hover:text-rosa">
          ⬇ Download usage report (CSV)
        </a>
      </div>

      <div className="overflow-x-auto rounded-card bg-paper shadow-soft">
        <table className="w-full min-w-[820px] text-sm">
          <thead className="border-b border-line text-left text-xs uppercase text-grey">
            <tr>
              <th className="p-3">Code</th><th className="p-3">Discount</th>
              <th className="p-3">Rules</th><th className="p-3">Uses</th>
              <th className="p-3">Revenue impact</th><th className="p-3">Status</th>
              <th className="p-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {coupons.map((c) => (
              <tr key={c.id} className={`border-b border-line/60 ${c.active ? "" : "opacity-50"}`}>
                <td className="p-3 font-mono font-bold">{c.code}
                  {c.note && <div className="text-xs font-normal text-grey">{c.note}</div>}
                </td>
                <td className="p-3 font-bold text-rosa">
                  {c.kind === "percent" ? `${Number(c.percentOff)}%` : `$${Math.round((c.amountCents ?? 0) / 100)}`}
                </td>
                <td className="p-3 text-xs text-grey">
                  {c.minNights > 0 && <div>{c.minNights}+ nights</div>}
                  {c.expiresAt && <div>until {c.expiresAt}</div>}
                  {c.listingTitle && <div>only {c.listingTitle}</div>}
                  {c.perUserLimit != null && <div>{c.perUserLimit}×/guest</div>}
                  {c.allowedEmail && <div>only {c.allowedEmail}</div>}
                  {c.blockOnSale && <div>not on sale prices</div>}
                  {!c.minNights && !c.expiresAt && !c.listingTitle && c.perUserLimit == null && !c.allowedEmail && !c.blockOnSale && "—"}
                </td>
                <td className="p-3">{c.usedCount}{c.maxUses != null ? ` / ${c.maxUses}` : ""}</td>
                <td className="p-3 text-xs">
                  <b>${Math.round(c.redeemedCents / 100)}</b> off · {c.redeemedBookings} bookings
                </td>
                <td className="p-3">
                  <span className={`rounded-pill px-2.5 py-1 text-xs font-bold ${c.active ? "bg-cactus/15 text-cactus" : "bg-grey/15 text-grey"}`}>
                    {c.active ? "active" : "off"}
                  </span>
                </td>
                <td className="p-3">
                  <div className="flex gap-3">
                    <button disabled={busy} onClick={() => start(() => toggleCouponAction(c.id))}
                      className="text-xs font-bold text-grey hover:text-ink disabled:opacity-50">
                      {c.active ? "Turn off" : "Turn on"}
                    </button>
                    <button disabled={busy} onClick={() => start(() => deleteCouponAction(c.id))}
                      className="text-xs font-bold text-grey hover:text-rosa-deep disabled:opacity-50">
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {coupons.length === 0 && (
              <tr><td colSpan={7} className="p-8 text-center text-grey">No coupons yet — create your first above.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
