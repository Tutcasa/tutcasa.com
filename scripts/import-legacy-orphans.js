// Invoices whose booking was deleted on the old site → CANCELLED records
// (history only: cancelled never blocks calendars or counts as revenue).
const read = require("./legacy-parse-wxr.js");
const { Pool } = require("pg");
const FILE = process.argv[2];
if (!FILE) { console.error("usage: DRY=1 node scripts/import-legacy-orphans.js <wordpress-export.xml>"); process.exit(1); }
const DRY = process.env.DRY === "1";
const ymd = (s) => (s && /^\d{2}-\d{2}-\d{2}$/.test(s) ? "20" + s : null);
const num = (v) => Number(String(v ?? "0").replace(/[^\d.]/g, "")) || 0;
const addDays = (iso, n) => { const d = new Date(iso + "T00:00:00Z"); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };
const MAP = { "997": "Andaluc%", "924": "Casa Bonita%", "4837": "Oceanview Penthouse%", "6774": "Spiritum Marea%", "6957": "Para%so Azul%" };

(async () => {
  const items = read(FILE, ["wpestate_booking", "wpestate_invoice", "estate_property"]);
  const props = Object.fromEntries(items.filter((i) => i.type === "estate_property").map((x) => [x.id, x]));
  const bkIds = new Set(items.filter((i) => i.type === "wpestate_booking").map((b) => b.id));
  const groups = {};
  for (const i of items.filter((x) => x.type === "wpestate_invoice" && !bkIds.has(x.meta.item_id)))
    (groups[i.meta.item_id] ??= []).push(i);
  const p = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

  async function home(oldId) {
    if (MAP[oldId]) return (await p.query("select id from listings where title ilike $1 and status='published' limit 1", [MAP[oldId]])).rows[0].id;
    const slug = `legacy-home-${oldId}`;
    const got = (await p.query("select id from listings where slug=$1", [slug])).rows[0];
    if (got) return got.id;
    const pr = props[oldId];
    const title = pr ? pr.title.replace(/^Private:\s*/, "") : `Home #${oldId} (removed from previous site)`;
    const egypt = /nuba/i.test(title);
    if (DRY) return `(new archived home: ${title})`;
    return (await p.query(
      `insert into listings (slug,title,city,country,max_guests,bedrooms,bathrooms,status)
       values ($1,$2,$3,$4,1,1,1,'archived') returning id`,
      [slug, title, egypt ? "Nuba" : "Playa del Carmen", egypt ? "EG" : "MX"])).rows[0].id;
  }

  let n = 0;
  for (const [ref, invs] of Object.entries(groups)) {
    // primary invoice: the one that carries dates/payment, else the first
    invs.sort((a, b) => (ymd(b.meta.booking_from_date) ? 1 : 0) - (ymd(a.meta.booking_from_date) ? 1 : 0) || num(b.meta.depozit_paid) - num(a.meta.depozit_paid));
    const main = invs[0].meta;
    const bought = new Date(Number(main.purchase_date) * 1000 || Date.parse(invs[0].date)).toISOString().slice(0, 10);
    let ci = ymd(main.booking_from_date), co = ymd(main.booking_to_date);
    const datesKnown = !!(ci && co && co > ci);
    if (!datesKnown) { ci = bought; co = addDays(bought, 1); }
    const total = Math.round(num(main.item_price) * 100);
    const paid = Math.round(Math.max(...invs.map((i) => num(i.meta.depozit_paid))) * 100);
    const neverPaid = invs.every((i) => (i.meta.invoice_status || "").startsWith("issued"));
    const legacyStatus = (neverPaid ? "invoice issued, never paid" : "booking cancelled by the guest") +
      " — booking deleted on previous site" + (datesKnown ? "" : " (stay dates not recorded)");
    const bd = { nights: Math.max(1, Math.round((new Date(co) - new Date(ci)) / 86400000)),
      accommodationCents: total, taxCents: 0, cleaningCents: 0, cityFeeCents: 0, addonLines: [], addonsCents: 0,
      securityDepositCents: 0, depositInTotal: false, dueNowCents: paid, balanceCents: 0, balanceDueDate: null,
      legacy: true, legacyBookingNo: ref, legacyInvoiceNo: invs[0].id, legacyInvoices: invs.map((i) => i.id),
      legacyStatus, legacyDeleted: true, requestToBook: false };
    const lid = await home(main.for_property);
    console.log(`#${ref} inv #${invs.map((i) => i.id).join("+#")} | ${datesKnown ? ci + "→" + co : "dates not recorded (" + bought + ")"} | ${String(main.rented_by || "(no name)").slice(0, 18).padEnd(18)} | $${total / 100} paid $${paid / 100} | ${String(lid).startsWith("(new") ? lid : ""}`);
    if (DRY) continue;
    const res = await p.query(
      `insert into bookings (listing_id,guest_name,guest_email,stay,guests,status,total_cents,amount_paid_cents,
                             currency,price_breakdown,source,invoice_no,legacy_ref,created_at)
       values ($1,$2,$3,daterange($4::date,$5::date),1,'cancelled',$6,$7,'USD',$8,'legacy',$9,$10,$11::timestamp)
       on conflict (legacy_ref) where legacy_ref is not null do nothing returning id`,
      [lid, main.rented_by || "Guest (no name recorded)", main.rented_by_email || null, ci, co, total, paid,
       JSON.stringify(bd), Number(invs[0].id), ref, invs[0].date]);
    if (res.rows[0]) n++;
  }
  console.log(DRY ? "DRY RUN — nothing written." : `imported ${n} cancelled records`);
  await p.end();
})();
