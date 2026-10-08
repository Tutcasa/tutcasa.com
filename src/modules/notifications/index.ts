import "server-only";
import { getDb } from "@/lib/db";
import { teamEmails } from "@/lib/team-emails";

/**
 * Notifications module. Every outbound message is recorded in
 * notifications_log; delivery is best-effort per channel:
 *  - email: Resend when RESEND_API_KEY is set, otherwise logged as
 *    'manual' so the admin can send it by hand
 *  - whatsapp: no Business API wired yet — we always log a prefilled
 *    wa.me link as 'manual' for one-click sending from the admin
 */

const AMANAH_EMAIL = process.env.AMANAH_NOTIFY_EMAIL || "booking@amanahvacations.com";
const AMANAH_WHATSAPP = (process.env.AMANAH_WHATSAPP || "+529903516948").replace(/[^\d]/g, "");
const FROM_EMAIL = process.env.NOTIFY_FROM_EMAIL || process.env.EMAIL_FROM || "TutCasa <admin@tutcasa.com>";

interface EmailJob {
  kind: string;
  to: string;
  subject: string;
  body: string; // plain text
  tourBookingId?: string;
  bookingId?: string;
}

async function log(
  job: { kind: string; channel: "email" | "whatsapp"; recipient: string; subject?: string; body: string; tourBookingId?: string; bookingId?: string },
  status: "sent" | "failed" | "manual",
  error?: string,
) {
  await getDb().query(
    `insert into notifications_log (kind, channel, recipient, subject, body, tour_booking_id, booking_id, status, error)
     values ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
    [job.kind, job.channel, job.recipient, job.subject ?? null, job.body,
     job.tourBookingId ?? null, job.bookingId ?? null, status, error ?? null],
  );
}

async function sendEmail(job: EmailJob): Promise<void> {
  const key = process.env.RESEND_API_KEY;
  if (!key) {
    await log({ ...job, channel: "email", recipient: job.to }, "manual",
      "RESEND_API_KEY not configured — send manually");
    return;
  }
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: FROM_EMAIL, to: [job.to], subject: job.subject, text: job.body,
        // branded layout + the contact-info footer every guest email carries
        html: (await import("@/modules/emails")).renderEmailHtml({ subject: job.subject, body: job.body }),
      }),
    });
    if (!res.ok) throw new Error(`resend ${res.status}: ${await res.text()}`);
    await log({ ...job, channel: "email", recipient: job.to }, "sent");
  } catch (e) {
    await log({ ...job, channel: "email", recipient: job.to }, "failed", (e as Error).message);
  }
}

export interface TourBookingNotification {
  tourBookingId: string;
  tourTitle: string;
  tourDate: string;
  groupSize: number;
  totalLabel: string;
  guestName: string;
  guestEmail: string;
  guestPhone?: string | null;
  notes?: string | null;
  ref: string;
  /** true only for tours synced from Amanah — local tours never ping them */
  partnerTour: boolean;
  /** guest pays on the checkout page right now — skip the request email */
  instantPay?: boolean;
}

/** wa.me deep link with the partner operation message prefilled. */
export function amanahWhatsAppLink(n: TourBookingNotification): string {
  const msg =
    `🌴 New TutCasa tour booking ${n.ref}\n\n` +
    `Tour: ${n.tourTitle}\nDate: ${n.tourDate}\nPeople: ${n.groupSize}\nTotal: ${n.totalLabel}\n\n` +
    `Guest: ${n.guestName}\n${n.guestPhone ? `Guest phone: ${n.guestPhone}\n` : ""}` +
    `${n.notes ? `Notes: ${n.notes}\n` : ""}\nPlease confirm you can operate this tour. Thank you!`;
  return `https://wa.me/${AMANAH_WHATSAPP}?text=${encodeURIComponent(msg)}`;
}

/** Fire all notifications for a fresh tour booking (never throws). */
export async function notifyTourBooking(n: TourBookingNotification): Promise<void> {
  const summary =
    `Tour: ${n.tourTitle}\nDate: ${n.tourDate}\nPeople: ${n.groupSize}\nTotal: ${n.totalLabel}\n\n` +
    `Guest: ${n.guestName}\nEmail: ${n.guestEmail}\n` +
    `${n.guestPhone ? `Phone: ${n.guestPhone}\n` : ""}${n.notes ? `Notes: ${n.notes}\n` : ""}` +
    `\nBooking ref: ${n.ref}`;

  try {
    // 0. Amanah's admin queue — server-to-server push (their site shows
    //    the booking instantly; email + WhatsApp below stay the fallback).
    //    ONLY for Amanah's own tours — TutCasa's local tours are none of
    //    their business.
    const amanahKey = n.partnerTour ? process.env.AMANAH_PARTNER_KEY : undefined;
    if (amanahKey) {
      await fetch(`${process.env.AMANAH_SITE_URL ?? "https://amanahvacations.com"}/api/partner/tutcasa-tours`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-partner-key": amanahKey },
        body: JSON.stringify({
          bookingId: n.tourBookingId,
          ref: n.ref,
          tourTitle: n.tourTitle,
          tourDate: n.tourDate,
          groupSize: n.groupSize,
          totalLabel: n.totalLabel,
          guestName: n.guestName,
          guestEmail: n.guestEmail,
          guestPhone: n.guestPhone ?? null,
          notes: n.notes ?? null,
          status: "new",
        }),
        signal: AbortSignal.timeout(15_000),
      }).catch(() => {});
    }

    // 1. partner email → Amanah Vacations (their tours only)
    if (n.partnerTour) await sendEmail({
      kind: "tour_booking_partner_email",
      to: AMANAH_EMAIL,
      subject: `New tour booking ${n.ref} — ${n.tourTitle} (${n.tourDate})`,
      body:
        `Hello Amanah Vacations,\n\nA new tour was booked through TutCasa. ` +
        `Please confirm you can operate it.\n\n${summary}\n\n— TutCasa`,
      tourBookingId: n.tourBookingId,
    });

    // 2. partner WhatsApp — logged as a one-click manual link until the
    //    WhatsApp Business API is connected
    if (n.partnerTour) await log({
      kind: "tour_booking_partner_whatsapp",
      channel: "whatsapp",
      recipient: `+${AMANAH_WHATSAPP}`,
      body: amanahWhatsAppLink(n),
      tourBookingId: n.tourBookingId,
    }, "manual");

    // 3. internal email → TutCasa
    for (const teamTo of teamEmails()) {
      await sendEmail({
        kind: "tour_booking_tutcasa_email",
        to: teamTo,
        subject: `Tour booked ${n.ref}: ${n.tourTitle} · ${n.tourDate} · ${n.groupSize}p`,
        body: `New tour booking on the platform.\n\n${summary}`,
        tourBookingId: n.tourBookingId,
      });
    }

    // 4. guest email — two flows:
    //    • partner (Amanah) tours are INSTANT: the guest is paying on the
    //      checkout page right now, so no email here — the "payment
    //      received, you're booked" one fires from the Stripe webhook
    //    • our own tours are REQUEST-FIRST: nothing is charged; the guest
    //      learns the payment link comes once the tour is accepted
    if (!(n.instantPay ?? n.partnerTour)) {
      await sendEmail({
        kind: "tour_booking_guest_email",
        to: n.guestEmail,
        subject: `Your TutCasa tour request ${n.ref} — ${n.tourTitle}`,
        body:
          `Hola ${n.guestName}! 👋\n\nWe received your tour request and our team ` +
          `is checking availability now.\n\n${summary}\n\n` +
          `Nothing has been charged. As soon as your tour is accepted, we'll ` +
          `email you a secure payment link to confirm your spot.\n\n— The TutCasa family`,
        tourBookingId: n.tourBookingId,
      });
    }

    if (n.partnerTour) await getDb().query(
      "update tour_bookings set partner_notified_at = now() where id = $1",
      [n.tourBookingId],
    );
  } catch (e) {
    // notifications must never break the booking itself
    console.error("notifyTourBooking failed:", e);
  }
}

const tourRow = async (id: string) => (await getDb().query(
  `select tb.id, tb.guest_name, tb.guest_email, tb.group_size, tb.total_cents, tb.currency,
          to_char(tb.tour_date,'YYYY-MM-DD') as tour_date, t.title
     from tour_bookings tb join tours t on t.id = tb.tour_id where tb.id = $1`, [id],
)).rows[0];

const tourMoney = (cents: number, cur: string) =>
  `$${Math.round(cents / 100).toLocaleString("en-US")} ${cur}`;

/**
 * Instant-pay tours (all Amanah tours + our own "Instant booking" tours):
 * Amanah and the TutCasa team hear about the booking only once it's PAID —
 * an abandoned checkout must not reach Amanah's queue. Called by the payment
 * recorder on the FIRST payment. Request-first tours already notified at
 * request time, so they're skipped here.
 */
export async function notifyPaidTourBooking(tourBookingId: string): Promise<void> {
  const b = (await getDb().query(
    `select tb.id, tb.guest_name, tb.guest_email, tb.guest_phone, tb.notes, tb.group_size,
            tb.total_cents, tb.currency, to_char(tb.tour_date,'YYYY-MM-DD') as tour_date,
            t.title, t.source, coalesce(t.instant_book,false) as instant_book
       from tour_bookings tb join tours t on t.id = tb.tour_id where tb.id = $1`, [tourBookingId],
  )).rows[0];
  if (!b) return;
  const partnerTour = b.source === "amanah";
  if (!partnerTour && !b.instant_book) return;
  await notifyTourBooking({
    tourBookingId: b.id,
    tourTitle: b.title,
    tourDate: b.tour_date,
    groupSize: b.group_size,
    totalLabel: b.currency === "MXN"
      ? `${(b.total_cents / 100).toLocaleString("en-US")} MXN`
      : `$${Math.round(b.total_cents / 100).toLocaleString("en-US")} ${b.currency}`,
    guestName: b.guest_name,
    guestEmail: b.guest_email,
    guestPhone: b.guest_phone,
    notes: b.notes,
    ref: String(b.id).slice(0, 8).toUpperCase(),
    partnerTour,
    instantPay: true,
  });
}

/** Instant (Amanah) tours: fired by the Stripe webhook once payment lands. */
export async function sendTourPaidGuestEmail(tourBookingId: string): Promise<void> {
  try {
    const b = await tourRow(tourBookingId);
    if (!b) return;
    await sendEmail({
      kind: "tour_paid_guest_email",
      to: b.guest_email,
      subject: `You're booked! 🎉 ${b.title} — ${b.tour_date}`,
      body:
        `Hola ${String(b.guest_name).split(" ")[0]}! 👋\n\n` +
        `Payment received — your tour is booked!\n\n` +
        `Tour: ${b.title}\nDate: ${b.tour_date}\nPeople: ${b.group_size}\n` +
        `Paid: ${tourMoney(b.total_cents, b.currency)}\n\n` +
        `The tour operator confirms your exact pickup time and meeting point ` +
        `within 24 hours.\n\n— The TutCasa family`,
      tourBookingId,
    });
  } catch (e) {
    console.error("sendTourPaidGuestEmail failed:", e);
  }
}

/** Request-first tours: the admin accepted — email the guest their secure
    payment link (the invoice page, which takes card payment directly). */
export async function sendTourPaymentLinkEmail(tourBookingId: string): Promise<{ ok: boolean; message: string }> {
  const b = await tourRow(tourBookingId);
  if (!b) return { ok: false, message: "Booking not found." };
  const site = process.env.SITE_URL ?? "https://tutcasa-platform.vercel.app";
  await sendEmail({
    kind: "tour_payment_link_email",
    to: b.guest_email,
    subject: `Your tour is accepted! 🌴 ${b.title} — complete your payment`,
    body:
      `Hola ${String(b.guest_name).split(" ")[0]}! 👋\n\n` +
      `Great news — your tour has been accepted:\n\n` +
      `Tour: ${b.title}\nDate: ${b.tour_date}\nPeople: ${b.group_size}\n` +
      `Total: ${tourMoney(b.total_cents, b.currency)}\n\n` +
      `Pay securely here to confirm your spot:\n${site}/invoice/${b.id}\n\n` +
      `— The TutCasa family`,
    tourBookingId,
  });
  return { ok: true, message: `Payment link emailed to ${b.guest_email}.` };
}
