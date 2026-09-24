// Launch day: export again from wp-admin (Tools → Export → All content),
// run with DRY=1 to review, then for real. Already-imported bookings are
// skipped (legacy_ref), so only bookings made since the last run are added.
// Import every booking from the old WordPress site (WXR export) as
// source='legacy'. Idempotent via legacy_ref; DRY=1 prints the plan only.
const read = require("./legacy-parse-wxr.js");
const { Pool } = require("pg");
const FILE = process.argv[2];
if (!FILE) { console.error("usage: DRY=1 node scripts/import-legacy-bookings.js <wordpress-export.xml>"); process.exit(1); }
const DRY = process.env.DRY === "1";
const TODAY = new Date().toISOString().slice(0, 10);
const SKIP = { "7344": "test booking by the team (maiiamiiin@gmail.com), never paid" };

// old property id → new listing title pattern (or an archived placeholder)
const MAP = {
  "997": "Andaluc%", "924": "Casa Bonita%", "4837": "Oceanview Penthouse%",
  "6774": "Spiritum Marea%", "6957": "Para%so Azul%",
};
const PLACEHOLDERS = {
  "1370": { title: "Casa Paraiso Maya, Ocean view, Private Pool, Mareazul", city: "Playa del Carmen" },
  "1480": { title: "Casa Azul, Mareazul", city: "Playa del Carmen" },
  "3651": { title: "Luxury 20-Guest Rooftop Pool Villa in Tulum – Sinaan Balaam", city: "Tulum" },
  "2894": { title: "Home #2894 (removed from previous site)", city: "Playa del Carmen" },
};

const ymd = (s) => (s && /^\d{2}-\d{2}-\d{2}$/.test(s) ? "20" + s : s);
const num = (v) => Number(String(v ?? "0").replace(/[^\d.]/g, "")) || 0;
const addDays = (iso, n) => { const d = new Date(iso + "T00:00:00Z"); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };

(async () => {
  const items = read(FILE, ["wpestate_booking", "wpestate_invoice"]);
  const invByBooking = {};
  for (const i of items.filter((x) => x.type === "wpestate_invoice")) (invByBooking[i.meta.item_id] ??= []).push(i.id);
  const p = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
  const plan = [];

  async function listingFor(oldId) {
    if (MAP[oldId]) return (await p.query("select id from listings where title ilike $1 and status='published' limit 1", [MAP[oldId]])).rows[0]?.id;
    const ph = PLACEHOLDERS[oldId]; if (!ph) return null;
    const slug = `legacy-home-${oldId}`;
    const got = (await p.query("select id from listings where slug=$1", [slug])).rows[0];
    if (got) return got.id;
    if (DRY) return `(new archived home: ${ph.title})`;
    return (await p.query(
      `insert into listings (slug,title,city,country,max_guests,bedrooms,bathrooms,status)
       values ($1,$2,$3,'MX',1,1,1,'archived') returning id`, [slug, ph.title, ph.city])).rows[0].id;
  }

  for (const b of items.filter((x) => x.type === "wpestate_booking")) {
    const m = b.meta;
    if (SKIP[b.id]) { plan.push({ ref: b.id, action: "SKIP", why: SKIP[b.id] }); continue; }
    const ci = ymd(m.booking_from_date), co = ymd(m.booking_to_date);
    const total = Math.round(num(m.total_price) * 100);
    const balance = Math.round(num(m.balance) * 100);
    const taxes = Math.round(num(m.taxes) * 100);
    const st = (m.booking_status || "").toLowerCase();
    const past = co <= TODAY;
    let status, paid, legacyStatus = st;
    if (st === "waiting") { status = "cancelled"; paid = 0; legacyStatus = "unpaid request (never confirmed)"; }
    else if (st === "refund-pending") { status = "cancelled"; paid = total - balance; legacyStatus = "cancelled — refund pending"; }
    else { status = past ? "completed" : "confirmed"; paid = total - balance; }
    const nights = Math.round((new Date(co) - new Date(ci)) / 86400000);
    const invs = invByBooking[b.id] ?? [];
    const bd = {
      nights, accommodationCents: total - taxes, taxCents: taxes,
      cleaningCents: 0, cityFeeCents: 0, addonLines: [], addonsCents: 0,
      securityDepositCents: Math.round(num(m.security_deposit) * 100), depositInTotal: false,
      dueNowCents: paid, balanceCents: status === "cancelled" ? 0 : balance,
      balanceDueDate: balance > 0 && status === "confirmed" ? addDays(ci, -15) + "T00:00:00.000Z" : null,
      legacy: true, legacyBookingNo: b.id, legacyInvoiceNo: m.booking_invoice_no,
      legacyInvoices: invs, legacyStatus, requestToBook: false,
    };
    plan.push({ ref: b.id, action: "IMPORT", home: m.booking_id, ci, co, guest: m.full_name, status, total: total / 100, paid: paid / 100, inv: m.booking_invoice_no, extraInvoices: invs.filter((x) => x !== m.booking_invoice_no), legacyStatus,
      row: { oldHome: m.booking_id, name: m.full_name, email: m.email, phone: m.phone, guests: Math.max(1, num(m.booking_guests) || 1), ci, co, status, total, paid, bd, inv: m.booking_invoice_no, at: b.date } });
  }

  let imported = 0, skipped = 0, errors = [];
  for (const x of plan) {
    if (x.action !== "IMPORT") continue;
    const r = x.row;
    const lid = await listingFor(r.oldHome);
    x.listing = lid;
    if (DRY) continue;
    if (!lid) { errors.push(`#${x.ref}: no home for old property ${r.oldHome}`); continue; }
    try {
      const res = await p.query(
        `insert into bookings (listing_id,guest_name,guest_email,guest_phone,stay,guests,status,total_cents,amount_paid_cents,
                               currency,price_breakdown,source,invoice_no,legacy_ref,created_at)
         values ($1,$2,$3,$4,daterange($5::date,$6::date),$7,$8,$9,$10,'USD',$11,'legacy',$12,$13,$14::timestamp)
         on conflict (legacy_ref) where legacy_ref is not null do nothing returning id`,
        [lid, r.name || "Guest", r.email || null, r.phone || null, r.ci, r.co, r.guests, r.status, r.total, r.paid,
         JSON.stringify(r.bd), Number(r.inv) || null, x.ref, r.at]);
      if (res.rows[0]) imported++; else skipped++;
    } catch (e) { errors.push(`#${x.ref}: ${e.message}`); }
  }
  for (const x of plan) {
    if (x.action === "SKIP") { console.log(`SKIP   #${x.ref} — ${x.why}`); continue; }
    console.log(`${x.status.padEnd(9)} #${x.ref} inv #${x.inv}${x.extraInvoices.length ? " (+#" + x.extraInvoices.join(", #") + ")" : ""} | ${x.ci}→${x.co} | ${String(x.guest).slice(0, 20).padEnd(20)} | $${x.total} paid $${x.paid}${x.status === "cancelled" ? " | " + x.legacyStatus : ""}${String(x.listing).startsWith("(new") ? " | " + x.listing : ""}`);
  }
  console.log(DRY ? "\nDRY RUN — nothing written." : `\nimported ${imported}, already present ${skipped}, errors ${errors.length}`);
  errors.forEach((e) => console.log("  ERROR", e));
  await p.end();
})();
