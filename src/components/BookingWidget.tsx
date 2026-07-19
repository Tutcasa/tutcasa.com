"use client";

import { useCallback, useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { getQuoteAction, reserveAction, type QuoteResult } from "@/app/stays/[slug]/actions";
import type { UnavailableRange } from "@/modules/bookings/types";

interface Props {
  slug: string;
  minStay: number;
  maxGuests: number;
  allInNightlyLabel: string;
  unavailable: UnavailableRange[];
}

function fmt(cents: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(cents / 100);
}

const ERRORS: Record<string, string> = {
  DATES_TAKEN: "Those dates were just booked by another guest — pick different dates.",
  INVALID_DATES: "Please choose a valid date range.",
  MIN_STAY_NOT_MET: "This home has a minimum stay — extend your dates.",
  TOO_MANY_GUESTS: "That's more guests than this home sleeps.",
  LISTING_NOT_FOUND: "This home is no longer available.",
  INVALID_CONTACT: "Please add your name and a valid email.",
  UNAVAILABLE: "Some of those nights are already booked — see the calendar note below.",
};

export function BookingWidget({ slug, minStay, maxGuests, allInNightlyLabel, unavailable }: Props) {
  const router = useRouter();
  const today = new Date().toISOString().slice(0, 10);

  const [checkIn, setCheckIn] = useState("");
  const [checkOut, setCheckOut] = useState("");
  const [guests, setGuests] = useState(2);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [quote, setQuote] = useState<QuoteResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [quoting, startQuoting] = useTransition();
  const [reserving, startReserving] = useTransition();

  const overlapsUnavailable = useCallback(
    (from: string, to: string) =>
      unavailable.some((r) => from < r.to && to > r.from),
    [unavailable],
  );

  useEffect(() => {
    setError(null);
    setQuote(null);
    if (!checkIn || !checkOut || checkOut <= checkIn) return;
    if (overlapsUnavailable(checkIn, checkOut)) {
      setError(ERRORS.UNAVAILABLE);
      return;
    }
    startQuoting(async () => {
      const q = await getQuoteAction(slug, checkIn, checkOut);
      if (q.ok) setQuote(q);
      else setError(ERRORS[q.error] ?? "Something went wrong.");
    });
  }, [checkIn, checkOut, slug, overlapsUnavailable]);

  const canReserve =
    quote?.ok && name.trim() && /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email) && !reserving;

  function reserve() {
    if (!canReserve) return;
    setError(null);
    startReserving(async () => {
      const res = await reserveAction({
        listingSlug: slug,
        checkIn,
        checkOut,
        guests,
        guestName: name,
        guestEmail: email,
        guestPhone: phone || undefined,
      });
      if (res.ok) router.push(`/booking/${res.bookingId}`);
      else setError(ERRORS[res.error] ?? "Something went wrong.");
    });
  }

  const upcoming = useMemo(
    () => unavailable.filter((r) => r.to >= today).slice(0, 4),
    [unavailable, today],
  );

  const inputCls =
    "w-full rounded-xl border-[1.5px] border-line bg-white px-3 py-2.5 text-sm outline-none focus:border-rosa";

  return (
    <div>
      <p>
        <span className="font-display text-3xl font-extrabold">{allInNightlyLabel}</span>{" "}
        <span className="text-grey">/ night · all-in</span>
      </p>
      <p className="mt-1 text-xs text-grey">
        Taxes &amp; cleaning included · min {minStay} nights
      </p>

      <div className="mt-4 grid grid-cols-2 gap-2">
        <label className="text-xs font-bold">
          CHECK IN
          <input type="date" className={inputCls} min={today} value={checkIn}
                 onChange={(e) => setCheckIn(e.target.value)} />
        </label>
        <label className="text-xs font-bold">
          CHECK OUT
          <input type="date" className={inputCls} min={checkIn || today} value={checkOut}
                 onChange={(e) => setCheckOut(e.target.value)} />
        </label>
      </div>

      <label className="mt-2 block text-xs font-bold">
        GUESTS
        <select className={inputCls} value={guests}
                onChange={(e) => setGuests(Number(e.target.value))}>
          {Array.from({ length: maxGuests }, (_, i) => i + 1).map((n) => (
            <option key={n} value={n}>{n} {n === 1 ? "guest" : "guests"}</option>
          ))}
        </select>
      </label>

      {quoting && <p className="mt-3 text-sm text-grey">Calculating your all-in price…</p>}

      {quote?.ok && (
        <div className="mt-4 rounded-xl bg-crema p-4 text-sm">
          <div className="flex justify-between">
            <span>{fmt(quote.quote.nightlyCents)} × {quote.quote.nights} nights</span>
            <span>{fmt(quote.quote.accommodationCents)}</span>
          </div>
          <div className="mt-1 flex justify-between">
            <span>Cleaning</span><span>{fmt(quote.quote.cleaningCents)}</span>
          </div>
          <div className="mt-1 flex justify-between">
            <span>Taxes</span><span>{fmt(quote.quote.taxCents)}</span>
          </div>
          <div className="mt-2 flex justify-between border-t border-line pt-2 font-display text-base font-extrabold">
            <span>Total — all-in</span><span>{fmt(quote.quote.totalCents)}</span>
          </div>
          <p className="mt-1 text-xs text-grey">No hidden fees. This is the number.</p>
        </div>
      )}

      {quote?.ok && (
        <div className="mt-4 grid gap-2">
          <input className={inputCls} placeholder="Your name" value={name}
                 onChange={(e) => setName(e.target.value)} aria-label="Your name" />
          <input className={inputCls} placeholder="Email" type="email" value={email}
                 onChange={(e) => setEmail(e.target.value)} aria-label="Email" />
          <input className={inputCls} placeholder="Phone / WhatsApp (optional)" value={phone}
                 onChange={(e) => setPhone(e.target.value)} aria-label="Phone" />
        </div>
      )}

      {error && (
        <p className="mt-3 rounded-xl bg-rosa/10 px-3 py-2 text-sm font-semibold text-rosa-deep">
          {error}
        </p>
      )}

      <button
        onClick={reserve}
        disabled={!canReserve}
        className="mt-4 w-full rounded-pill bg-rosa py-3.5 font-bold text-white shadow-soft enabled:hover:bg-rosa-deep disabled:cursor-not-allowed disabled:opacity-45"
      >
        {reserving ? "Holding your dates…" : "Reserve"}
      </button>
      <p className="mt-2 text-center text-xs text-grey">
        Free hold for 30 minutes — nothing is charged yet.
      </p>

      {upcoming.length > 0 && (
        <p className="mt-4 border-t border-line pt-3 text-xs text-grey">
          <b className="text-ink">Already booked:</b>{" "}
          {upcoming.map((r) => `${r.from} → ${r.to}`).join(" · ")}
        </p>
      )}
    </div>
  );
}
