// Corrections applied AFTER import-legacy-bookings.js + import-legacy-orphans.js.
// Idempotent (flags tax16 / ordersVerified in price_breakdown) — safe to re-run after a restore.
//
// 1. Manual facts the WordPress export doesn't carry (emails fixed, payments
//    made after the export, rounding the export lost).
// 2. The 16% tax: the old site's WooCommerce added 16% TAX on top of every
//    payment (e.g. $355 → $411.80, order #7349). The export only has the
//    pre-tax amounts, so every total / paid / balance is × 1.16, shown as a
//    separate "Tax (16%)" line — matching what guests were really charged.
//    Verified to the cent against 20 WooCommerce orders (2026-09-25).
const { Pool } = require("pg");
const DRY = process.env.DRY === "1";
const TAX = 0.16;

// pre-tax facts, by old booking number
const PAID_OVERRIDE = {
  "6997": 112250, // order #7011 paid $1,822.50 for 6995 ($700) + 6997 ($1,122.50); export rounded to $1,122
  "7261": "total", // Raúl: balance paid 2026-09-24, order #7349
};
const NOTE = { "7261": "confirmed — balance paid on old site 2026-09-24 (order #7349)" };

(async () => {
  const p = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
  if (!DRY) {
    await p.query("update bookings set guest_email='a.audet@groupeboudreault.com' where guest_email ilike 'a.audet@groupebpudreault.com'");
  }
  const rows = (await p.query(
    `select id, legacy_ref, guest_name, status, total_cents, amount_paid_cents, price_breakdown
       from bookings where source='legacy' and not coalesce((price_breakdown->>'tax16')::boolean, false)
      order by legacy_ref`)).rows;
  for (const r of rows) {
    const bd = r.price_breakdown ?? {};
    const baseTotal = r.total_cents;
    const o = PAID_OVERRIDE[r.legacy_ref];
    const basePaid = o === "total" ? baseTotal : o ?? r.amount_paid_cents;
    const total = Math.round(baseTotal * (1 + TAX));
    const paid = Math.round(basePaid * (1 + TAX));
    const balance = r.status === "cancelled" ? 0 : Math.max(0, total - paid);
    const next = {
      ...bd,
      tax16: true, taxPct: 16,
      accommodationCents: baseTotal, weekendUpliftCents: 0,
      taxCents: total - baseTotal,
      // the old site's own "taxes" / deposit figures were display-only
      // (not what was charged) — kept for reference, not shown
      legacyTaxesShown: bd.taxCents ?? 0, legacyDepositCents: bd.securityDepositCents ?? 0,
      securityDepositCents: 0, depositInTotal: false,
      dueNowCents: paid, balanceCents: balance,
      ...(NOTE[r.legacy_ref] ? { legacyStatus: NOTE[r.legacy_ref] } : {}),
    };
    console.log(`#${r.legacy_ref.padEnd(5)} ${String(r.guest_name).slice(0, 18).padEnd(18)} ${r.status.padEnd(9)} total $${(baseTotal / 100).toFixed(2)} → $${(total / 100).toFixed(2)} | paid $${(r.amount_paid_cents / 100).toFixed(2)} → $${(paid / 100).toFixed(2)} | balance $${(balance / 100).toFixed(2)}`);
    if (!DRY) {
      await p.query("update bookings set total_cents=$2, amount_paid_cents=$3, price_breakdown=$4 where id=$1",
        [r.id, total, paid, next]);
    }
  }
  console.log(DRY ? `\nDRY RUN — ${rows.length} would change.` : `\nupdated ${rows.length}`);

  // 3. Where the real WooCommerce orders differ from "booking × 1.16" (checked
  //    order by order, 2026-09-25): April-2025 payments were taxed 13%, some
  //    balances were reduced on the old site, some payments refunded. Amounts
  //    are exactly what the orders say (cents). adjustment = paid − base − tax.
  const ORDERS = {
    "3871": { paid: 82631 + 348435, tax: (82631 - 73125) + (348435 - 300375), note: "orders #3897 ($826.31, 13% tax) + #6424 ($3,484.35) — $270 less than the booking on the old site" },
    "3879": { paid: 114554 + 321465, tax: (114554 - 101375) + (321465 - 277125), note: "orders #4012 ($1,145.54, 13% tax) + #6432 ($3,214.65) — $270 less than the booking on the old site" },
    "6251": { paid: 522000 + 498800, tax: 72000 + 68800, note: "orders #6274 ($5,220) + #6428 ($4,988) — $200 less than the booking on the old site" },
    "4015": { paid: 267500, tax: 0, note: "order #4023 ($2,675, no tax) — $200 less than the booking on the old site" },
    "3998": { paid: 258262, tax: 258262 - 228550, cancelled: true, note: "deposit order #4030 ($2,582.62, 13% tax)" },
    "4310": { paid: 0, tax: 0, cancelled: true, note: "deposit refunded on old site (order #4313)" },
    "5848": { paid: 0, tax: 0, cancelled: true, note: "test — refunded (order #5854)" },
    "5865": { paid: 0, tax: 0, cancelled: true, note: "test — refunded (order #5877)" },
  };
  const todo = (await p.query(
    `select id, legacy_ref, total_cents, price_breakdown from bookings
      where source='legacy' and legacy_ref = any($1) and not coalesce((price_breakdown->>'ordersVerified')::boolean, false)`,
    [Object.keys(ORDERS)])).rows;
  for (const r of todo) {
    const o = ORDERS[r.legacy_ref], bd = r.price_breakdown;
    const base = bd.accommodationCents;
    const next = o.cancelled
      // cancelled: the booking total (and its 16% line) stays as booked — only what was paid changes
      ? { ...bd, ordersVerified: true, dueNowCents: o.paid, balanceCents: 0, legacyStatus: `${bd.legacyStatus} — ${o.note}` }
      : { ...bd, ordersVerified: true, taxCents: o.tax, taxPct: null,
          legacyAdjustmentCents: o.paid - base - o.tax, dueNowCents: o.paid, balanceCents: 0,
          legacyStatus: `${bd.legacyStatus} — ${o.note}` };
    const total = o.cancelled ? r.total_cents : o.paid;
    console.log(`#${r.legacy_ref} paid → $${(o.paid / 100).toFixed(2)}${o.cancelled ? "" : ` total → $${(total / 100).toFixed(2)} (base $${(base / 100).toFixed(2)} + tax $${(o.tax / 100).toFixed(2)} ${next.legacyAdjustmentCents ? "adj $" + (next.legacyAdjustmentCents / 100).toFixed(2) : ""})`}`);
    if (!DRY) await p.query("update bookings set total_cents=$2, amount_paid_cents=$3, price_breakdown=$4 where id=$1", [r.id, total, o.paid, next]);
  }
  await p.end();
})();
