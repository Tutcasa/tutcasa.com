import "server-only";
import { getDb } from "@/lib/db";

/**
 * Email automations — admin-editable templates rendered into the branded
 * TutCasa layout (email-safe table HTML, inline styles). The M3 scheduler
 * dispatches these on their triggers; until then the admin can edit,
 * preview and test-send every automation.
 */

export interface EmailAutomation {
  id: string;
  key: string;
  name: string;
  audience: "guest" | "admin";
  triggerEvent: string;
  offsetDays: number;
  enabled: boolean;
  builtin: boolean;
  subject: string;
  body: string;
  sort: number;
}

export const TRIGGER_LABELS: Record<string, string> = {
  booking_request: "When a booking request / instant booking arrives",
  booking_confirmed: "When a booking is confirmed",
  second_payment_due: "When the second payment comes due",
  payment_receipt: "After each completed payment",
  before_checkin: "N days before check-in",
  before_checkout: "N days before check-out",
  custom: "Manual / custom",
};

/** variables available in subjects & bodies, shown in the admin editor */
export const TEMPLATE_VARS = [
  "guest_name", "guest_email", "listing", "check_in", "check_out", "guests",
  "total", "balance", "balance_due_date", "amount_paid", "invoice_link",
  "checkin_message", "checkout_message", "checkin_from", "checkout_until",
  "booking_kind", "source",
] as const;

export async function listAutomations(): Promise<EmailAutomation[]> {
  const res = await getDb().query(
    `select id, key, name, audience, trigger_event, offset_days, enabled,
            builtin, subject, body, sort
       from email_automations order by sort, name`,
  );
  return res.rows.map((r) => ({
    id: r.id, key: r.key, name: r.name, audience: r.audience,
    triggerEvent: r.trigger_event, offsetDays: r.offset_days,
    enabled: r.enabled, builtin: r.builtin, subject: r.subject,
    body: r.body, sort: r.sort,
  }));
}

export async function getAutomation(key: string): Promise<EmailAutomation | null> {
  const all = await listAutomations();
  return all.find((a) => a.key === key) ?? null;
}

/* ---------------- rendering ---------------- */

const SAMPLE: Record<string, string> = {
  guest_name: "Sarah",
  guest_email: "sarah@example.com",
  listing: "Casa Selva — Tulum",
  check_in: "2026-10-05",
  check_out: "2026-10-12",
  guests: "4",
  total: "$2,820 USD",
  balance: "$1,974 USD",
  balance_due_date: "2026-09-21",
  amount_paid: "$846 USD",
  invoice_link: "https://tutcasa.com/invoice/…",
  checkin_message: "The key box code and directions are below — the pool towels are in the hallway closet!",
  checkout_message: "Please leave the keys in the box and let us know when you head out.",
  checkin_from: "15:00",
  checkout_until: "11:00",
  booking_kind: "booking request",
  source: "direct",
};

export function fillVars(text: string, vars: Record<string, string> = {}): string {
  return text.replace(/\{\{\s*([a-z_]+)\s*\}\}/g, (_, k) => vars[k] ?? SAMPLE[k] ?? `{{${k}}}`);
}

const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/** body text → email paragraphs; "- " lines become a light list card */
function bodyToHtml(body: string): string {
  const lines = body.split("\n");
  const out: string[] = [];
  let list: string[] = [];
  const flush = () => {
    if (!list.length) return;
    out.push(
      `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#FFF6EC;border-radius:14px;margin:14px 0;"><tr><td style="padding:14px 18px;">` +
      list.map((li) => `<div style="padding:3px 0;color:#3A2C28;font-size:15px;line-height:1.5;">${li}</div>`).join("") +
      `</td></tr></table>`,
    );
    list = [];
  };
  for (const raw of lines) {
    const line = raw.trim();
    if (!line) { flush(); continue; }
    if (line.startsWith("- ")) list.push(esc(line.slice(2)));
    else { flush(); out.push(`<p style="margin:12px 0;color:#3A2C28;font-size:15px;line-height:1.6;">${esc(line)}</p>`); }
  }
  flush();
  return out.join("");
}

/** the branded wrapper — table-based + inline styles so every client renders it */
export function renderEmailHtml(opts: {
  subject: string;
  body: string;
  vars?: Record<string, string>;
}): string {
  const subject = esc(fillVars(opts.subject, opts.vars));
  const inner = bodyToHtml(fillVars(opts.body, opts.vars));
  return `<!doctype html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${subject}</title></head>
<body style="margin:0;padding:0;background:#FFF6EC;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#FFF6EC;padding:28px 12px;">
    <tr><td align="center">
      <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">
        <tr><td style="padding:0 8px 16px;" align="center">
          <div style="font-family:'Baloo 2','Trebuchet MS',Arial,sans-serif;font-weight:800;font-size:26px;color:#E4326B;">TutCasa</div>
          <div style="font-family:Arial,sans-serif;font-size:11px;letter-spacing:1px;color:#8A7A72;text-transform:uppercase;">A king in your own house</div>
        </td></tr>
        <tr><td style="background:#FFFDF9;border-radius:22px;padding:30px 32px;font-family:Arial,Helvetica,sans-serif;box-shadow:0 4px 14px rgba(58,44,40,.06);">
          <h1 style="margin:0 0 6px;font-family:'Baloo 2','Trebuchet MS',Arial,sans-serif;font-size:21px;color:#3A2C28;">${subject}</h1>
          <div style="height:3px;width:52px;background:#E4326B;border-radius:2px;margin:10px 0 16px;"></div>
          ${inner}
        </td></tr>
        <tr><td style="padding:18px 10px;text-align:center;font-family:Arial,sans-serif;font-size:12px;color:#8A7A72;line-height:1.6;">
          TutCasa · Riviera Maya · Egypt · Florida<br>
          Questions? Message May on WhatsApp — we answer in minutes.
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;
}

/* ---------------- test sending ---------------- */

export async function sendTestEmail(
  key: string,
  to: string,
): Promise<{ ok: boolean; message: string }> {
  const a = await getAutomation(key);
  if (!a) return { ok: false, message: "Automation not found." };
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return { ok: false, message: "RESEND_API_KEY is not configured." };

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: process.env.EMAIL_FROM ?? "TutCasa <onboarding@resend.dev>",
      to: [to],
      subject: `[TEST] ${fillVars(a.subject)}`,
      html: renderEmailHtml({ subject: a.subject, body: a.body }),
    }),
  });
  if (!res.ok) {
    const err = await res.text();
    return { ok: false, message: `Resend refused it: ${err.slice(0, 160)}` };
  }
  return { ok: true, message: `Test sent to ${to} (sample data).` };
}
