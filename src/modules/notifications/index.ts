import "server-only";
import { getDb } from "@/lib/db";

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
const TUTCASA_EMAIL = process.env.TUTCASA_NOTIFY_EMAIL || "";
const FROM_EMAIL = process.env.NOTIFY_FROM_EMAIL || "TutCasa <onboarding@resend.dev>";

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
      body: JSON.stringify({ from: FROM_EMAIL, to: [job.to], subject: job.subject, text: job.body }),
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
    // 1. partner email → Amanah Vacations
    await sendEmail({
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
    await log({
      kind: "tour_booking_partner_whatsapp",
      channel: "whatsapp",
      recipient: `+${AMANAH_WHATSAPP}`,
      body: amanahWhatsAppLink(n),
      tourBookingId: n.tourBookingId,
    }, "manual");

    // 3. internal email → TutCasa
    if (TUTCASA_EMAIL) {
      await sendEmail({
        kind: "tour_booking_tutcasa_email",
        to: TUTCASA_EMAIL,
        subject: `Tour booked ${n.ref}: ${n.tourTitle} · ${n.tourDate} · ${n.groupSize}p`,
        body: `New tour booking on the platform.\n\n${summary}`,
        tourBookingId: n.tourBookingId,
      });
    }

    // 4. guest confirmation email
    await sendEmail({
      kind: "tour_booking_guest_email",
      to: n.guestEmail,
      subject: `Your TutCasa tour request ${n.ref} — ${n.tourTitle}`,
      body:
        `Hola ${n.guestName}! 👋\n\nWe received your tour booking and our team ` +
        `is confirming it with the operator now.\n\n${summary}\n\n` +
        `We'll be in touch shortly to complete payment and confirm.\n\n— The TutCasa family`,
      tourBookingId: n.tourBookingId,
    });

    await getDb().query(
      "update tour_bookings set partner_notified_at = now() where id = $1",
      [n.tourBookingId],
    );
  } catch (e) {
    // notifications must never break the booking itself
    console.error("notifyTourBooking failed:", e);
  }
}
