"use server";

import { createExtraCheckoutSession } from "@/lib/stripe";

/** Start Stripe checkout for a confirmed early check-in / late check-out. */
export async function payExtraAction(extraId: string): Promise<{ url?: string; error?: string }> {
  return createExtraCheckoutSession(extraId);
}
