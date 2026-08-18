"use server";

import { getDb } from "@/lib/db";
import { renderEmailHtml, fillVars } from "@/modules/emails";

/** Emails the INVOICE ITSELF (all lines + totals in the branded layout),
    not just a link. The unguessable booking id is the auth. */
export async function emailInvoiceAction(
  bookingId: string,
  to: string,
): Promise<{ ok: boolean; message: string }> {
  if (!/^[0-9a-f-]{36}$/i.test(bookingId)) return { ok: false, message: "Invalid invoice." };
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(to.trim())) return { ok: false, message: "Enter a valid email address." };
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return { ok: false, message: "Email isn't configured yet." };

  const res = await getDb().query(
    `select b.invoice_no, b.guest_name, b.total_cents, b.currency, b.guests,
            b.price_breakdown, b.coupon_code, b.coupon_discount_cents,
            to_char(lower(b.stay),'YYYY-MM-DD') as ci,
            to_char(upper(b.stay),'YYYY-MM-DD') as co,
            l.title, l.city
       from bookings b join listings l on l.id = b.listing_id
      where b.id = $1`,
    [bookingId],
  );
  const b = res.rows[0];
  if (!b) return { ok: false, message: "Invoice not found." };

  const money = (c: number) => `$${new Intl.NumberFormat("en-US").format(Math.round(Math.abs(c) / 100))} ${b.currency}`;
  const p = b.price_breakdown ?? {};
  const lines: string[] = [
    `- Accommodation (${p.nights ?? "?"} nights): ${money(p.accommodationCents ?? 0)}`,
  ];
  if (p.lengthDiscountCents > 0) lines.push(`- Length-of-stay discount: −${money(p.lengthDiscountCents)}`);
  if (p.earlyBirdDiscountCents > 0) lines.push(`- Early-bird discount: −${money(p.earlyBirdDiscountCents)}`);
  if (p.extraGuestFeeCents > 0) lines.push(`- Extra guests: ${money(p.extraGuestFeeCents)}`);
  if (p.cleaningCents > 0) lines.push(`- Cleaning fee: ${money(p.cleaningCents)}`);
  if (p.cityFeeCents > 0) lines.push(`- City fee: ${money(p.cityFeeCents)}`);
  if (p.taxCents > 0) lines.push(`- Taxes: ${money(p.taxCents)}`);
  if (b.coupon_code) lines.push(`- Coupon ${b.coupon_code}: −${money(b.coupon_discount_cents)}`);
  lines.push(`- TOTAL: ${money(b.total_cents)}`);
  if ((p.balanceCents ?? 0) > 0) {
    lines.push(`- Due at booking: ${money(p.dueNowCents ?? 0)}`);
    lines.push(`- Balance due${p.balanceDueDate ? ` by ${String(p.balanceDueDate).slice(0, 10)}` : ""}: ${money(p.balanceCents)}`);
  }

  const subject = `Invoice #${b.invoice_no} — ${b.title}`;
  const body = [
    `Hola ${String(b.guest_name).split(" ")[0]},`,
    ``,
    `Here is your invoice for ${b.title} — ${b.city} (${b.ci} → ${b.co}, ${b.guests} guests):`,
    ``,
    ...lines,
    ``,
    `Questions? May is one message away on WhatsApp.`,
  ].join("\n");

  const send = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: process.env.EMAIL_FROM ?? "TutCasa <bookings@tutcasa.com>",
      to: [to.trim()],
      subject,
      html: renderEmailHtml({ subject, body }),
      text: fillVars(body),
    }),
  });
  if (!send.ok) return { ok: false, message: "Sending failed — try again in a minute." };
  await getDb().query(
    `insert into notifications_log (kind, channel, recipient, subject, body, booking_id, status)
     values ('invoice_email','email',$1,$2,$3,$4,'sent')`,
    [to.trim(), subject, body.slice(0, 4000), bookingId],
  );
  return { ok: true, message: `Invoice sent to ${to.trim()}.` };
}
