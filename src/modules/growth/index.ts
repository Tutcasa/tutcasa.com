import "server-only";
import { randomBytes } from "node:crypto";
import { getDb } from "@/lib/db";
import { renderEmailHtml } from "@/modules/emails";
import { createLead } from "@/modules/leads";

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
      from: process.env.EMAIL_FROM ?? "TutCasa <bookings@tutcasa.com>",
      to: [to],
      subject,
      html: renderEmailHtml({ subject, body }),
      text: body,
    }),
  }).catch(() => null);
  return !!res?.ok;
}

/* ---------------- newsletter ---------------- */

export async function subscribeNewsletter(
  email: string,
): Promise<{ ok: boolean; message: string }> {
  const clean = email.trim().toLowerCase();
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(clean)) {
    return { ok: false, message: "Enter a valid email address." };
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
    code = shortCode("WELCOME");
    await db.query(
      `insert into coupons (code, kind, percent_off, max_uses, note)
       values ($1,'percent',10,1,'Newsletter signup coupon')`,
      [code],
    );
    await createLead({ kind: "newsletter", email: clean, payload: { coupon: code } });
  }

  await sendBranded(
    clean,
    "Your 10% welcome coupon 🎁",
    [
      "Hola! 👋",
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
  return { ok: true, message: "Check your inbox — your 10% coupon is on its way! 🎉" };
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
    // the code doubles as the friend's $100 coupon (reusable across friends)
    await db.query(
      `insert into coupons (code, kind, amount_cents, note)
       values ($1,'fixed',10000,'Referral friend coupon')
       on conflict (code) do nothing`,
      [code],
    );
  }
  const link = `${SITE}/invite/${code}`;

  await sendBranded(
    cleanEmail,
    "Your TutCasa invite link 💕",
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
  return { ok: true, message: "Your invite link is ready (and in your inbox)!", code, link };
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
    `select b.coupon_code, l.title from bookings b
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

  const rewardCode = shortCode("THANKS");
  // one reward per booking — the PK insert is the dedupe
  const ins = await db.query(
    `insert into referral_rewards (booking_id, referral_id, reward_code)
     values ($1,$2,$3) on conflict (booking_id) do nothing returning booking_id`,
    [bookingId, r.id, rewardCode],
  );
  if (!ins.rows[0]) return; // already rewarded

  await db.query(
    `insert into coupons (code, kind, amount_cents, max_uses, note)
     values ($1,'fixed',20000,1,$2)`,
    [rewardCode, `Referral reward for ${r.referrer_email}`],
  );
  await sendBranded(
    r.referrer_email,
    "You earned $200 — your friend just booked! 🎉",
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
