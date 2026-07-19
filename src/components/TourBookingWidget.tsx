"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { reserveTourAction } from "@/app/tours/[slug]/actions";

interface Props {
  slug: string;
  priceLabel: string;
  perPersonCents: number;
  minGroup: number;
  maxGroup: number;
}

const ERRORS: Record<string, string> = {
  TOUR_NOT_FOUND: "This tour is no longer available.",
  INVALID_DATE: "Please pick a date from today onward.",
  INVALID_GROUP: "That group size isn't available for this tour.",
  INVALID_CONTACT: "Please add your name and a valid email.",
  ON_REQUEST: "This tour is arranged personally — message May to request it.",
};

export function TourBookingWidget({ slug, priceLabel, perPersonCents, minGroup, maxGroup }: Props) {
  const router = useRouter();
  const today = new Date().toISOString().slice(0, 10);
  const [date, setDate] = useState("");
  const [group, setGroup] = useState(Math.max(2, minGroup));
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [reserving, start] = useTransition();

  const total = perPersonCents * group;
  const canBook = date >= today && name.trim() && /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email) && !reserving;

  const inputCls =
    "w-full rounded-xl border-[1.5px] border-line bg-white px-3 py-2.5 text-sm outline-none focus:border-rosa";

  function book() {
    if (!canBook) return;
    setError(null);
    start(async () => {
      const res = await reserveTourAction({
        tourSlug: slug, tourDate: date, groupSize: group,
        guestName: name, guestEmail: email,
        guestPhone: phone || undefined, notes: notes || undefined,
      });
      if (res.ok) router.push(`/tour-booking/${res.bookingId}`);
      else setError(ERRORS[res.error] ?? "Something went wrong.");
    });
  }

  return (
    <div>
      <p>
        <span className="font-display text-3xl font-extrabold text-rosa">{priceLabel}</span>{" "}
        <span className="text-grey">/ person</span>
      </p>

      <div className="mt-4 grid grid-cols-2 gap-2">
        <label className="text-xs font-bold">
          DATE
          <input type="date" className={inputCls} min={today} value={date}
                 onChange={(e) => setDate(e.target.value)} />
        </label>
        <label className="text-xs font-bold">
          PEOPLE
          <select className={inputCls} value={group}
                  onChange={(e) => setGroup(Number(e.target.value))}>
            {Array.from({ length: maxGroup - minGroup + 1 }, (_, i) => minGroup + i).map((n) => (
              <option key={n} value={n}>{n}</option>
            ))}
          </select>
        </label>
      </div>

      <div className="mt-3 flex justify-between rounded-xl bg-crema p-3.5 font-display font-extrabold">
        <span>Total</span>
        <span>${(total / 100).toLocaleString("en-US")} MXN</span>
      </div>

      <div className="mt-3 grid gap-2">
        <input className={inputCls} placeholder="Your name" value={name}
               onChange={(e) => setName(e.target.value)} aria-label="Your name" />
        <input className={inputCls} placeholder="Email" type="email" value={email}
               onChange={(e) => setEmail(e.target.value)} aria-label="Email" />
        <input className={inputCls} placeholder="Phone / WhatsApp (optional)" value={phone}
               onChange={(e) => setPhone(e.target.value)} aria-label="Phone" />
        <textarea className={inputCls} placeholder="Questions or special requests? (optional)"
                  rows={2} value={notes} onChange={(e) => setNotes(e.target.value)}
                  aria-label="Notes" />
      </div>

      {error && (
        <p className="mt-3 rounded-xl bg-rosa/10 px-3 py-2 text-sm font-semibold text-rosa-deep">{error}</p>
      )}

      <button
        onClick={book}
        disabled={!canBook}
        className="mt-4 w-full rounded-pill bg-rosa py-3.5 font-bold text-white shadow-soft enabled:hover:bg-rosa-deep disabled:cursor-not-allowed disabled:opacity-45"
      >
        {reserving ? "Booking…" : "Book this tour"}
      </button>
      <p className="mt-2 text-center text-xs text-grey">
        Nothing is charged yet — we confirm with the operator, then arrange payment.
      </p>
    </div>
  );
}
