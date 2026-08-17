// Backfill amenities for imported listings whose amenities are empty:
// the old site kept them as "-" bullet lines inside the description, so we
// lift the short bullets (2–5 per home) into amenity chips. Admin prunes.
import pg from "pg";
const db = new pg.Client({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
await db.connect();
const rows = (await db.query(
  `select id, title, description from listings
    where amenities = '{}' and description is not null and length(description) > 100`,
)).rows;
let updated = 0;
for (const l of rows) {
  const bullets = [...l.description.matchAll(/(?:^|\n)\s*[-•]\s*([^\n]{4,38})(?=\n|$)/g)]
    .map((m) => m[1].trim().replace(/[.:]$/, ""))
    .filter((b) => !/\d{3,}|http|@/.test(b));
  const amenities = [...new Set(bullets)].slice(0, 10);
  if (amenities.length >= 2) {
    await db.query("update listings set amenities=$2 where id=$1", [l.id, amenities]);
    updated++;
    console.log(`✓ ${l.title.slice(0, 50)} — ${amenities.length} amenities`);
  } else {
    console.log(`- ${l.title.slice(0, 50)} — no clean bullets, left for admin`);
  }
}
console.log(`\nDONE — ${updated}/${rows.length} listings updated`);
await db.end();
