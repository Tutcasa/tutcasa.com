"use client";

import { useState, useTransition } from "react";
import { payExtraAction, payExtraPayPalAction } from "./actions";

export function PayExtra({ id, label, paypal = false }: { id: string; label: string; paypal?: boolean }) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="mt-4">
      <button
        disabled={pending}
        onClick={() => start(async () => {
          const res = await payExtraAction(id);
          if (res.url) window.location.href = res.url;
          else setError(res.error ?? "Something went wrong — try again in a moment.");
        })}
        className="w-full rounded-pill bg-rosa px-6 py-3 text-base font-bold text-white disabled:opacity-50"
      >
        {pending ? "Opening secure payment…" : `Pay & confirm ${label.toLowerCase()}`}
      </button>
      {paypal && (
        <button
          disabled={pending}
          onClick={() => start(async () => {
            const res = await payExtraPayPalAction(id);
            if (res.url) window.location.href = res.url;
            else setError(res.error ?? "PayPal isn't available right now — please pay by card.");
          })}
          className="mt-2 w-full rounded-pill border-[1.5px] border-[#FFC439] bg-[#FFC439] px-6 py-3 text-base font-extrabold text-[#003087] hover:brightness-95 disabled:opacity-50"
        >
          Pay with PayPal
        </button>
      )}
      {error && <p className="mt-2 text-center text-sm font-semibold text-rosa-deep">{error}</p>}
      <p className="mt-2 text-center text-xs text-grey">
        Secure payment by card{paypal ? " or PayPal" : ""}. Nothing is charged until you complete it.
      </p>
    </div>
  );
}
