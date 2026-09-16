"use server";

import { headers } from "next/headers";
import { overLimit } from "@/lib/rate-limit";

import { createLead } from "@/modules/leads";

/** Guest-facing form submissions — one action per form kind. */

export async function submitContactLead(input: {
  name: string; email: string; phone?: string; message: string;
}): Promise<{ ok: boolean }> {
  if (!input.name?.trim() || !input.email?.trim()) return { ok: false };
  const ip = (await headers()).get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  if (overLimit(`lead:${ip}`, 6, 10 * 60 * 1000)) return { ok: false };
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
  const ip = (await headers()).get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  if (overLimit(`lead:${ip}`, 6, 10 * 60 * 1000)) return { ok: false };
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
  const ip = (await headers()).get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  if (overLimit(`refer:${ip}`, 5, 10 * 60 * 1000)) return { ok: false };
  const lead = await createLead({
    kind: "loyalty_referral",
    name: input.name, email: input.email, phone: input.phone,
    payload: {
      friendName: input.friendName ?? "", friendEmail: input.friendEmail ?? "",
      friendPhone: input.friendPhone ?? "",
    },
  });
  // emails: the referrer gets their invite link + the friend gets a
  // personal $100 invite with the coupon code (never blocks the lead)
  const { referFriend } = await import("@/modules/growth");
  await referFriend({
    name: input.name, email: input.email,
    friendName: input.friendName, friendEmail: input.friendEmail,
  }).catch(() => {});
  return lead;
}

/** Build-your-own-plan request from the tours page — lands in admin →
    Leads and emails the team (it used to vanish into a fake confirm). */
export async function submitPlanRequest(input: {
  name: string; email: string; phone?: string;
  activities: string[]; people: number; dates?: string; totalLabel?: string;
}): Promise<{ ok: boolean }> {
  if (!input.name?.trim() || !input.email?.trim()) return { ok: false };
  const ip = (await headers()).get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  if (overLimit(`lead:${ip}`, 6, 10 * 60 * 1000)) return { ok: false };
  const res = await createLead({
    kind: "contact",
    name: input.name, email: input.email, phone: input.phone,
    payload: {
      type: "Custom plan request",
      activities: input.activities.slice(0, 20).join(", "),
      people: String(input.people),
      dates: input.dates ?? "—",
      estimated: input.totalLabel ?? "—",
    },
  });

  // the guest gets a copy too - otherwise "request sent" leaves no trace
  const apiKey = process.env.RESEND_API_KEY;
  const guestEmail = input.email.trim();
  if (res.ok && apiKey && /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(guestEmail)) {
    const send = () => fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: process.env.EMAIL_FROM ?? "TutCasa <admin@tutcasa.com>",
        to: [guestEmail],
        subject: "We got your custom tour request \u{1F334} \u2014 TutCasa",
        text: [
          `Hola ${input.name.trim()}! \u{1F44B}`,
          "",
          "Thanks for your custom tour request \u2014 our team is on it and will get back to you shortly (usually within a few hours) with a plan and final price.",
          "",
          "Your request:",
          `\u2022 Activities: ${input.activities.slice(0, 20).join(", ") || "—"}`,
          `\u2022 People: ${input.people}`,
          `\u2022 Dates: ${input.dates ?? "—"}`,
          input.totalLabel ? `\u2022 Estimated total: ${input.totalLabel}` : "",
          "",
          "Want to add or change anything? Just reply to this email.",
          "",
          "\u2014 The TutCasa family",
        ].filter(Boolean).join("\n"),
      }),
    }).catch(() => {});
    void import("next/server").then(({ after }) => after(send)).catch(() => void send());
  }
  return res;
}
