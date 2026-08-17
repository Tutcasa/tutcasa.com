import "server-only";
import { getDb } from "@/lib/db";
import { getAutomation, fillVars, renderEmailHtml } from "./index";

/**
 * M3 dispatch — turns the admin-editable automations into real email:
 *   events  (booking_request / booking_confirmed / payment_receipt)
 *           fired from the booking flows, and
 *   schedule (before_checkin / before_checkout / second_payment_due)
 *           swept daily by /api/email-dispatch.
 *
 * Rules: every send is logged in notifications_log (kind = automation key)
 * and deduped against it, so nothing ever double-sends. Partner (Amanah)
 * bookings NEVER get guest emails — Amanah owns that guest relationship —
 * but team emails still fire. Every email ships html + plain text.
 */

const SITE = process.env.SITE_URL ?? "https://tutcasa-platform.vercel.app";

interface BookingCtx {
  id: string;
  source: string;
  status: string;
  guestEmail: string;
  vars: Record<string, string>;
  notifyEmails: string[];
}

async function bookingCtx(bookingId: string): Promise<BookingCtx | null> {
  const res = await getDb().query(
    `select b.id, b.source, b.status, b.guest_name, b.guest_email, b.guests,
            b.total_cents, b.currency, b.amount_paid_cents, b.invoice_no,
            b.price_breakdown,
            to_char(lower(b.stay),'YYYY-MM-DD') as check_in,
            to_char(upper(b.stay),'YYYY-MM-DD') as check_out,
            l.title, l.city, coalesce(l.checkin_message,'') as checkin_message,
            coalesce(l.checkout_message,'') as checkout_message,
            to_char(l.checkin_from,'HH24:MI') as checkin_from,
            to_char(l.checkout_until,'HH24:MI') as checkout_until,
            coalesce(l.notify_emails,'{}') as notify_emails
       from bookings b join listings l on l.id = b.listing_id
      where b.id = $1`,
    [bookingId],
  );
  const b = res.rows[0];
  if (!b) return null;
  const money = (cents: number) =>
    `$${new Intl.NumberFormat("en-US").format(Math.round(cents / 100))} ${b.currency}`;
  const p = b.price_breakdown ?? {};
  return {
    id: b.id,
    source: b.source,
    status: b.status,
    guestEmail: b.guest_email,
    notifyEmails: b.notify_emails ?? [],
    vars: {
      guest_name: (b.guest_name ?? "").split(" ")[0] || "there",
      guest_email: b.guest_email ?? "",
      listing: `${b.title} — ${b.city}`,
      check_in: b.check_in,
      check_out: b.check_out,
      guests: String(b.guests),
      total: money(b.total_cents),
      balance: money(Math.max(0, (p.balanceCents ?? 0))),
      balance_due_date: p.balanceDueDate ? String(p.balanceDueDate).slice(0, 10) : "",
      amount_paid: money(b.amount_paid_cents ?? 0),
      invoice_link: `${SITE}/invoice/${b.id}`,
      checkin_message: b.checkin_message,
      checkout_message: b.checkout_message,
      checkin_from: b.checkin_from,
      checkout_until: b.checkout_until,
      booking_kind: b.source === "amanah" ? "Amanah partner booking" : "booking request",
      source: b.source,
    },
  };
}

async function alreadySent(key: string, bookingId: string): Promise<boolean> {
  const res = await getDb().query(
    `select 1 from notifications_log
      where kind=$1 and booking_id=$2 and status='sent' limit 1`,
    [key, bookingId],
  );
  return (res.rowCount ?? 0) > 0;
}

async function deliver(
  key: string,
  bookingId: string,
  to: string,
  subject: string,
  html: string,
  text: string,
): Promise<void> {
  const db = getDb();
  const apiKey = process.env.RESEND_API_KEY;
  let status = "manual";
  let error: string | null = null;
  if (apiKey) {
    try {
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          from: process.env.EMAIL_FROM ?? "TutCasa <bookings@tutcasa.com>",
          to: [to],
          subject,
          html,
          text,
        }),
        signal: AbortSignal.timeout(15_000),
      });
      if (res.ok) status = "sent";
      else { status = "failed"; error = (await res.text()).slice(0, 200); }
    } catch (e) {
      status = "failed";
      error = (e as Error).message.slice(0, 200);
    }
  }
  await db.query(
    `insert into notifications_log (kind, channel, recipient, subject, body, booking_id, status, error)
     values ($1,'email',$2,$3,$4,$5,$6,$7)`,
    [key, to, subject, text.slice(0, 4000), bookingId, status, error],
  );
}

/** Send one automation for one booking (dedupes; respects enabled/audience). */
export async function sendAutomationForBooking(
  key: string,
  bookingId: string,
): Promise<void> {
  const a = await getAutomation(key);
  if (!a || !a.enabled) return;
  const ctx = await bookingCtx(bookingId);
  if (!ctx) return;
  // Amanah owns guest communication for partner bookings
  if (a.audience === "guest" && ctx.source === "amanah") return;
  if (await alreadySent(key, bookingId)) return;

  const subject = fillVars(a.subject, ctx.vars);
  const html = renderEmailHtml({ subject: a.subject, body: a.body, vars: ctx.vars });
  const text = fillVars(a.body, ctx.vars);

  const recipients =
    a.audience === "guest"
      ? [ctx.guestEmail].filter(Boolean)
      : [...new Set([...ctx.notifyEmails, process.env.TUTCASA_NOTIFY_EMAIL].filter(Boolean))] as string[];

  for (const to of recipients) {
    await deliver(key, bookingId, to, subject, html, text);
  }
}

/** Fire-and-forget wrapper for booking-flow hooks (never blocks a booking). */
export function fireAutomations(keys: string[], bookingId: string): void {
  void (async () => {
    for (const key of keys) {
      await sendAutomationForBooking(key, bookingId).catch(() => {});
    }
  })();
}

/** Daily sweep: timed automations (check-in/out reminders, balance due). */
export async function runScheduledEmails(): Promise<{ ok: boolean; sent: number; checked: number }> {
  const db = getDb();
  const autos = await db.query(
    `select key, trigger_event, offset_days, audience from email_automations where enabled`,
  );
  let sent = 0, checked = 0;

  for (const a of autos.rows) {
    let bookings: { id: string }[] = [];
    if (a.trigger_event === "before_checkin") {
      bookings = (await db.query(
        `select id from bookings where status='confirmed'
          and lower(stay) = current_date + ($1 || ' days')::interval`,
        [String(a.offset_days)],
      )).rows;
    } else if (a.trigger_event === "before_checkout") {
      bookings = (await db.query(
        `select id from bookings where status in ('confirmed')
          and upper(stay) = current_date + ($1 || ' days')::interval`,
        [String(a.offset_days)],
      )).rows;
    } else if (a.trigger_event === "second_payment_due") {
      bookings = (await db.query(
        `select id from bookings
          where status='confirmed'
            and (price_breakdown->>'balanceCents')::int > 0
            and amount_paid_cents < total_cents
            and left(price_breakdown->>'balanceDueDate', 10) = to_char(current_date, 'YYYY-MM-DD')`,
      )).rows;
    } else {
      continue;
    }
    for (const b of bookings) {
      checked++;
      const before = await alreadySent(a.key, b.id);
      await sendAutomationForBooking(a.key, b.id);
      if (!before && (await alreadySent(a.key, b.id))) sent++;
    }
  }
  return { ok: true, sent, checked };
}
