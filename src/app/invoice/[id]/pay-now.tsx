"use client";

import { useState, useTransition } from "react";
import { startPaymentAction, startPayPalAction } from "./pay-actions";

/** "Pay now" → Stripe's hosted card page for the amount due. */
export function PayNow({ invoiceId, paypal = false }: { invoiceId: string; paypal?: boolean }) {
  const [error, setError] = useState<string | null>(null);
  const [offline, setOffline] = useState(false);
  const [pending, start] = useTransition();

  if (offline) {
    return (
      <p className="mt-2 text-xs text-grey">
        To pay, reply to your confirmation email or message us on WhatsApp
        and we&rsquo;ll arrange it personally.
      </p>
    );
  }
  return (
    <div className="mt-3">
      <button
        disabled={pending}
        onClick={() => start(async () => {
          setError(null);
          const res = await startPaymentAction(invoiceId);
          if (res.url) window.location.href = res.url;
          else if (res.offline) setOffline(true);
          else setError(res.error ?? "Something went wrong — try again.");
        })}
        className="w-full rounded-pill bg-rosa px-6 py-3 text-sm font-bold text-white disabled:opacity-50"
      >
        {pending ? "Opening secure payment…" : "Pay now with card 🔒"}
      </button>
      <p className="mt-1 text-center text-[11px] text-grey">Secured by Stripe — cards &amp; wallets.</p>
      {paypal && <PayPalButton invoiceId={invoiceId} />}
      {error && <p className="mt-1 text-center text-xs font-semibold text-rosa-deep">{error}</p>}
    </div>
  );
}

/** "Pay with PayPal" → PayPal's approval page; we capture on return. */
export function PayPalButton({ invoiceId }: { invoiceId: string }) {
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  return (
    <div className="mt-2">
      <button
        type="button"
        disabled={pending}
        onClick={() => start(async () => {
          setError(null);
          const res = await startPayPalAction(invoiceId);
          if (res.url) window.location.href = res.url;
          else setError(res.error ?? "PayPal isn't available right now — please pay by card.");
        })}
        className="w-full rounded-pill border-[1.5px] border-[#FFC439] bg-[#FFC439] px-6 py-3 text-sm font-extrabold text-[#003087] hover:brightness-95 disabled:opacity-50"
      >
        {pending ? "Opening PayPal…" : "Pay with PayPal"}
      </button>
      {error && <p className="mt-1 text-center text-xs font-semibold text-rosa-deep">{error}</p>}
    </div>
  );
}
