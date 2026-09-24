"use server";

import { headers } from "next/headers";
import { overLimit } from "@/lib/rate-limit";

interface GiftInput {
  amountUSD: number;
  buyerEmail: string;
  recipientEmail?: string;
  message?: string;
}

/** Guest buys a gift card — returns the Stripe (default) or PayPal
    checkout URL. Same validation for both. */
export async function startGiftCheckoutAction(
  input: GiftInput,
  via: "stripe" | "paypal" = "stripe",
): Promise<{ url?: string; error?: string }> {
  const ip = (await headers()).get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  if (overLimit(`gift:${ip}`, 6, 10 * 60 * 1000)) {
    return { error: "Too many attempts — try again in a few minutes." };
  }
  const buyer = String(input.buyerEmail ?? "").trim();
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(buyer)) return { error: "Add a valid email — the gift card code is delivered there." };
  const recipient = String(input.recipientEmail ?? "").trim();
  if (recipient && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(recipient)) return { error: "The recipient email doesn't look right." };
  if (via === "paypal") {
    const { createPayPalGiftOrder } = await import("@/lib/paypal");
    const pp = await createPayPalGiftOrder({
      amountUSD: Number(input.amountUSD), buyerEmail: buyer,
      recipientEmail: recipient || undefined,
      message: String(input.message ?? "").slice(0, 400) || undefined,
    });
    return "url" in pp ? { url: pp.url } : { error: pp.error };
  }
  const { createGiftCheckoutSession } = await import("@/lib/stripe");
  const res = await createGiftCheckoutSession({
    amountUSD: Number(input.amountUSD),
    buyerEmail: buyer,
    recipientEmail: recipient || undefined,
    message: String(input.message ?? "").slice(0, 400) || undefined,
  });
  return "url" in res ? { url: res.url } : { error: res.error };
}
