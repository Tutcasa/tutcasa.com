"use client";

import { useMemo, useState, useActionState, useTransition } from "react";
import {
  applyCalendarDaysAction,
  clearCalendarDaysAction,
  addBlockAction,
  deleteBlockAction,
  type ListingFormState,
} from "./actions";

/** Effective state of one calendar day (resolved server-side). */
export interface AdminDay {
  priceCents: number;      // effective nightly (override → season → base)
  override: boolean;       // has a listing_price_days row
  minStay: number | null;
  blocked: boolean;        // blocked via price-days override
  booked: boolean;         // covered by a pending/confirmed booking
  blockReason: string | null; // covered by an availability_block
}

export interface AdminBlock {
  id: string;
  from: string; // first blocked night
  to: string;   // last blocked night (inclusive)
  reason: string;
  source: string;
}

const initial: ListingFormState = { ok: true, message: "" };
const inputCls =
  "w-full rounded-xl border-[1.5px] border-line bg-white px-3 py-2.5 text-sm outline-none focus:border-rosa";

const MONTH_FMT = new Intl.DateTimeFormat("en-US", { month: "long", year: "numeric", timeZone: "UTC" });

function ymd(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export function CalendarEditor({
  listingId, startMonth, monthCount, days, blocks, todayYmd,
}: {
  listingId: string;
  /** YYYY-MM of the first month shown */
  startMonth: string;
  monthCount: number;
  days: Record<string, AdminDay>;
  blocks: AdminBlock[];
  todayYmd: string;
}) {
  const [monthIdx, setMonthIdx] = useState(0);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [applyState, applyAction, applyPending] = useActionState(applyCalendarDaysAction, initial);
  const [clearState, clearAction, clearPending] = useActionState(clearCalendarDaysAction, initial);
  const [blockState, blockAction, blockPending] = useActionState(addBlockAction, initial);
  const [deleting, startDelete] = useTransition();

  const month = useMemo(() => {
    const [y, m] = startMonth.split("-").map(Number);
    const first = new Date(Date.UTC(y, m - 1 + monthIdx, 1));
    const label = MONTH_FMT.format(first);
    // Monday-first grid
    const lead = (first.getUTCDay() + 6) % 7;
    const daysInMonth = new Date(Date.UTC(first.getUTCFullYear(), first.getUTCMonth() + 1, 0)).getUTCDate();
    const cells: (string | null)[] = Array(lead).fill(null);
    for (let d = 1; d <= daysInMonth; d++) {
      cells.push(ymd(new Date(Date.UTC(first.getUTCFullYear(), first.getUTCMonth(), d))));
    }
    return { label, cells };
  }, [startMonth, monthIdx]);

  /** first click sets the start, second the end (reset on earlier date) */
  function pick(date: string) {
    if (!from || (from && to)) { setFrom(date); setTo(""); return; }
    if (date < from) { setFrom(date); setTo(""); return; }
    setTo(date);
  }

  const inRange = (d: string) => from && ((to && d >= from && d <= to) || d === from);

  return (
    <div className="grid gap-6">
      {/* ------------------------------------------------ month grid */}
      <div className="rounded-card border-[1.5px] border-line bg-white p-4">
        <div className="mb-3 flex items-center justify-between">
          <button type="button" onClick={() => setMonthIdx((i) => Math.max(0, i - 1))}
            disabled={monthIdx === 0}
            className="rounded-pill border-[1.5px] border-line px-3 py-1 text-sm font-bold disabled:opacity-30">←</button>
          <b>{month.label}</b>
          <button type="button" onClick={() => setMonthIdx((i) => Math.min(monthCount - 1, i + 1))}
            disabled={monthIdx >= monthCount - 1}
            className="rounded-pill border-[1.5px] border-line px-3 py-1 text-sm font-bold disabled:opacity-30">→</button>
        </div>
        <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-bold uppercase text-grey">
          {["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"].map((d) => <div key={d} className="py-1">{d}</div>)}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {month.cells.map((date, i) => {
            if (!date) return <div key={`x${i}`} />;
            const info = days[date];
            const past = date < todayYmd;
            const unavailable = info?.booked || info?.blocked || !!info?.blockReason;
            return (
              <button
                type="button"
                key={date}
                disabled={past}
                onClick={() => pick(date)}
                title={
                  info?.booked ? "Booked"
                  : info?.blockReason ? `Blocked (${info.blockReason})`
                  : info?.blocked ? "Blocked (calendar)"
                  : info?.override ? "Custom price" : undefined
                }
                className={`flex min-h-[54px] flex-col items-center justify-center rounded-lg border-[1.5px] p-1 text-xs
                  ${past ? "cursor-default border-transparent text-grey/40"
                    : inRange(date) ? "border-rosa bg-rosa/10 font-bold"
                    : info?.booked ? "border-transparent bg-rosa/15 text-rosa-deep"
                    : unavailable ? "border-transparent bg-grey/15 text-grey line-through"
                    : "border-line hover:border-rosa/60"}`}
              >
                <span className="font-bold">{Number(date.slice(8))}</span>
                {!past && info && !unavailable && (
                  <span className={info.override ? "font-extrabold text-rosa" : "text-grey"}>
                    ${Math.round(info.priceCents / 100)}
                  </span>
                )}
                {!past && info?.minStay ? (
                  <span className="text-[9px] text-grey">{info.minStay}n min</span>
                ) : null}
              </button>
            );
          })}
        </div>
        <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-grey">
          <span><span className="mr-1 inline-block h-2.5 w-2.5 rounded-sm bg-rosa/15 align-middle" />booked</span>
          <span><span className="mr-1 inline-block h-2.5 w-2.5 rounded-sm bg-grey/15 align-middle" />blocked</span>
          <span><span className="mr-1 inline-block h-2.5 w-2.5 rounded-sm border border-rosa bg-rosa/10 align-middle" />selected</span>
          <span className="font-extrabold text-rosa">$ bold</span> = custom price
        </div>
      </div>

      {/* ----------------------------------------- apply to range */}
      <div className="rounded-card border-[1.5px] border-line bg-white p-4">
        <div className="mb-3 text-[11px] font-extrabold uppercase tracking-wider text-grey">
          Set prices &amp; rules for a date range <span className="font-normal normal-case">(click days above or type dates)</span>
        </div>
        <form action={applyAction} className="grid gap-2 sm:grid-cols-2 lg:grid-cols-6">
          <input type="hidden" name="id" value={listingId} />
          <input name="from" type="date" required value={from}
                 onChange={(e) => setFrom(e.target.value)} className={inputCls} />
          <input name="to" type="date" required value={to || from}
                 onChange={(e) => setTo(e.target.value)} className={inputCls} />
          <input name="nightlyUSD" type="number" min="1" placeholder="$/night (blank = base)" className={inputCls} />
          <input name="minStay" type="number" min="1" placeholder="Min stay (blank = base)" className={inputCls} />
          <label className="flex items-center gap-2 text-sm font-semibold">
            <input type="checkbox" name="blocked" className="h-4 w-4 accent-rosa" /> Block these nights
          </label>
          <button disabled={applyPending || !from}
            className="rounded-pill bg-rosa px-4 py-2 text-sm font-bold text-white disabled:opacity-50">
            {applyPending ? "Applying…" : "Apply"}
          </button>
        </form>
        {applyState.message && (
          <p className={`mt-2 text-sm font-semibold ${applyState.ok ? "text-cactus" : "text-rosa-deep"}`}>{applyState.message}</p>
        )}
        <form action={clearAction} className="mt-2">
          <input type="hidden" name="id" value={listingId} />
          <input type="hidden" name="from" value={from} />
          <input type="hidden" name="to" value={to || from} />
          <button disabled={clearPending || !from}
            className="text-sm font-bold text-grey underline-offset-2 hover:text-rosa-deep hover:underline disabled:opacity-50">
            {clearPending ? "Clearing…" : "Clear overrides in this range (back to base price)"}
          </button>
        </form>
        {clearState.message && (
          <p className={`mt-1 text-sm font-semibold ${clearState.ok ? "text-cactus" : "text-rosa-deep"}`}>{clearState.message}</p>
        )}
      </div>

      {/* --------------------------------------------- manual blocks */}
      <div className="rounded-card border-[1.5px] border-line bg-white p-4">
        <div className="mb-3 text-[11px] font-extrabold uppercase tracking-wider text-grey">
          Owner &amp; maintenance blocks
        </div>
        {blocks.length > 0 && (
          <div className="mb-3 grid gap-2">
            {blocks.map((b) => (
              <div key={b.id}
                className="flex items-center justify-between gap-3 rounded-xl border-[1.5px] border-line px-3 py-2 text-sm">
                <div>
                  <b>{b.from} → {b.to}</b>{" "}
                  <span className="rounded-pill bg-grey/15 px-2 py-0.5 text-[10px] font-bold uppercase text-grey">{b.reason}</span>
                  {b.source && <span className="ml-2 text-xs text-grey">{b.source}</span>}
                </div>
                {b.reason !== "ical" ? (
                  <button type="button" disabled={deleting}
                    onClick={() => startDelete(() => deleteBlockAction(b.id))}
                    className="text-xs font-bold text-grey hover:text-rosa-deep disabled:opacity-50">
                    Remove
                  </button>
                ) : (
                  <span className="text-[10px] font-bold uppercase text-grey">synced</span>
                )}
              </div>
            ))}
          </div>
        )}
        <form action={blockAction} className="grid gap-2 sm:grid-cols-[1fr_1fr_1fr_auto]">
          <input type="hidden" name="id" value={listingId} />
          <input name="from" type="date" required className={inputCls} title="First blocked night" />
          <input name="to" type="date" required className={inputCls} title="Last blocked night" />
          <select name="reason" className={inputCls}>
            <option value="owner">Owner stay</option>
            <option value="maintenance">Maintenance</option>
          </select>
          <button disabled={blockPending}
            className="rounded-pill border-[1.5px] border-rosa px-4 py-2 text-sm font-bold text-rosa hover:bg-rosa hover:text-white disabled:opacity-50">
            {blockPending ? "Blocking…" : "+ Block dates"}
          </button>
        </form>
        {blockState.message && (
          <p className={`mt-2 text-sm font-semibold ${blockState.ok ? "text-cactus" : "text-rosa-deep"}`}>{blockState.message}</p>
        )}
      </div>
    </div>
  );
}
