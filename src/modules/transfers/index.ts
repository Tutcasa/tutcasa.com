import "server-only";
import { getDb } from "@/lib/db";

/**
 * Free ARRIVAL airport transfers (departure not included) — fulfilled by
 * Amanah Vacations, TutCasa's transfer & tours agent.
 *
 * Flow: the form is filled in TutCasa's admin OR by the guest on their
 * booking page → pushed to Amanah's admin queue over the partner API
 * (plus an instant email — true auto-WhatsApp waits for the Business
 * API) → Amanah drives the status: requested → confirmed |
 * need_details (+note, loops back) → done. Guest↔Amanah contact is a
 * prefilled WhatsApp deep link that never includes TutCasa.
 */

export interface Transfer {
  id: string;
  bookingId: string;
  fullName: string;
  travelDate: string;
  flightNumber: string;
  passengers: number;
  babySeat: boolean;
  note: string | null;
  status: "requested" | "confirmed" | "need_details" | "done" | "cancelled";
  amanahNote: string | null;
  sentAt: string | null;
  filledBy: "admin" | "guest";
  // joined booking context
  invoiceNo: string;
  listingTitle: string;
  listingCity: string;
  checkIn: string;
  guestPhone: string | null;
}

const SELECT = `
  t.id, t.booking_id, t.full_name, t.travel_date, t.flight_number,
  t.passengers, t.baby_seat, t.note, t.status, t.amanah_note, t.sent_at,
  t.filled_by, b.invoice_no, b.guest_phone,
  to_char(lower(b.stay),'YYYY-MM-DD') as check_in,
  l.title, l.city`;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function toTransfer(r: any): Transfer {
  return {
    id: r.id, bookingId: r.booking_id, fullName: r.full_name,
    travelDate: typeof r.travel_date === "string" ? r.travel_date.slice(0, 10) : new Date(r.travel_date).toISOString().slice(0, 10),
    flightNumber: r.flight_number, passengers: r.passengers,
    babySeat: r.baby_seat, note: r.note, status: r.status,
    amanahNote: r.amanah_note, sentAt: r.sent_at, filledBy: r.filled_by,
    invoiceNo: String(r.invoice_no ?? ""), listingTitle: r.title,
    listingCity: r.city, checkIn: r.check_in, guestPhone: r.guest_phone,
  };
}

export async function listTransfers(): Promise<Transfer[]> {
  const res = await getDb().query(
    `select ${SELECT}
       from transfers t
       join bookings b on b.id = t.booking_id
       join listings l on l.id = b.listing_id
      order by t.travel_date, t.created_at`,
  );
  return res.rows.map(toTransfer);
}

export async function transferForBooking(bookingId: string): Promise<Transfer | null> {
  const res = await getDb().query(
    `select ${SELECT}
       from transfers t
       join bookings b on b.id = t.booking_id
       join listings l on l.id = b.listing_id
      where t.booking_id = $1`,
    [bookingId],
  );
  return res.rows[0] ? toTransfer(res.rows[0]) : null;
}

export interface TransferInput {
  bookingId: string;
  fullName: string;
  travelDate: string;
  flightNumber: string;
  passengers: number;
  babySeat: boolean;
  note?: string;
  filledBy: "admin" | "guest";
}

/** Create or update the booking's transfer, then push it to Amanah. */
export async function upsertTransfer(
  input: TransferInput,
): Promise<{ ok: boolean; message: string; transfer?: Transfer }> {
  if (!input.fullName.trim()) return { ok: false, message: "The traveler's full name is required." };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.travelDate)) return { ok: false, message: "Pick the day of travel." };
  if (!input.flightNumber.trim()) return { ok: false, message: "The flight number is required." };

  const db = getDb();
  const res = await db.query(
    `insert into transfers
       (booking_id, full_name, travel_date, flight_number, passengers,
        baby_seat, note, filled_by, status)
     values ($1,$2,$3,$4,$5,$6,$7,$8,'requested')
     on conflict (booking_id) do update set
       full_name=$2, travel_date=$3, flight_number=$4, passengers=$5,
       baby_seat=$6, note=$7, filled_by=$8,
       status='requested', amanah_note=null
     returning id`,
    [input.bookingId, input.fullName.trim(), input.travelDate,
     input.flightNumber.trim().toUpperCase(), input.passengers,
     input.babySeat, input.note?.trim() || null, input.filledBy],
  );
  const id = res.rows[0].id as string;
  const transfer = await transferForBooking(input.bookingId);
  if (!transfer) return { ok: false, message: "Could not load the saved transfer." };

  const push = await pushToAmanah(transfer);
  await notifyAmanahEmail(transfer).catch(() => {});
  if (push.ok) {
    await db.query("update transfers set sent_at=now() where id=$1", [id]);
    return { ok: true, message: "Transfer sent to Amanah — status: Requested.", transfer };
  }
  // the details CHANGED but the push failed — the old sent_at would show
  // "delivered" while Amanah still holds stale flight info
  await db.query("update transfers set sent_at=null where id=$1", [id]);
  return {
    ok: true,
    message: "Transfer saved. Heads-up: the automatic push to Amanah didn't go through — use Resend, or Amanah will get it by email.",
    transfer,
  };
}

/** Server-to-server push into Amanah's transfer queue. */
export async function pushToAmanah(t: Transfer): Promise<{ ok: boolean }> {
  const base = process.env.AMANAH_SITE_URL ?? "https://amanahvacations.com";
  const key = process.env.AMANAH_PARTNER_KEY;
  if (!key) return { ok: false };
  try {
    const res = await fetch(`${base}/api/partner/tutcasa-transfers`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-partner-key": key },
      body: JSON.stringify({
        transferId: t.id,
        ref: `TC-${t.invoiceNo}`,
        fullName: t.fullName,
        travelDate: t.travelDate,
        flightNumber: t.flightNumber,
        passengers: t.passengers,
        babySeat: t.babySeat,
        note: t.note,
        guestPhone: t.guestPhone,
        home: `${t.listingTitle} — ${t.listingCity}`,
        checkIn: t.checkIn,
        status: t.status,
      }),
      signal: AbortSignal.timeout(15_000),
    });
    return { ok: res.ok };
  } catch {
    return { ok: false };
  }
}

/** Instant email to Amanah's ops inbox (works today; WhatsApp API later). */
export async function notifyAmanahEmail(t: Transfer): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  const to = process.env.AMANAH_NOTIFY_EMAIL;
  if (!apiKey || !to) return;
  await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: process.env.EMAIL_FROM ?? "TutCasa <onboarding@resend.dev>",
      to: [to],
      subject: `🚐 Airport transfer TC-${t.invoiceNo} — ${t.travelDate} · ${t.flightNumber}`,
      text: [
        `New/updated arrival transfer from TutCasa:`,
        ``,
        `Ref: TC-${t.invoiceNo}`,
        `Name: ${t.fullName}`,
        `Day of travel: ${t.travelDate}`,
        `Flight: ${t.flightNumber}`,
        `Passengers: ${t.passengers}`,
        `Baby seat: ${t.babySeat ? "YES" : "no"}`,
        `Drop-off: ${t.listingTitle} — ${t.listingCity}`,
        `Guest phone: ${t.guestPhone ?? "—"}`,
        t.note ? `Note: ${t.note}` : ``,
        ``,
        `Confirm or request details in your Amanah admin → Transfers.`,
      ].filter(Boolean).join("\n"),
    }),
  });
}

/** Amanah's status callback (confirmed / need_details / done). */
export async function setTransferStatus(
  transferId: string,
  status: "confirmed" | "need_details" | "done",
  note?: string,
): Promise<boolean> {
  // non-UUID ids must be a clean 404, not a Postgres cast error (500)
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(transferId)) {
    return false;
  }
  const res = await getDb().query(
    `update transfers set status=$2,
            amanah_note = case when $2 = 'need_details' then $3 else amanah_note end
      where id=$1 and status <> 'cancelled' returning id`,
    [transferId, status, note?.trim() || null],
  );
  return (res.rowCount ?? 0) > 0;
}
