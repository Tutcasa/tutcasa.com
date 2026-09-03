"use client";

import { useState } from "react";
import { loadStripe } from "@stripe/stripe-js";
import { Elements, PaymentElement, useElements, useStripe } from "@stripe/react-stripe-js";

/**
 * On-page card form (Stripe Payment Element) — the guest pays without
 * leaving TutCasa, Airbnb-style. Card data goes straight from Stripe's
 * iframe to Stripe; our site never sees it.
 */

export interface PayIntent {
  clientSecret: string;
  amountCents: number;
  currency: string;
  invoiceId: string;
}

const pk = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ?? "";
const stripePromise = pk ? loadStripe(pk) : null;

/** The publishable key's mode must match the server key's mode. */
export function publishableKeyMode(): "test" | "live" | null {
  if (pk.startsWith("pk_test")) return "test";
  if (pk.startsWith("pk_live")) return "live";
  return null;
}

function InnerForm({ intent, onPaid }: { intent: PayIntent; onPaid: () => void }) {
  const stripe = useStripe();
  const elements = useElements();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const amount = `$${Math.round(intent.amountCents / 100).toLocaleString("en-US")} ${intent.currency}`;

  async function submit() {
    if (!stripe || !elements) return;
    setBusy(true);
    setError(null);
    const res = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: `${window.location.origin}/invoice/${intent.invoiceId}?paid=1`,
      },
      redirect: "if_required", // cards complete right here on the page
    });
    setBusy(false);
    if (res.error) {
      setError(res.error.message ?? "The payment didn't go through — check the card details.");
    } else if (res.paymentIntent && (res.paymentIntent.status === "succeeded" || res.paymentIntent.status === "processing")) {
      onPaid();
    }
  }

  return (
    <div>
      <PaymentElement options={{ layout: "tabs" }} />
      {error && (
        <div style={{ color: "var(--rosa)", fontSize: 13, fontWeight: 700, margin: "10px 0 0" }}>{error}</div>
      )}
      <button className="co-pay" style={{ marginTop: 14 }} onClick={submit} disabled={busy || !stripe}>
        <span>{busy ? "Processing payment…" : `Pay ${amount}`}</span>
      </button>
      <div className="co-stripe">&#128274; <span>Secured by</span> <b style={{ color: "#635BFF" }}>Stripe</b></div>
    </div>
  );
}

export function StripePayForm({ intent, onPaid }: { intent: PayIntent; onPaid: () => void }) {
  if (!stripePromise) return null;
  return (
    <Elements
      stripe={stripePromise}
      options={{
        clientSecret: intent.clientSecret,
        appearance: {
          variables: {
            colorPrimary: "#E4326B",
            borderRadius: "12px",
            fontFamily: "inherit",
          },
        },
      }}
    >
      <InnerForm intent={intent} onPaid={onPaid} />
    </Elements>
  );
}
