"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

/**
 * The demo's "Find your casa in 3 clicks" guided flow, ported:
 * destination → dates & guests → matches (routed to /stays).
 * The segmented control flips to the owner pitch, exactly like the
 * demo's Find a casa / I own a casa toggle.
 */

const DESTINATIONS = [
  { icon: "🏝️", name: "Playa del Carmen", sub: "beachfront", city: "Playa del Carmen" },
  { icon: "🛕", name: "Tulum", sub: "jungle & villas", city: "Tulum" },
  { icon: "🏖️", name: "Cancún", sub: "resorts", city: "Cancún" },
  { icon: "🏜️", name: "Nuba, Egypt", sub: "Nile-side", city: "Nuba" },
  { icon: "🎢", name: "Orlando", sub: "parks & pools", city: "Orlando" },
  { icon: "🎲", name: "Surprise me", sub: "show the best", city: "" },
];

export function HomeWizard() {
  const router = useRouter();
  const [mode, setMode] = useState<"guest" | "owner">("guest");
  const [step, setStep] = useState(1);
  const [city, setCity] = useState<string | null>(null);
  const [checkIn, setCheckIn] = useState("");
  const [checkOut, setCheckOut] = useState("");
  const [guests, setGuests] = useState(2);
  const today = new Date().toISOString().slice(0, 10);

  function pickCity(c: string) {
    setCity(c);
    setStep(2);
  }

  function showMatches() {
    const p = new URLSearchParams();
    if (city) p.set("city", city);
    router.push(`/stays${p.size ? `?${p}` : ""}`);
  }

  const inputCls =
    "w-full rounded-xl border-[1.5px] border-line bg-white px-3 py-2.5 text-sm outline-none focus:border-rosa";

  return (
    <div>
      {/* mode toggle */}
      <div className="mx-auto mb-10 flex w-fit rounded-pill bg-paper p-1.5 shadow-soft">
        <button
          onClick={() => setMode("guest")}
          className={`rounded-pill px-6 py-2.5 text-sm font-bold transition ${mode === "guest" ? "bg-rosa text-white shadow-soft" : "text-grey hover:text-ink"}`}
        >
          🏖️ Find a casa
        </button>
        <button
          onClick={() => setMode("owner")}
          className={`rounded-pill px-6 py-2.5 text-sm font-bold transition ${mode === "owner" ? "bg-terra text-white shadow-soft" : "text-grey hover:text-ink"}`}
        >
          🔑 I own a casa
        </button>
      </div>

      {mode === "guest" ? (
        <>
          <h1 className="text-center text-4xl font-extrabold sm:text-5xl">
            Find your casa in <span className="text-rosa">3 clicks.</span>
          </h1>
          <p className="mx-auto mt-4 max-w-[46ch] text-center text-lg text-grey">
            No endless scrolling. Tell us how you travel — we&apos;ll match you
            with the right home. 🌴
          </p>

          {/* wizard card */}
          <div className="mx-auto mt-10 max-w-[760px] overflow-hidden rounded-card bg-paper shadow-lift">
            <div className="flex items-center gap-3 border-b border-line px-5 py-3.5">
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-rosa font-display font-bold text-white">M</span>
              <div className="text-sm leading-tight">
                <b>If you need help, talk to May</b>
                <div className="text-xs text-cactus">● usually replies in minutes</div>
              </div>
              <div className="ml-auto flex gap-1.5">
                {[1, 2].map((s) => (
                  <span key={s} className={`h-1.5 w-8 rounded-pill ${step >= s ? "bg-rosa" : "bg-line"}`} />
                ))}
              </div>
            </div>

            <div className="p-6">
              {step === 1 && (
                <>
                  <h2 className="mb-4 text-xl font-extrabold">
                    Hola 👋 Where do you want to <span className="text-rosa">wake up?</span>
                  </h2>
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                    {DESTINATIONS.map((d) => (
                      <button
                        key={d.name}
                        onClick={() => pickCity(d.city)}
                        className="rounded-2xl border-[1.5px] border-line bg-crema/50 p-4 text-center transition hover:border-rosa hover:shadow-soft"
                      >
                        <div className="text-2xl" aria-hidden>{d.icon}</div>
                        <div className="mt-1 font-display text-sm font-bold">{d.name}</div>
                        <div className="text-xs text-grey">{d.sub}</div>
                      </button>
                    ))}
                  </div>
                </>
              )}

              {step === 2 && (
                <>
                  <h2 className="mb-4 text-xl font-extrabold">
                    When are you <span className="text-rosa">coming?</span>
                  </h2>
                  <div className="grid gap-3 sm:grid-cols-3">
                    <label className="text-xs font-bold">CHECK IN
                      <input type="date" min={today} value={checkIn}
                             onChange={(e) => setCheckIn(e.target.value)} className={inputCls} />
                    </label>
                    <label className="text-xs font-bold">CHECK OUT
                      <input type="date" min={checkIn || today} value={checkOut}
                             onChange={(e) => setCheckOut(e.target.value)} className={inputCls} />
                    </label>
                    <label className="text-xs font-bold">GUESTS
                      <select value={guests} onChange={(e) => setGuests(Number(e.target.value))} className={inputCls}>
                        {[1, 2, 3, 4, 5, 6, 8, 10, 12].map((n) => (
                          <option key={n} value={n}>{n} {n === 1 ? "guest" : "guests"}</option>
                        ))}
                      </select>
                    </label>
                  </div>
                  <div className="mt-5 flex flex-wrap items-center gap-3">
                    <button
                      onClick={showMatches}
                      className="rounded-pill bg-rosa px-7 py-3 font-bold text-white shadow-soft hover:bg-rosa-deep"
                    >
                      Show my matches →
                    </button>
                    <button onClick={() => setStep(1)} className="text-sm font-semibold text-grey hover:text-ink">
                      ← Back
                    </button>
                    <span className="ml-auto text-xs text-grey">Dates optional — skip ahead anytime</span>
                  </div>
                </>
              )}
            </div>
          </div>
        </>
      ) : (
        <>
          <h1 className="text-center text-4xl font-extrabold sm:text-5xl">
            Your casa, <span className="text-rosa">fully managed.</span>
          </h1>
          <p className="mx-auto mt-4 max-w-[46ch] text-center text-lg text-grey">
            Higher occupancy, honest reporting, zero headaches. We treat your
            home like our own. 🔑
          </p>
          <div className="relative mx-auto mt-10 max-w-[720px] overflow-hidden rounded-card bg-gradient-to-br from-terra to-rosa p-8 text-white shadow-lift sm:p-9">
            <span className="absolute -top-4 right-2 rotate-12 text-[110px] opacity-20" aria-hidden>🔑</span>
            <h2 className="font-display text-2xl font-extrabold">Earn more, worry less.</h2>
            <p className="mt-2 max-w-[42ch] text-sm opacity-95">
              Full-service management for the Riviera Maya and beyond —
              marketing, guests, cleaning, maintenance and payments, all handled.
            </p>
            <div className="mt-5 flex flex-wrap gap-7">
              {[["70%+", "average occupancy"], ["40+", "homes managed"], ["24/7", "owner support"]].map(([k, v]) => (
                <div key={v}>
                  <div className="font-display text-2xl font-extrabold">{k}</div>
                  <div className="text-xs opacity-90">{v}</div>
                </div>
              ))}
            </div>
            <Link
              href="/list-my-property"
              className="mt-6 inline-block rounded-pill bg-white px-6 py-3 font-bold text-rosa hover:bg-crema"
            >
              List my property
            </Link>
          </div>
        </>
      )}
    </div>
  );
}
