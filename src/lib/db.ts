import { Pool } from "pg";

/**
 * Server-only direct Postgres pool (postgres role — bypasses RLS).
 * Used by module services for writes and privileged reads; never
 * imported from client components. On serverless deploys, point
 * DATABASE_URL at the Supabase session pooler.
 */
let pool: Pool | undefined;

export function getDb(): Pool {
  if (!pool) {
    const url = process.env.DATABASE_URL;
    if (!url) throw new Error("DATABASE_URL is not configured");
    pool = new Pool({
      connectionString: url,
      ssl: { rejectUnauthorized: false },
      max: 5,
    });
  }
  return pool;
}
