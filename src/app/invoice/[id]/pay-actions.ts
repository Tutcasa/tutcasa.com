"use server";

import { headers } from "next/headers";
import { overLimit } from "@/lib/rate-limit";
import { createInvoiceCheckoutSession, stripeConfigured } from "@/lib/stripe";

export interface PayState { url?: string; error?: string; offline?: boolean }

/** Start a hosted Stripe Checkout for this invoice's amount due. The
    unguessable invoice id is the auth, same as viewing the invoice. */
export async function startPaymentAction(invoiceId: string): Promise<PayState> {
  if (!stripeConfigured()) return { offline: true };
  const ip = (await headers()).get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  if (overLimit(`pay:${ip}`, 10, 10 * 60 * 1000)) {
    return { error: "Too many attempts — try again in a few minutes." };
  }
  const res = await createInvoiceCheckoutSession(invoiceId);
  return "url" in res ? { url: res.url } : { error: res.error };
}
