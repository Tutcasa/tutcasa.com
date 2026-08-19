import "server-only";
import { randomBytes } from "node:crypto";
import { getDb } from "@/lib/db";
import { renderEmailHtml } from "@/modules/emails";

/**
 * Growth features: the newsletter 10%-coupon signup and loyalty referral
 * links. All coupon math runs through the existing coupon engine — these
 * flows just create/issue codes and send the branded emails.
 *
 * Amounts (matching the loyalty page promise): friend gets $100 off,
 * referrer earns $200 off per completed referral, newsletter gives 10%.
 */

const SITE = process.env.SITE_URL ?? "https://tutcasa-platform.vercel.app";

function shortCode(prefix: string): string {
  return `${prefix}-${randomBytes(4).toString("hex").toUpperCase().slice(0, 6)}`;
}

async function sendBranded(to: string, subject: string, body: string): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return false;
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: process.env.EMAIL_FROM ?? "TutCasa <admin@tutcasa.com>",
      to: [to],
      subject,
      html: renderEmailHtml({ subject, body }),
      text: body,
    }),
  }).catch(() => null);
  return !!res?.ok;
}

/** Team heads-up for a new signup (the lead row is the source of truth). */
function notifyTeam(email: string, phone: string, coupon: string): void {
  const to = process.env.TUTCASA_NOTIFY_EMAIL;
  if (!to) return;
  void sendBranded(to, "Newsletter signup", [
    "New newsletter signup:",
    "",
    `- Email: ${email}`,
    `- Phone: ${phone}`,
    `- Coupon issued: ${coupon}`,
    "",
    "Manage it in admin → Leads.",
  ].join("\n")).catch(() => {});
}

/* ---------------- newsletter ---------------- */

export async function subscribeNewsletter(
  email: string,
  phone: string,
): Promise<{ ok: boolean; message: string }> {
  const clean = email.trim().toLowerCase();
  const cleanPhone = phone.trim();
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(clean)) {
    return { ok: false, message: "Enter a valid email address." };
  }
  if (!/^\+?[0-9][0-9 ()-]{6,}$/.test(cleanPhone)) {
    return { ok: false, message: "Add your phone number with country code (e.g. +52 …)." };
  }
  const db = getDb();

  // same email again → resend the existing coupon, never issue a second
  const prior = await db.query(
    `select payload->>'coupon' as coupon from leads
      where kind='newsletter' and email=$1 limit 1`,
    [clean],
  );
  let code = prior.rows[0]?.coupon as string | undefined;

  if (!code) {
    // coupon + lead land together or not at all — a half-committed pair
    // used to mint an orphan coupon on every retry
    code = shortCode("WELCOME");
    const client = await db.connect();
    try {
      await client.query("begin");
      await client.query(
        `insert into coupons (code, kind, percent_off, max_uses, per_user_limit, note)
         values ($1,'percent',10,1,1,'Newsletter signup coupon')
         on conflict (code) do nothing`,
        [code],
      );
      await client.query(
        `insert into leads (kind, name, email, phone, payload)
         values ('newsletter','',$1,$2,$3)`,
        [clean, cleanPhone, JSON.stringify({ coupon: code })],
      );
      await client.query("commit");
    } catch (e) {
      await client.query("rollback").catch(() => {});
      throw e;
    } finally {
      client.release();
    }
    notifyTeam(clean, cleanPhone, code);
  }

  const sent = await sendBranded(
    clean,
    "Your 10% TutCasa welcome coupon",
    [
      "Hola!",
      "",
      "Welcome to the TutCasa family — here's your welcome gift:",
      "",
      `- Coupon code: ${code}`,
      "- 10% off your first booking",
      "- Enter it at checkout on any home",
      "",
      "We'll also send you the occasional deal and new-home announcement — good things only, no spam.",
      "",
      `Find your casa: ${SITE}/stays`,
    ].join("\n"),
  );
  return sent
    ? { ok: true, message: "Check your inbox — your 10% coupon is on its way! 🎉" }
    : { ok: true, message: `You're in! Your 10% coupon code is ${code} — save it now (the email couldn't be delivered).` };
}

/* ---------------- referral links ---------------- */

export async function createReferral(
  name: string,
  email: string,
): Promise<{ ok: boolean; message: string; code?: string; link?: string }> {
  const cleanEmail = email.trim().toLowerCase();
  if (!name.trim() || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(cleanEmail)) {
    return { ok: false, message: "Add your name and a valid email." };
  }
  const db = getDb();

  // one link per referrer — asking again returns the same one
  const prior = await db.query(
    "select code from referrals where referrer_email=$1 limit 1", [cleanEmail]);
  let code = prior.rows[0]?.code as string | undefined;

  if (!code) {
    code = shortCode("REF");
    await db.query(
      `insert into referrals (code, referrer_name, referrer_email) values ($1,$2,$3)`,
      [code, name.trim(), cleanEmail],
    );
    // the code doubles as the friend's $100 coupon — reusable across
    // DIFFERENT friends, but once per guest email, and never by the
    // referrer themselves (enforced again at reward time)
    await db.query(
      `insert into coupons (code, kind, amount_cents, per_user_limit, allowed_email, note)
       values ($1,'fixed',10000,1,null,'Referral friend coupon')
       on conflict (code) do nothing`,
      [code],
    );
  }
  const link = `${SITE}/invite/${code}`;

  const sentRef = await sendBranded(
    cleanEmail,
    "Your TutCasa invite link",
    [
      `Hola ${name.trim().split(" ")[0]}!`,
      "",
      "Here's your personal invite link — share it with friends:",
      "",
      `- ${link}`,
      "",
      "Every friend who books through it gets $100 off their first stay — and once their booking is confirmed, YOU get a $200 coupon toward your next one. No limits: refer as many friends as you like.",
    ].join("\n"),
  );
  return sentRef
    ? { ok: true, message: "Your invite link is ready (and in your inbox)!", code, link }
    : { ok: true, message: "Your invite link is ready — copy it below (the email couldn't be delivered).", code, link };
}

export async function getReferralByCode(code: string) {
  const res = await getDb().query(
    "select code, referrer_name from referrals where code=$1", [code.toUpperCase()]);
  return res.rows[0] ?? null;
}

/** Called when a booking is CONFIRMED — if it used a referral coupon,
    the referrer earns their $200 reward (once per booking). */
export async function rewardReferrerForBooking(bookingId: string): Promise<void> {
  const db = getDb();
  const booking = await db.query(
    `select b.coupon_code, b.guest_email, l.title from bookings b
       join listings l on l.id=b.listing_id
      where b.id=$1 and b.coupon_code like 'REF-%'`,
    [bookingId],
  );
  const b = booking.rows[0];
  if (!b) return;
  const referral = await db.query(
    "select id, code, referrer_name, referrer_email from referrals where code=$1",
    [b.coupon_code],
  );
  const r = referral.rows[0];
  if (!r) return;
  // no self-referral: booking your own invite code earns nothing
  if (String(b.guest_email ?? "").trim().toLowerCase() === String(r.referrer_email).trim().toLowerCase()) return;

  // reward row + reward coupon land atomically — a half-committed pair
  // used to burn the once-per-booking dedupe without creating the coupon
  const rewardCode = shortCode("THANKS");
  const client = await db.connect();
  let created = false;
  try {
    await client.query("begin");
    const ins = await client.query(
      `insert into referral_rewards (booking_id, referral_id, reward_code)
       values ($1,$2,$3) on conflict (booking_id) do nothing returning booking_id`,
      [bookingId, r.id, rewardCode],
    );
    if (ins.rows[0]) {
      await client.query(
        `insert into coupons (code, kind, amount_cents, max_uses, note)
         values ($1,'fixed',20000,1,$2)`,
        [rewardCode, `Referral reward for ${r.referrer_email}`],
      );
      created = true;
    }
    await client.query("commit");
  } catch (e) {
    await client.query("rollback").catch(() => {});
    throw e;
  } finally {
    client.release();
  }
  if (!created) return; // already rewarded
  await sendBranded(
    r.referrer_email,
    "You earned $200 — your friend just booked",
    [
      `Hola ${String(r.referrer_name).split(" ")[0]}!`,
      "",
      `Great news — a friend you invited just had their booking confirmed (${b.title}).`,
      "",
      `- Your reward: coupon ${rewardCode}`,
      "- $200 off your next stay, no minimum",
      "- Enter it at checkout whenever you're ready",
      "",
      "Keep sharing your link — every confirmed friend earns you another $200.",
    ].join("\n"),
  );
}
