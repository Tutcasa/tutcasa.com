// One-off importer: pulls every listed property from the LIVE tutcasa.com
// (WpRentals) into the new platform as DRAFTS for review — same slugs as the
// old site (they become the 301 targets at launch), full description, beds/
// baths/guests, nightly price, and the photo gallery uploaded to Supabase
// storage. Idempotent: already-imported slugs are skipped.
//
// Usage:  node scripts/import-old-site.mjs [--limit N]
// Needs:  DATABASE_URL, NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY

import pg from "pg";
import { createClient } from "@supabase/supabase-js";

const LIMIT = process.argv.includes("--limit")
  ? Number(process.argv[process.argv.indexOf("--limit") + 1])
  : Infinity;
const MAX_PHOTOS = 12;

const DB_URL = process.env.DATABASE_URL;
const SB_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SB_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!DB_URL || !SB_URL || !SB_KEY) {
  console.error("Missing DATABASE_URL / NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const db = new pg.Client({ connectionString: DB_URL, ssl: { rejectUnauthorized: false } });
await db.connect();
const sb = createClient(SB_URL, SB_KEY);

const fetchText = async (url) => {
  const res = await fetch(url, { headers: { "User-Agent": "TutCasa-Importer/1.0" } });
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  return res.text();
};

/* -------- 1. property URLs from the sitemap -------- */
const sitemap = await fetchText("https://tutcasa.com/estate_property-sitemap.xml");
const urls = [...sitemap.matchAll(/https:\/\/tutcasa\.com\/properties\/[^<]+/g)]
  .map((m) => m[0].replace(/\/$/, ""))
  .slice(0, LIMIT);
console.log(`found ${urls.length} live listings`);

/* -------- helpers -------- */
const decode = (s) =>
  s.replace(/&#8211;|&ndash;/g, "–").replace(/&#8217;|&rsquo;/g, "’")
   .replace(/&#8216;/g, "‘").replace(/&#8220;/g, "“").replace(/&#8221;/g, "”")
   .replace(/&amp;/g, "&").replace(/&nbsp;/g, " ").replace(/&#038;/g, "&")
   .replace(/&#8230;/g, "…").replace(/<[^>]+>/g, "").trim();

function cityCountry(text) {
  const t = text.toLowerCase();
  if (t.includes("orlando") || t.includes("vista cay")) return ["Orlando", "US", "Florida", 12.5];
  if (t.includes("nuba") || t.includes("aswan") || t.includes("nile") || t.includes("kato dool"))
    return ["Nuba", "EG", "Upper Egypt", 14];
  if (t.includes("tulum")) return ["Tulum", "MX", "Riviera Maya", 16];
  if (t.includes("cancun") || t.includes("cancún")) return ["Cancún", "MX", "Riviera Maya", 16];
  return ["Playa del Carmen", "MX", "Riviera Maya", 16];
}

function parse(html, url) {
  const slug = url.split("/properties/")[1];
  const rawTitle = (html.match(/<title>([^<]+)/) ?? [])[1] ?? slug;
  const title = decode(rawTitle.split(/ [-–] TutCasa/i)[0]).slice(0, 140);

  const price = Number((html.match(/itemprop="price"\s+content="(\d+(?:\.\d+)?)"/) ?? [])[1] ?? 0)
    || Number((html.match(/"price"\s+content="(\d+(?:\.\d+)?)"/) ?? [])[1] ?? 0);

  const bedrooms = Number((html.match(/Bedrooms:<\/span>\s*([\d.]+)/) ?? [])[1] ?? 1);
  const bathrooms = Number((html.match(/Bathrooms:<\/span>\s*([\d.]+)/) ?? [])[1] ?? 1);

  // max guests = highest option in the booking form's guest dropdown
  const guestOpts = [...html.matchAll(/<option value="(\d+)"[^>]*>\s*\d+\s*Guests?/g)].map((m) => Number(m[1]));
  const maxGuests = guestOpts.length ? Math.max(...guestOpts) : Math.max(2, bedrooms * 2);

  const descHtml = (html.match(/itemprop="description"[^>]*>([\s\S]*?)<\/div>/) ?? [])[1] ?? "";
  const description = decode(descHtml).replace(/\s{3,}/g, "\n\n").slice(0, 4000);

  const [city, country, region, taxPct] = cityCountry(title + " " + description);

  // full-size gallery images: skip thumbs (-WxH), logos, favicons, avatars
  const imgs = [...new Set(
    [...html.matchAll(/https:\/\/tutcasa\.com\/wp-content\/uploads\/[^"' )]+\.(?:jpe?g|png|webp)/gi)]
      .map((m) => m[0]),
  )].filter((u) =>
    !/-\d+x\d+\.(jpe?g|png|webp)$/i.test(u) &&
    !/favicon|logo|avatar|placeholder/i.test(u),
  ).slice(0, MAX_PHOTOS);

  return { slug, title, price, bedrooms, bathrooms, maxGuests, description, city, country, region, taxPct, imgs };
}

async function uploadPhoto(listingId, srcUrl, i) {
  const res = await fetch(srcUrl, { headers: { "User-Agent": "TutCasa-Importer/1.0" } });
  if (!res.ok) throw new Error(`img HTTP ${res.status}`);
  const buf = Buffer.from(await res.arrayBuffer());
  if (buf.length < 8_000) throw new Error("too small — skipping");
  const ext = (srcUrl.match(/\.(jpe?g|png|webp)$/i) ?? [, "jpg"])[1].toLowerCase().replace("jpeg", "jpg");
  const path = `${listingId}/imported-${String(i).padStart(2, "0")}.${ext}`;
  const { error } = await sb.storage.from("listing-photos").upload(path, buf, {
    contentType: ext === "png" ? "image/png" : ext === "webp" ? "image/webp" : "image/jpeg",
    upsert: true,
  });
  if (error) throw new Error(`storage: ${error.message}`);
  return sb.storage.from("listing-photos").getPublicUrl(path).data.publicUrl;
}

/* -------- 2. import each listing -------- */
let created = 0, skipped = 0, photosUp = 0, failures = [];
for (const url of urls) {
  const shortSlug = url.split("/properties/")[1];
  try {
    const exists = await db.query("select id from listings where slug=$1", [shortSlug]);
    if (exists.rows[0]) { skipped++; console.log(`skip (exists): ${shortSlug}`); continue; }

    const p = parse(await fetchText(url + "/"), url);
    const ins = await db.query(
      `insert into listings (slug, title, city, country, region, property_type,
         max_guests, bedrooms, bathrooms, headline, description, min_stay, status)
       values ($1,$2,$3,$4,$5,'condo',$6,$7,$8,$9,$10,2,'draft') returning id`,
      [p.slug, p.title, p.city, p.country, p.region, p.maxGuests, p.bedrooms,
       p.bathrooms, p.city, p.description],
    );
    const id = ins.rows[0].id;
    await db.query(
      `insert into listing_rates (listing_id, nightly_cents, cleaning_cents, tax_pct, currency)
       values ($1,$2,0,$3,'USD')`,
      [id, Math.round((p.price || 100) * 100), p.taxPct],
    );
    await db.query(
      `insert into listing_pricing (listing_id) values ($1) on conflict do nothing`, [id]);

    let sort = 0;
    for (const [i, img] of p.imgs.entries()) {
      try {
        const publicUrl = await uploadPhoto(id, img, i);
        await db.query(
          `insert into listing_photos (listing_id, url, alt, sort) values ($1,$2,$3,$4)`,
          [id, publicUrl, p.title, sort++]);
        photosUp++;
      } catch (e) {
        console.log(`  photo failed (${img.slice(-40)}): ${e.message}`);
      }
    }
    created++;
    console.log(`✓ ${p.title} — $${p.price}/n · ${p.city} · ${sort} photos`);
  } catch (e) {
    failures.push(`${shortSlug}: ${e.message}`);
    console.log(`✗ ${shortSlug}: ${e.message}`);
  }
}

console.log(`\nDONE — created ${created}, skipped ${skipped}, photos ${photosUp}, failures ${failures.length}`);
failures.forEach((f) => console.log("  FAIL", f));
await db.end();
