"use server";

import { headers } from "next/headers";
import { overLimit } from "@/lib/rate-limit";

import { subscribeNewsletter, createReferral } from "@/modules/growth";

export async function subscribeNewsletterAction(
  _prev: { ok: boolean; message: string },
  formData: FormData,
): Promise<{ ok: boolean; message: string }> {
  const ip = (await headers()).get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  if (overLimit(`newsletter:${ip}`, 4, 10 * 60 * 1000)) {
    return { ok: false, message: "Too many signups from this connection — try again later." };
  }
  return subscribeNewsletter(
    String(formData.get("email") ?? ""),
    String(formData.get("phone") ?? ""),
  );
}

export async function createReferralAction(
  _prev: { ok: boolean; message: string; code?: string; link?: string },
  formData: FormData,
): Promise<{ ok: boolean; message: string; code?: string; link?: string }> {
  const ip = (await headers()).get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  if (overLimit(`referral:${ip}`, 4, 10 * 60 * 1000)) {
    return { ok: false, message: "Too many requests from this connection — try again later." };
  }
  return createReferral(
    String(formData.get("name") ?? ""),
    String(formData.get("email") ?? ""),
  );
}
