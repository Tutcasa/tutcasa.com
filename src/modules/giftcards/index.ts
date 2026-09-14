import "server-only";
import { createHash, randomInt } from "node:crypto";
import { getDb } from "@/lib/db";

/**
 * Gift cards — stored VALUE, unlike coupons (which are discounts):
 *  - admin issues a card with a dollar amount; the code is shown ONCE
 *    (only its hash is stored) and the last 4 characters identify it
 *  - the guest redeems it at stay checkout; it covers up to its balance
 *    and the REMAINDER stays on the card for a future booking
 *  - every movement lands in gift_card_ledger (issue / redeem / refund)
 *  - a card can be used together with a coupon (different systems)
 */

const hashCode = (code: string) =>
  createHash("sha256").update(`tutcasa-gift:${code.trim().toUpperCase()}`).digest("hex");

// no 0/O/1/I — codes get read over the phone
const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
function newCode(): string {
  const part = (n: number) =>
    Array.from({ length: n }, () => ALPHABET[randomInt(ALPHABET.length)]).join("");
  return `GIFT-${part(4)}-${part(4)}`;
}

export interface GiftCardRow {
  id: string;
  last4: string;
  initialCents: number;
  balanceCents: number;
  status: string;
  recipientEmail: string | null;
  message: string | null;
  createdAt: string;
}

/** Admin: issue a card. Returns the plain code — shown exactly once. */
export async function createGiftCard(input: {
  amountUSD: number;
  recipientEmail?: string;
  message?: string;
}): Promise<{ code: string; id: string }> {
  const code = newCode();
  const res = await getDb().query<{ id: string }>(
    `insert into gift_cards (code_hash, code_last4, initial_cents, balance_cents, currency,
                             recipient_email, message, status)
     values ($1,$2,$3,$3,'USD',$4,$5,'active') returning id`,
    [hashCode(code), code.slice(-4), Math.round(input.amountUSD * 100),
     input.recipientEmail?.trim() || null, input.message?.trim() || null],
  );
  await getDb().query(
    "insert into gift_card_ledger (gift_card_id, delta_cents, note) values ($1,$2,'issued')",
    [res.rows[0].id, Math.round(input.amountUSD * 100)],
  );
  return { code, id: res.rows[0].id };
}

export interface GiftCardCheck {
  ok: boolean;
  id?: string;
  last4?: string;
  balanceCents?: number;
  reason?: "NOT_FOUND" | "EMPTY" | "EXPIRED";
}

export async function checkGiftCard(code: string): Promise<GiftCardCheck> {
  if (!code.trim()) return { ok: false, reason: "NOT_FOUND" };
  const res = await getDb().query(
    `select id, code_last4, balance_cents, status,
            (expires_at is not null and expires_at < now()) as expired
       from gift_cards where code_hash = $1`, [hashCode(code)]);
  const c = res.rows[0];
  if (!c || c.status === "void") return { ok: false, reason: "NOT_FOUND" };
  if (c.expired) return { ok: false, reason: "EXPIRED" };
  if (c.status !== "active" || c.balance_cents <= 0) return { ok: false, reason: "EMPTY" };
  return { ok: true, id: c.id, last4: c.code_last4, balanceCents: c.balance_cents };
}

/** Atomically take `amountCents` off the card (fails when the balance
    moved underneath us — the caller rejects the booking then). */
export async function redeemGiftCard(id: string, amountCents: number, note: string): Promise<boolean> {
  const res = await getDb().query(
    `update gift_cards
        set balance_cents = balance_cents - $2,
            status = case when balance_cents - $2 <= 0 then 'redeemed' else status end,
            updated_at = now()
      where id = $1 and status = 'active' and balance_cents >= $2
      returning id`, [id, amountCents]);
  if (res.rowCount !== 1) return false;
  await getDb().query(
    "insert into gift_card_ledger (gift_card_id, delta_cents, note) values ($1,$2,$3)",
    [id, -amountCents, note]).catch(() => {});
  return true;
}

/** Put value back (failed insert, cancelled booking). */
export async function refundGiftCard(id: string, amountCents: number, note: string): Promise<void> {
  await getDb().query(
    `update gift_cards
        set balance_cents = balance_cents + $2,
            status = case when status = 'redeemed' then 'active' else status end,
            updated_at = now()
      where id = $1`, [id, amountCents]);
  await getDb().query(
    "insert into gift_card_ledger (gift_card_id, delta_cents, note) values ($1,$2,$3)",
    [id, amountCents, note]).catch(() => {});
}

export async function listGiftCards(): Promise<GiftCardRow[]> {
  const res = await getDb().query(
    `select id, code_last4, initial_cents, balance_cents, status,
            recipient_email, message, created_at
       from gift_cards order by created_at desc limit 200`);
  return res.rows.map((r) => ({
    id: r.id, last4: r.code_last4, initialCents: r.initial_cents,
    balanceCents: r.balance_cents, status: r.status,
    recipientEmail: r.recipient_email, message: r.message, createdAt: r.created_at,
  }));
}

const SITE = process.env.SITE_URL ?? "https://tutcasa-platform.vercel.app";

async function giftEmail(to: string, subject: string, body: string): Promise<void> {
  const key = process.env.RESEND_API_KEY;
  const db = getDb();
  if (!key) {
    await db.query(
      `insert into notifications_log (kind, channel, recipient, subject, body, status, error)
       values ('gift_card_email','email',$1,$2,$3,'manual','RESEND_API_KEY not configured')`,
      [to, subject, body.slice(0, 4000)]).catch(() => {});
    return;
  }
  const { renderEmailHtml } = await import("@/modules/emails");
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: process.env.EMAIL_FROM ?? "TutCasa <admin@tutcasa.com>",
      to: [to], subject, text: body,
      html: renderEmailHtml({ subject, body }),
    }),
    signal: AbortSignal.timeout(15_000),
  }).catch(() => null);
  await db.query(
    `insert into notifications_log (kind, channel, recipient, subject, body, status)
     values ('gift_card_email','email',$1,$2,$3,$4)`,
    [to, subject, body.slice(0, 4000), res?.ok ? "sent" : "failed"]).catch(() => {});
}

/**
 * Stripe webhook: a guest paid for a gift card. Creates the card (once —
 * payment_ref dedupes retries) and emails the code to the recipient (or
 * the buyer), with a copy/receipt to the buyer. The code exists only in
 * these emails; the database keeps its hash.
 */
export async function fulfillGiftPurchase(input: {
  paymentRef: string;
  amountCents: number;
  buyerEmail: string;
  recipientEmail?: string;
  message?: string;
}): Promise<void> {
  const code = newCode();
  const ins = await getDb().query(
    `insert into gift_cards (code_hash, code_last4, initial_cents, balance_cents, currency,
                             purchaser_email, recipient_email, message, status, payment_ref)
     values ($1,$2,$3,$3,'USD',$4,$5,$6,'active',$7)
     on conflict (payment_ref) do nothing returning id`,
    [hashCode(code), code.slice(-4), input.amountCents,
     input.buyerEmail, input.recipientEmail || null, input.message?.trim() || null,
     input.paymentRef],
  );
  if (!ins.rows[0]) return; // webhook retry — card already created & emailed
  await getDb().query(
    "insert into gift_card_ledger (gift_card_id, delta_cents, note) values ($1,$2,'purchased online')",
    [ins.rows[0].id, input.amountCents]).catch(() => {});

  const amount = `$${Math.round(input.amountCents / 100).toLocaleString("en-US")} USD`;
  const howTo =
    `How to use it:\n` +
    `- Pick a home at ${SITE}/stays\n` +
    `- At checkout, enter the code in the "Gift card code" box\n` +
    `- It covers up to ${amount} — anything left stays on the card for next time`;

  const to = input.recipientEmail?.trim();
  if (to) {
    await giftEmail(
      to,
      `🎁 You've received a TutCasa gift card — ${amount}!`,
      `Hola! 👋\n\nSomeone special sent you a TutCasa gift card worth ${amount}` +
      ` for a stay on the Riviera Maya.\n\n` +
      (input.message?.trim() ? `Their message:\n"${input.message.trim()}"\n\n` : "") +
      `Your gift card code:\n${code}\n\n${howTo}\n\n— The TutCasa family`,
    );
    await giftEmail(
      input.buyerEmail,
      `Your TutCasa gift card was delivered 🎁 (${amount})`,
      `Hola! 👋\n\nPayment received — your ${amount} gift card was emailed to ${to}.\n\n` +
      `For your records, the code is:\n${code}\n\n` +
      `Keep this email — the code is shown nowhere else.\n\n— The TutCasa family`,
    );
  } else {
    await giftEmail(
      input.buyerEmail,
      `Your TutCasa gift card 🎁 (${amount})`,
      `Hola! 👋\n\nPayment received — here is your ${amount} TutCasa gift card.\n\n` +
      `Gift card code:\n${code}\n\n${howTo}\n\n` +
      `Keep or forward this email — the code is shown nowhere else.\n\n— The TutCasa family`,
    );
  }
}

export async function setGiftCardStatus(id: string, status: "active" | "void"): Promise<void> {
  await getDb().query(
    "update gift_cards set status=$2, updated_at=now() where id=$1 and status <> 'redeemed'",
    [id, status]);
}
