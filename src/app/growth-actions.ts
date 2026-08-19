"use server";

import { subscribeNewsletter, createReferral } from "@/modules/growth";

export async function subscribeNewsletterAction(
  _prev: { ok: boolean; message: string },
  formData: FormData,
): Promise<{ ok: boolean; message: string }> {
  return subscribeNewsletter(
    String(formData.get("email") ?? ""),
    String(formData.get("phone") ?? ""),
  );
}

export async function createReferralAction(
  _prev: { ok: boolean; message: string; code?: string; link?: string },
  formData: FormData,
): Promise<{ ok: boolean; message: string; code?: string; link?: string }> {
  return createReferral(
    String(formData.get("name") ?? ""),
    String(formData.get("email") ?? ""),
  );
}
