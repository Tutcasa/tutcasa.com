"use server";

import { headers } from "next/headers";
import { overLimit } from "@/lib/rate-limit";

/** Guest buys a gift card — returns the Stripe hosted-checkout URL. */
export async function startGiftCheckoutAction(input: {
  amountUSD: number;
  buyerEmail: string;
  recipientEmail?: string;
  message?: string;
}): Promise<{ url?: string; error?: string }> {
  const ip = (await headers()).get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  if (overLimit(`gift:${ip}`, 6, 10 * 60 * 1000)) {
    return { error: "Too many attempts — try again in a few minutes." };
  }
  const buyer = String(input.buyerEmail ?? "").trim();
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(buyer)) return { error: "Add a valid email — the gift card code is delivered there." };
  const recipient = String(input.recipientEmail ?? "").trim();
  if (recipient && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(recipient)) return { error: "The recipient email doesn't look right." };
  const { createGiftCheckoutSession } = await import("@/lib/stripe");
  const res = await createGiftCheckoutSession({
    amountUSD: Number(input.amountUSD),
    buyerEmail: buyer,
    recipientEmail: recipient || undefined,
    message: String(input.message ?? "").slice(0, 400) || undefined,
  });
  return "url" in res ? { url: res.url } : { error: res.error };
}
