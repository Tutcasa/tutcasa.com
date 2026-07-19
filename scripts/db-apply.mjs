// Applies SQL files to DATABASE_URL, each in its own transaction.
// Usage: node scripts/db-apply.mjs <file.sql> [...more]
import { readFileSync } from "node:fs";
import pg from "pg";

const url = process.env.DATABASE_URL;
if (!url) { console.error("DATABASE_URL not set"); process.exit(1); }

const client = new pg.Client({ connectionString: url, ssl: { rejectUnauthorized: false } });
await client.connect();

for (const file of process.argv.slice(2)) {
  const sql = readFileSync(file, "utf8");
  process.stdout.write(`applying ${file} ... `);
  try {
    await client.query("begin");
    await client.query(sql);
    await client.query("commit");
    console.log("✓");
  } catch (e) {
    await client.query("rollback");
    console.log(`✗ ${e.message}`);
    await client.end();
    process.exit(1);
  }
}
await client.end();
console.log("done");
