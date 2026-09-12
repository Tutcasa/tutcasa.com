import "server-only";
import { getDb } from "@/lib/db";
import { fillVars, renderEmailHtml } from "./index";

/**
 * One-off email blasts ("Send to guests") — the admin composes a message
 * and picks an audience; each guest gets it personalised with the details
 * of their most recent booking. Amanah-sourced guests are always excluded
 * (Amanah owns that guest relationship). Every send is logged in
 * notifications_log (kind 'broadcast').
 */

export type BroadcastAudience = "upcoming" | "past" | "listing" | "all";

export const AUDIENCE_LABELS: Record<BroadcastAudience, string> = {
  upcoming: "Guests with upcoming stays",
  past: "Past guests",
  listing: "Guests of one home",
  all: "All guests",
};

interface Recipient {
  email: string;
  vars: Record<string, string>;
}

async function recipientsFor(
  audience: BroadcastAudience,
  listingId?: string,
): Promise<Recipient[]> {
  const conds: string[] = [
    "b.status <> 'cancelled'",
    "b.source <> 'amanah'",
    "b.guest_email like '%@%'",
  ];
  const params: string[] = [];
  if (audience === "upcoming") {
    conds.push("b.status in ('pending','confirmed')", "upper(b.stay) >= current_date");
  } else if (audience === "past") {
    conds.push("b.status in ('confirmed','completed')", "upper(b.stay) < current_date");
  } else if (audience === "listing") {
    if (!listingId) return [];
    params.push(listingId);
    conds.push(`b.listing_id = $${params.length}`);
  }
  const res = await getDb().query(
    `select distinct on (lower(b.guest_email))
            b.guest_email, b.guest_name, b.guests,
            to_char(lower(b.stay),'YYYY-MM-DD') as check_in,
            to_char(upper(b.stay),'YYYY-MM-DD') as check_out,
            l.title, l.city
       from bookings b join listings l on l.id = b.listing_id
      where ${conds.join(" and ")}
      order by lower(b.guest_email), b.created_at desc`,
    params,
  );
  return res.rows.map((r) => ({
    email: r.guest_email as string,
    vars: {
      guest_name: (r.guest_name ?? "").split(" ")[0] || "there",
      guest_email: r.guest_email,
      listing: `${r.title} — ${r.city}`,
      check_in: r.check_in,
      check_out: r.check_out,
      guests: String(r.guests),
    },
  }));
}

export async function countBroadcastRecipients(
  audience: BroadcastAudience,
  listingId?: string,
): Promise<number> {
  return (await recipientsFor(audience, listingId)).length;
}

async function resendSend(to: string, subject: string, html: string, text: string): Promise<string | null> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return "RESEND_API_KEY is not configured.";
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: process.env.EMAIL_FROM ?? "TutCasa <admin@tutcasa.com>",
        to: [to],
        subject,
        html,
        text,
      }),
      signal: AbortSignal.timeout(15_000),
    });
    if (res.ok) return null;
    return (await res.text()).slice(0, 200);
  } catch (e) {
    return (e as Error).message.slice(0, 200);
  }
}

/** Test the composed message on one address (sample data). */
export async function sendBroadcastTest(
  subject: string,
  body: string,
  to: string,
): Promise<{ ok: boolean; message: string }> {
  const err = await resendSend(
    to,
    `[TEST] ${fillVars(subject)}`,
    renderEmailHtml({ subject, body }),
    fillVars(body),
  );
  return err
    ? { ok: false, message: `Resend refused it: ${err}` }
    : { ok: true, message: `Test sent to ${to} (sample data).` };
}

export interface ScheduledBroadcast {
  id: string;
  audience: BroadcastAudience;
  listingId: string | null;
  subject: string;
  sendAt: string;
  status: string;
  result: string | null;
}

/** Queue a blast for a future moment (sent by the dispatch cron). */
export async function scheduleBroadcast(opts: {
  audience: BroadcastAudience;
  listingId?: string;
  subject: string;
  body: string;
  sendAt: Date;
}): Promise<void> {
  await getDb().query(
    `insert into scheduled_broadcasts (audience, listing_id, subject, body, send_at)
     values ($1,$2,$3,$4,$5)`,
    [opts.audience, opts.listingId ?? null, opts.subject, opts.body, opts.sendAt],
  );
}

export async function listScheduledBroadcasts(): Promise<ScheduledBroadcast[]> {
  const res = await getDb().query(
    `select id, audience, listing_id, subject, send_at, status, result
       from scheduled_broadcasts
      where status in ('scheduled','sending') or created_at > now() - interval '7 days'
      order by send_at desc limit 30`);
  return res.rows.map((r) => ({
    id: r.id, audience: r.audience, listingId: r.listing_id,
    subject: r.subject, sendAt: r.send_at, status: r.status, result: r.result,
  }));
}

export async function cancelScheduledBroadcast(id: string): Promise<void> {
  await getDb().query(
    "update scheduled_broadcasts set status='cancelled' where id=$1 and status='scheduled'", [id]);
}

/** Send every due scheduled blast — called by the dispatch cron. The
    status flip to 'sending' claims the row, so overlapping cron runs
    can't double-send. */
export async function runDueBroadcasts(): Promise<{ sent: number }> {
  const due = await getDb().query(
    `update scheduled_broadcasts set status='sending'
      where status='scheduled' and send_at <= now()
      returning id, audience, listing_id, subject, body`);
  let n = 0;
  for (const b of due.rows) {
    const res = await sendBroadcast({
      audience: b.audience, listingId: b.listing_id ?? undefined,
      subject: b.subject, body: b.body,
    });
    await getDb().query(
      "update scheduled_broadcasts set status='sent', result=$2 where id=$1",
      [b.id, res.message.slice(0, 500)]);
    if (res.ok) n++;
  }
  return { sent: n };
}

/** Send the blast for real, one personalised email per guest. */
export async function sendBroadcast(opts: {
  audience: BroadcastAudience;
  listingId?: string;
  subject: string;
  body: string;
}): Promise<{ ok: boolean; message: string }> {
  const recipients = await recipientsFor(opts.audience, opts.listingId);
  if (!recipients.length) {
    return { ok: false, message: "That audience has no guests (Amanah guests are always excluded)." };
  }
  const db = getDb();
  let sent = 0;
  const failed: string[] = [];
  for (const r of recipients) {
    const subject = fillVars(opts.subject, r.vars);
    const err = await resendSend(
      r.email,
      subject,
      renderEmailHtml({ subject: opts.subject, body: opts.body, vars: r.vars }),
      fillVars(opts.body, r.vars),
    );
    if (err) failed.push(r.email);
    else sent++;
    await db.query(
      `insert into notifications_log (kind, channel, recipient, subject, body, status, error)
       values ('broadcast','email',$1,$2,$3,$4,$5)`,
      [r.email, subject, fillVars(opts.body, r.vars).slice(0, 4000), err ? "failed" : "sent", err],
    ).catch(() => {});
    // stay under Resend's rate limit
    await new Promise((res) => setTimeout(res, 550));
  }
  return {
    ok: sent > 0,
    message: failed.length
      ? `Sent to ${sent} guest${sent === 1 ? "" : "s"}; ${failed.length} failed (${failed.slice(0, 3).join(", ")}${failed.length > 3 ? "…" : ""}).`
      : `Sent to ${sent} guest${sent === 1 ? "" : "s"}. 🎉`,
  };
}
