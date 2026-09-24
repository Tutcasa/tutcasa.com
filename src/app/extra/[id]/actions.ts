"use server";

import { createExtraCheckoutSession } from "@/lib/stripe";

/** Start Stripe checkout for a confirmed early check-in / late check-out. */
export async function payExtraAction(extraId: string): Promise<{ url?: string; error?: string }> {
  return createExtraCheckoutSession(extraId);
}

/** Same, with PayPal. */
export async function payExtraPayPalAction(extraId: string): Promise<{ url?: string; error?: string }> {
  const { createPayPalExtraOrder } = await import("@/lib/paypal");
  return createPayPalExtraOrder(extraId);
}
