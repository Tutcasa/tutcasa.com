"use client";

import { useActionState, useState, useTransition } from "react";
import {
  savePricingAction,
  syncPriceLabsNowAction,
  addSeasonAction,
  updateSeasonAction,
  deleteSeasonAction,
  type ListingFormState,
} from "./actions";

export interface AdminPricing {
  nightlyCents: number;
  cleaningCents: number;
  taxPct: number;
  weekendPct: number;
  weekendCents: number;
  weeklyNightlyCents: number;
  monthlyNightlyCents: number;
  extraGuestCents: number;
  extraGuestAfter: number;
  cleaningFeeMode: string;
  cityFeeCents: number;
  cityFeeMode: string;
  securityDepositCents: number;
  earlyCheckinCents: number;
  lateCheckoutCents: number;
  weeklyDiscountPct: number;
  monthlyDiscountPct: number;
  earlyBirdPct: number;
  earlyBirdMinDays: number;
  depositPct: number;
  secondPaymentDays: number;
  dynamicPricing: boolean;
  thirdPartyCommissionPct: number;
  /** "plListingId|pms" when mapped to PriceLabs, "" = manual pricing */
  pricelabsKey: string;
  pricelabsSyncedAt: string | null;
  pricelabsSyncedDays: number;
  pricelabsError: string | null;
}

export interface PlOption { id: string; pms: string; name: string; base: number | null }

export interface AdminSeason {
  id: string;
  label: string;
  from: string; // YYYY-MM-DD inclusive
  to: string;   // YYYY-MM-DD inclusive (last night)
  nightlyCents: number;
}

const initial: ListingFormState = { ok: true, message: "" };
const inputCls =
  "w-full rounded-xl border-[1.5px] border-line bg-white px-3 py-2.5 text-sm outline-none focus:border-rosa";
const sectionTitleCls =
  "mb-3 text-[11px] font-extrabold uppercase tracking-wider text-grey";

/** spec: "fixed amount OR a percentage" — one value input + a mode select */
function ModalPrice({
  label, hint, modeName, valueName, pctLabel, fixedLabel, pct, cents,
}: {
  label: string; hint: string; modeName: string; valueName: string;
  pctLabel: string; fixedLabel: string; pct: number; cents: number;
}) {
  const [mode, setMode] = useState(cents > 0 ? "fixed" : "pct");
  return (
    <label className="text-xs font-bold">{label} <span className="font-normal text-grey">({hint})</span>
      <div className="flex gap-1.5">
        <input name={valueName} type="number" min="0" step="0.5"
               key={mode} defaultValue={mode === "fixed" ? cents / 100 : pct}
               className={inputCls} />
        <select name={modeName} value={mode} onChange={(e) => setMode(e.target.value)}
                className={`${inputCls} w-auto`}>
          <option value="pct">{pctLabel}</option>
          <option value="fixed">{fixedLabel}</option>
        </select>
      </div>
    </label>
  );
}

/** one seasonal rate — view row with an inline edit form behind "Edit" */
function SeasonRow({
  s, deleting, startDelete,
}: { s: AdminSeason; deleting: boolean; startDelete: (fn: () => Promise<void>) => void }) {
  const [editing, setEditing] = useState(false);
  const [state, action, pending] = useActionState(updateSeasonAction, initial);
  // close after a successful save — adjust-during-render (never onClick,
  // which would unmount the form on the click that submits it)
  const [seenState, setSeenState] = useState(state);
  if (state !== seenState) {
    setSeenState(state);
    if (state.ok && state.message) setEditing(false);
  }

  if (editing) {
    return (
      <form action={action} className="grid gap-2 rounded-xl border-[1.5px] border-rosa/50 bg-white px-3 py-2 sm:grid-cols-[1fr_1fr_1fr_90px_auto_auto]">
        <input type="hidden" name="seasonId" value={s.id} />
        <input name="label" defaultValue={s.label} placeholder="Label" className={inputCls} />
        <input name="from" type="date" required defaultValue={s.from} className={inputCls} title="First night" />
        <input name="to" type="date" required defaultValue={s.to} className={inputCls} title="Last night (inclusive)" />
        <input name="nightlyUSD" type="number" min="1" required defaultValue={Math.round(s.nightlyCents / 100)} className={inputCls} />
        <button disabled={pending} className="rounded-pill bg-rosa px-4 py-2 text-sm font-bold text-white disabled:opacity-50">
          {pending ? "Saving…" : "Save"}
        </button>
        <button type="button" onClick={() => setEditing(false)}
          className="rounded-pill border-[1.5px] border-line px-3 py-2 text-sm font-bold text-grey">
          Cancel
        </button>
        {state.message && (
          <p className={`sm:col-span-6 text-xs font-semibold ${state.ok ? "text-cactus" : "text-rosa-deep"}`}>{state.message}</p>
        )}
      </form>
    );
  }
  return (
    <div className="flex items-center justify-between gap-3 rounded-xl border-[1.5px] border-line bg-white px-3 py-2 text-sm">
      <div>
        <b>{s.label || "Season"}</b>{" "}
        <span className="text-grey">{s.from} → {s.to}</span>
      </div>
      <div className="flex items-center gap-3">
        <b className="text-rosa">${Math.round(s.nightlyCents / 100)}/n</b>
        <button type="button" onClick={() => setEditing(true)}
          className="text-xs font-bold text-grey hover:text-ink">
          Edit
        </button>
        <button type="button" disabled={deleting}
          onClick={() => startDelete(() => deleteSeasonAction(s.id))}
          className="text-xs font-bold text-grey hover:text-rosa-deep disabled:opacity-50">
          Remove
        </button>
      </div>
    </div>
  );
}

export function PricingForm({
  listingId, pricing, seasons, plListings = [],
}: { listingId: string; pricing: AdminPricing; seasons: AdminSeason[]; plListings?: PlOption[] }) {
  const [state, action, pending] = useActionState(savePricingAction, initial);
  const [plState, plAction, plPending] = useActionState(syncPriceLabsNowAction, initial);
  const [seasonState, seasonAction, seasonPending] = useActionState(addSeasonAction, initial);
  const [deleting, startDelete] = useTransition();

  return (
    <div className="grid gap-6">
      <form action={action} className="grid gap-4">
        <input type="hidden" name="id" value={listingId} />

        <div>
          <div className={sectionTitleCls}>Base rate</div>
          <div className="grid gap-3 sm:grid-cols-3">
            <label className="text-xs font-bold">NIGHTLY (USD) *
              <input name="nightlyUSD" type="number" min="1" step="1" required
                     defaultValue={pricing.nightlyCents / 100} className={inputCls} />
            </label>
            <ModalPrice label="WEEKEND PRICE" hint="Sat & Sun nights"
              modeName="weekendMode" valueName="weekendValue"
              pctLabel="% extra" fixedLabel="fixed $/night"
              pct={pricing.weekendPct} cents={pricing.weekendCents} />
            <label className="text-xs font-bold">TAX %
              <input name="taxPct" type="number" min="0" step="0.1"
                     defaultValue={pricing.taxPct} className={inputCls} />
            </label>
          </div>
        </div>

        <div>
          <div className={sectionTitleCls}>Fees</div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <label className="text-xs font-bold">CLEANING FEE (USD)
              <input name="cleaningUSD" type="number" min="0" step="1"
                     defaultValue={pricing.cleaningCents / 100} className={inputCls} />
            </label>
            <label className="text-xs font-bold">CLEANING CHARGED
              <select name="cleaningFeeMode" defaultValue={pricing.cleaningFeeMode} className={inputCls}>
                <option value="single">Once per stay</option>
                <option value="per_night">Per night</option>
              </select>
            </label>
            <label className="text-xs font-bold">CITY FEE (USD)
              <input name="cityFeeUSD" type="number" min="0" step="1"
                     defaultValue={pricing.cityFeeCents / 100} className={inputCls} />
            </label>
            <label className="text-xs font-bold">CITY FEE CHARGED
              <select name="cityFeeMode" defaultValue={pricing.cityFeeMode} className={inputCls}>
                <option value="single">Once per stay</option>
                <option value="per_night">Per night</option>
              </select>
            </label>
            <label className="text-xs font-bold">EXTRA GUEST (USD / guest / night)
              <input name="extraGuestUSD" type="number" min="0" step="1"
                     defaultValue={pricing.extraGuestCents / 100} className={inputCls} />
            </label>
            <label className="text-xs font-bold">GUESTS INCLUDED <span className="font-normal text-grey">(before the fee kicks in)</span>
              <input name="extraGuestAfter" type="number" min="0"
                     defaultValue={pricing.extraGuestAfter} className={inputCls} />
            </label>
            <label className="text-xs font-bold">SECURITY DEPOSIT (USD)
              <input name="securityDepositUSD" type="number" min="0" step="1"
                     defaultValue={pricing.securityDepositCents / 100} className={inputCls} />
            </label>
          </div>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <label className="text-xs font-bold">EARLY CHECK-IN FEE (USD) <span className="font-normal text-grey">(0 = not offered)</span>
              <input name="earlyCheckinUSD" type="number" min="0" step="1"
                     defaultValue={pricing.earlyCheckinCents / 100} className={inputCls} />
            </label>
            <label className="text-xs font-bold">LATE CHECK-OUT FEE (USD) <span className="font-normal text-grey">(0 = not offered)</span>
              <input name="lateCheckoutUSD" type="number" min="0" step="1"
                     defaultValue={pricing.lateCheckoutCents / 100} className={inputCls} />
            </label>
          </div>
          <p className="mt-1 text-[11px] leading-4 text-grey">
            Guests see these options in the booking box only when the home is
            vacant the night before check-in (early) or the night of check-out
            day (late) — the system checks the calendar automatically.
          </p>
        </div>

        <div>
          <div className={sectionTitleCls}>Discounts</div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <ModalPrice label="7+ NIGHTS PRICE" hint="whole stay"
              modeName="weeklyMode" valueName="weeklyValue"
              pctLabel="% discount" fixedLabel="fixed $/night"
              pct={pricing.weeklyDiscountPct} cents={pricing.weeklyNightlyCents} />
            <ModalPrice label="30+ NIGHTS PRICE" hint="whole stay"
              modeName="monthlyMode" valueName="monthlyValue"
              pctLabel="% discount" fixedLabel="fixed $/night"
              pct={pricing.monthlyDiscountPct} cents={pricing.monthlyNightlyCents} />
            <label className="text-xs font-bold">EARLY-BIRD DISCOUNT %
              <input name="earlyBirdPct" type="number" min="0" max="100" step="0.5"
                     defaultValue={pricing.earlyBirdPct} className={inputCls} />
            </label>
            <label className="text-xs font-bold">EARLY-BIRD MIN DAYS AHEAD
              <input name="earlyBirdMinDays" type="number" min="0"
                     defaultValue={pricing.earlyBirdMinDays} className={inputCls} />
            </label>
          </div>
        </div>

        <div>
          <div className={sectionTitleCls}>Third-party marketing commission</div>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="text-xs font-bold">COMMISSION % <span className="font-normal text-grey">(ONLY for bookings brought by a third party, e.g. via Amanah — their guest pays nightly + this %; direct bookings are never affected. Shown only in your admin breakdown.)</span>
              <input name="thirdPartyCommissionPct" type="number" min="0" max="100" step="0.5"
                     defaultValue={pricing.thirdPartyCommissionPct} className={inputCls} />
            </label>
          </div>
        </div>

        <div>
          <div className={sectionTitleCls}>Payment split</div>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="text-xs font-bold">DEPOSIT % DUE AT BOOKING <span className="font-normal text-grey">(100 = pay in full)</span>
              <input name="depositPct" type="number" min="1" max="100" step="1"
                     defaultValue={pricing.depositPct} className={inputCls} />
            </label>
            <label className="text-xs font-bold">BALANCE DUE (days before check-in)
              <input name="secondPaymentDays" type="number" min="0"
                     defaultValue={pricing.secondPaymentDays} className={inputCls} />
            </label>
          </div>
          <div className="mt-3 grid gap-1">
            {pricing.pricelabsKey && pricing.pricelabsError ? (
              <div className="rounded-xl border-[1.5px] border-rosa/50 bg-rosa/10 px-3 py-2 text-sm font-bold text-rosa-deep">
                ⚠ Mapped, but no prices came back — pick a different PriceLabs
                listing below and sync again.
                <span className="ml-1 block font-normal text-ink">{pricing.pricelabsError}</span>
              </div>
            ) : pricing.pricelabsKey ? (
              <div className="rounded-xl border-[1.5px] border-cactus/40 bg-cactus/10 px-3 py-2 text-sm font-bold text-cactus">
                ● Dynamic pricing is ON — this home follows PriceLabs.
                <span className="ml-1 font-normal text-ink">
                  {pricing.pricelabsSyncedAt
                    ? `Last sync ${new Date(pricing.pricelabsSyncedAt).toLocaleString()} · ${pricing.pricelabsSyncedDays} nightly prices loaded.`
                    : "Not synced yet — use the button below or wait for the morning sync."}
                </span>
              </div>
            ) : (
              <div className="rounded-xl border-[1.5px] border-line bg-crema px-3 py-2 text-sm font-bold text-grey">
                ○ Dynamic pricing is OFF — you set this home&rsquo;s prices manually.
              </div>
            )}
            <label className="text-xs font-bold">DYNAMIC PRICING (PriceLabs)
              <select name="pricelabs" defaultValue={pricing.pricelabsKey} className={inputCls}>
                <option value="">Off — I set prices manually</option>
                {plListings.map((l) => (
                  <option key={l.id} value={`${l.id}|${l.pms}`}>
                    {l.name.slice(0, 60)}{l.base != null ? ` (base $${l.base})` : ""}
                  </option>
                ))}
              </select>
            </label>
            <p className="text-[11px] leading-4 text-grey">
              Pick which PriceLabs listing feeds this home. Its nightly prices
              and min-stays sync automatically every morning (and via the
              button below) — PriceLabs then owns the per-date prices, so
              manual per-day price edits get overwritten on the next sync.
              Seasonal rates and blocked dates are untouched.
            </p>
            <div className="flex items-center gap-3">
              <button formAction={plAction} disabled={plPending}
                className="rounded-pill border-[1.5px] border-cielo px-4 py-1.5 text-xs font-bold text-cielo hover:bg-cielo hover:text-white disabled:opacity-50">
                {plPending ? "Syncing…" : "⟳ Sync PriceLabs prices now"}
              </button>
              {plState.message && (
                <span className={`text-xs font-semibold ${plState.ok ? "text-cactus" : "text-rosa-deep"}`}>{plState.message}</span>
              )}
            </div>
            <input type="hidden" name="dynamicPricing" value={pricing.pricelabsKey ? "on" : ""} />
          </div>
        </div>

        {state.message && (
          <p className={`text-sm font-semibold ${state.ok ? "text-cactus" : "text-rosa-deep"}`}>{state.message}</p>
        )}
        <button disabled={pending}
          className="w-fit rounded-pill bg-rosa px-6 py-2.5 text-sm font-bold text-white disabled:opacity-50">
          {pending ? "Saving…" : "Save pricing"}
        </button>
      </form>

      {/* ------------------------------------------- seasonal rates */}
      <div className="border-t border-line pt-4">
        <div className={sectionTitleCls}>Seasonal rates <span className="font-normal normal-case text-grey">— override the nightly price for a date range (high season, holidays…)</span></div>
        {seasons.length > 0 && (
          <div className="mb-3 grid gap-2">
            {seasons.map((s) => (
              <SeasonRow key={s.id} s={s} deleting={deleting} startDelete={startDelete} />
            ))}
          </div>
        )}
        <form action={seasonAction} className="grid gap-2 sm:grid-cols-[1fr_1fr_1fr_100px_auto]">
          <input type="hidden" name="id" value={listingId} />
          <input name="label" placeholder="Label (e.g. High season)" className={inputCls} />
          <input name="from" type="date" required className={inputCls} title="First night" />
          <input name="to" type="date" required className={inputCls} title="Last night (inclusive)" />
          <input name="nightlyUSD" type="number" min="1" placeholder="$/n" required className={inputCls} />
          <button disabled={seasonPending}
            className="rounded-pill border-[1.5px] border-rosa px-4 py-2 text-sm font-bold text-rosa hover:bg-rosa hover:text-white disabled:opacity-50">
            {seasonPending ? "Adding…" : "+ Add"}
          </button>
        </form>
        {seasonState.message && (
          <p className={`mt-2 text-sm font-semibold ${seasonState.ok ? "text-cactus" : "text-rosa-deep"}`}>{seasonState.message}</p>
        )}
      </div>
    </div>
  );
}
