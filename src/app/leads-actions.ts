"use server";

import { createLead } from "@/modules/leads";

/** Guest-facing form submissions — one action per form kind. */

export async function submitContactLead(input: {
  name: string; email: string; phone?: string; message: string;
}): Promise<{ ok: boolean }> {
  if (!input.name?.trim() || !input.email?.trim()) return { ok: false };
  return createLead({
    kind: "contact",
    name: input.name, email: input.email, phone: input.phone,
    payload: { message: (input.message ?? "").slice(0, 2000) },
  });
}

export async function submitListPropertyLead(input: {
  name: string; email: string; phone?: string;
  city?: string; propertyType?: string; bedrooms?: string; message?: string;
}): Promise<{ ok: boolean }> {
  if (!input.name?.trim() || !input.email?.trim()) return { ok: false };
  return createLead({
    kind: "list_property",
    name: input.name, email: input.email, phone: input.phone,
    payload: {
      city: input.city ?? "", propertyType: input.propertyType ?? "",
      bedrooms: input.bedrooms ?? "", message: (input.message ?? "").slice(0, 2000),
    },
  });
}

export async function submitReferralLead(input: {
  name: string; email: string; phone?: string;
  friendName: string; friendEmail: string; friendPhone?: string;
}): Promise<{ ok: boolean }> {
  if (!input.name?.trim() || !input.friendEmail?.trim()) return { ok: false };
  return createLead({
    kind: "loyalty_referral",
    name: input.name, email: input.email, phone: input.phone,
    payload: {
      friendName: input.friendName ?? "", friendEmail: input.friendEmail ?? "",
      friendPhone: input.friendPhone ?? "",
    },
  });
}
