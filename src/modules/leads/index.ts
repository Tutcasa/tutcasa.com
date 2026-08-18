import "server-only";
import { getDb } from "@/lib/db";

/**
 * Lead capture — every guest-facing form submission (contact,
 * list-my-property, loyalty referral, partnership, newsletter) lands in
 * the leads table, shows in admin → Leads, and emails the team.
 */

export type LeadKind = "contact" | "list_property" | "loyalty_referral" | "partnership" | "newsletter";

export interface Lead {
  id: string;
  kind: LeadKind;
  name: string;
  email: string;
  phone: string | null;
  payload: Record<string, string>;
  status: "new" | "handled";
  createdAt: string;
}

const KIND_LABEL: Record<LeadKind, string> = {
  contact: "Contact message",
  list_property: "List-my-property request",
  loyalty_referral: "Loyalty referral",
  partnership: "Partnership inquiry",
  newsletter: "Newsletter signup",
};

export async function createLead(input: {
  kind: LeadKind;
  name?: string;
  email?: string;
  phone?: string;
  payload?: Record<string, string>;
}): Promise<{ ok: boolean }> {
  const db = getDb();
  await db.query(
    `insert into leads (kind, name, email, phone, payload)
     values ($1,$2,$3,$4,$5)`,
    [input.kind, input.name?.trim() ?? "", input.email?.trim() ?? "",
     input.phone?.trim() || null, JSON.stringify(input.payload ?? {})],
  );

  // team notification — best effort, never blocks the guest
  const apiKey = process.env.RESEND_API_KEY;
  const to = process.env.TUTCASA_NOTIFY_EMAIL;
  if (apiKey && to) {
    const detail = Object.entries(input.payload ?? {})
      .map(([k, v]) => `${k}: ${v}`).join("\n");
    void fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: process.env.EMAIL_FROM ?? "TutCasa <bookings@tutcasa.com>",
        to: [to],
        subject: `📥 ${KIND_LABEL[input.kind]}${input.name ? ` — ${input.name.trim()}` : ""}`,
        text: [
          KIND_LABEL[input.kind],
          input.name ? `Name: ${input.name.trim()}` : "",
          input.email ? `Email: ${input.email.trim()}` : "",
          input.phone ? `Phone: ${input.phone.trim()}` : "",
          detail,
          "",
          "Manage it in admin → Leads.",
        ].filter(Boolean).join("\n"),
      }),
    }).catch(() => {});
  }
  return { ok: true };
}

export async function listLeads(): Promise<Lead[]> {
  const res = await getDb().query(
    `select id, kind, name, email, phone, payload, status, created_at
       from leads order by status asc, created_at desc limit 300`,
  );
  return res.rows.map((r) => ({
    id: r.id, kind: r.kind, name: r.name, email: r.email, phone: r.phone,
    payload: r.payload ?? {}, status: r.status, createdAt: r.created_at,
  }));
}
