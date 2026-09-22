import "server-only";
import { getDb } from "@/lib/db";

/**
 * Early check-in / late check-out — the "hotel" flow:
 *
 *   1. the guest REQUESTS it at booking — nothing is charged
 *   2. 48h before the moment in question (check-in for early, check-out
 *      for late) the sweep checks the calendar:
 *        · adjacent night free → CONFIRMED, the guest gets a payment link
 *        · adjacent night taken → DECLINED, guest told, nothing charged
 *   3. when the guest PAYS, the adjacent night is blocked, so the promise
 *      can no longer be broken by a late booking
 *   4. unpaid confirmations expire at check-in (no charge, no block)
 *
 * The daily double-booking alert still watches these as a safety net.
 */

export type ExtraKind = "early_checkin" | "late_checkout";

export const EXTRA_LABEL: Record<ExtraKind, string> = {
  early_checkin: "Early check-in",
  late_checkout: "Late check-out",
};

/** Hours before the moment we decide (and charge). */
const DECIDE_HOURS = 48;

const SITE = process.env.SITE_URL ?? "https://tutcasa-platform.vercel.app";

export interface BookingExtra {
  id: string;
  bookingId: string;
  kind: ExtraKind;
  feeCents: number;
  currency: string;
  status: string;
}

/** Record the guest's requests at booking time (no charge, no hold). */
export async function requestExtras(
  bookingId: string,
  listingId: string,
  kinds: ExtraKind[],
): Promise<void> {
  if (!kinds.length) return;
  const fees = (await getDb().query<{ early: number; late: number }>(
    `select coalesce(early_checkin_cents,0) as early, coalesce(late_checkout_cents,0) as late
       from listing_pricing where listing_id = $1`, [listingId])).rows[0];
  if (!fees) return;
  for (const kind of [...new Set(kinds)]) {
    const fee = kind === "early_checkin" ? Number(fees.early) : Number(fees.late);
    if (!(fee > 0)) continue; // the home doesn't offer it
    await getDb().query(
      `insert into booking_extras (booking_id, kind, fee_cents)
       values ($1,$2,$3) on conflict (booking_id, kind) do nothing`,
      [bookingId, kind, fee],
    ).catch(() => {});
  }
}

export async function extrasForBooking(bookingId: string): Promise<BookingExtra[]> {
  const r = await getDb().query(
    `select id, booking_id, kind, fee_cents, currency, status
       from booking_extras where booking_id = $1 order by kind`, [bookingId]);
  return r.rows.map((x) => ({
    id: x.id, bookingId: x.booking_id, kind: x.kind as ExtraKind,
    feeCents: x.fee_cents, currency: x.currency, status: x.status,
  }));
}

export async function getExtra(id: string) {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
  const r = await getDb().query(
    `select e.*, b.guest_name, b.guest_email, b.status as booking_status,
            to_char(lower(b.stay),'YYYY-MM-DD') as check_in,
            to_char(upper(b.stay),'YYYY-MM-DD') as check_out,
            l.title, l.checkin_from, l.checkout_until
       from booking_extras e
       join bookings b on b.id = e.booking_id
       join listings l on l.id = b.listing_id
      where e.id = $1`, [id]);
  return r.rows[0] ?? null;
}

async function mail(to: string, subject: string, body: string, bookingId: string, kind: string) {
  const db = getDb();
  const apiKey = process.env.RESEND_API_KEY;
  let status = "manual";
  if (apiKey) {
    const { renderEmailHtml } = await import("@/modules/emails");
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: process.env.EMAIL_FROM ?? "TutCasa <admin@tutcasa.com>",
        to: [to], subject, text: body,
        html: renderEmailHtml({ subject, body }),
      }),
      signal: AbortSignal.timeout(15_000),
    }).catch(() => null);
    status = res?.ok ? "sent" : "failed";
  }
  await db.query(
    `insert into notifications_log (kind, channel, recipient, subject, body, booking_id, status)
     values ($1,'email',$2,$3,$4,$5,$6)
     on conflict (kind, booking_id, recipient) where booking_id is not null do nothing`,
    [kind, to, subject, body.slice(0, 4000), bookingId, status],
  ).catch(() => {});
}

/** The night an extra needs free: early = night before check-in,
    late = the night starting on the check-out date. */
const neededNight = (kind: ExtraKind, checkIn: string, checkOut: string) =>
  kind === "early_checkin"
    ? { from: addDays(checkIn, -1), to: checkIn }
    : { from: checkOut, to: addDays(checkOut, 1) };

function addDays(iso: string, n: number): string {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

/**
 * Decide every request whose moment is within 48h, and expire unpaid
 * confirmations once the stay has started. Safe to run repeatedly.
 */
export async function runDueExtras(): Promise<{ confirmed: number; declined: number; expired: number }> {
  const db = getDb();
  let confirmed = 0, declined = 0, expired = 0;

  // requests due for a decision (early: 48h before check-in; late: 48h
  // before check-out — the latest point we can still promise it)
  const due = await db.query(
    `select e.id, e.kind, e.fee_cents, e.currency, b.id as booking_id, b.listing_id,
            b.guest_name, b.guest_email,
            to_char(lower(b.stay),'YYYY-MM-DD') as check_in,
            to_char(upper(b.stay),'YYYY-MM-DD') as check_out,
            l.title
       from booking_extras e
       join bookings b on b.id = e.booking_id
       join listings l on l.id = b.listing_id
      where e.status = 'requested'
        and b.status in ('confirmed','completed')
        and case when e.kind = 'early_checkin'
                 then lower(b.stay) <= current_date + ($1 || ' hours')::interval
                 else upper(b.stay) <= current_date + ($1 || ' hours')::interval
            end
        and upper(b.stay) >= current_date`,
    [String(DECIDE_HOURS)],
  );

  for (const e of due.rows) {
    const night = neededNight(e.kind as ExtraKind, e.check_in, e.check_out);
    const busy = await db.query(
      `select 1 from listing_unavailable_ranges($1) u
        where daterange(u.from_date, u.to_date) && daterange($2::date, $3::date)
          and not exists (select 1 from bookings bb
                           where bb.id = $4 and bb.stay && daterange($2::date, $3::date))
        limit 1`,
      [e.listing_id, night.from, night.to, e.booking_id],
    );
    const label = EXTRA_LABEL[e.kind as ExtraKind];
    const fee = `$${Math.round(e.fee_cents / 100).toLocaleString("en-US")} ${e.currency}`;
    const first = String(e.guest_name ?? "").split(" ")[0] || "there";

    if (busy.rows[0]) {
      await db.query("update booking_extras set status='declined', decided_at=now() where id=$1", [e.id]);
      declined++;
      if (e.guest_email) {
        await mail(
          e.guest_email,
          `About your ${label.toLowerCase()} request — ${e.title}`,
          `Hola ${first},\n\nWe checked the calendar for your ${label.toLowerCase()} request at ${e.title}, ` +
          `and unfortunately the home is occupied ${e.kind === "early_checkin" ? "the night before your arrival" : "on your check-out day"}, ` +
          `so we can't offer it this time.\n\n` +
          `Nothing has been charged. Our standard times apply, and we'll always do our best to be flexible ` +
          `on the day — just message us on WhatsApp.\n\nSee you very soon!`,
          e.booking_id, "extra_declined",
        );
      }
    } else {
      await db.query("update booking_extras set status='confirmed', decided_at=now() where id=$1", [e.id]);
      confirmed++;
      if (e.guest_email) {
        await mail(
          e.guest_email,
          `Good news — your ${label.toLowerCase()} is available! (${fee})`,
          `Hola ${first},\n\nYour ${label.toLowerCase()} at ${e.title} is available. 🎉\n\n` +
          `- ${label}: ${fee}\n` +
          `- Secure it here: ${SITE}/extra/${e.id}\n\n` +
          `It's yours as soon as the payment goes through — we then hold the time for you. ` +
          `If you'd rather skip it, simply ignore this email; nothing will be charged.`,
          e.booking_id, "extra_confirmed",
        );
      }
    }
  }

  // unpaid confirmations die at check-in — never charge or block late
  const exp = await db.query(
    `update booking_extras e set status='expired'
       from bookings b
      where b.id = e.booking_id and e.status in ('requested','confirmed')
        and lower(b.stay) < current_date
      returning e.id`);
  expired = exp.rowCount ?? 0;

  return { confirmed, declined, expired };
}

/**
 * Stripe webhook: the guest paid for a confirmed extra. Marks it paid and
 * BLOCKS the adjacent night so the promise can't be broken afterwards.
 */
export async function fulfillExtraPayment(extraId: string, paymentRef: string): Promise<void> {
  const db = getDb();
  const claim = await db.query(
    `update booking_extras set status='paid', paid_at=now(), payment_ref=$2
      where id=$1 and status='confirmed' returning kind, booking_id`,
    [extraId, paymentRef],
  );
  if (!claim.rows[0]) return; // retry, or not payable
  const { kind, booking_id } = claim.rows[0];

  const b = (await db.query(
    `select listing_id, to_char(lower(stay),'YYYY-MM-DD') as ci,
            to_char(upper(stay),'YYYY-MM-DD') as co from bookings where id=$1`,
    [booking_id])).rows[0];
  if (!b) return;
  const night = neededNight(kind as ExtraKind, b.ci, b.co);
  const blk = await db.query(
    `insert into availability_blocks (listing_id, span, source)
     values ($1, daterange($2::date, $3::date), $4) returning id`,
    [b.listing_id, night.from, night.to, kind],
  ).catch(() => null);
  if (blk?.rows[0]) {
    await db.query("update booking_extras set block_id=$2 where id=$1", [extraId, blk.rows[0].id]).catch(() => {});
  }
}
