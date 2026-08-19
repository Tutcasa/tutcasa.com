import "server-only";

/**
 * Small in-memory throttle for public server actions. Per-instance only
 * (serverless instances don't share state), but it stops the cheap
 * abuse loops: booking-hold spam, email floods, coupon minting, and
 * admin-password guessing bursts.
 */

const buckets = new Map<string, { n: number; t: number }>();

/** true when `key` exceeded `max` hits inside `windowMs`. */
export function overLimit(key: string, max: number, windowMs: number): boolean {
  const now = Date.now();
  // opportunistic cleanup so the map can't grow unbounded
  if (buckets.size > 5000) {
    for (const [k, v] of buckets) if (now - v.t > windowMs) buckets.delete(k);
  }
  const b = buckets.get(key);
  if (!b || now - b.t > windowMs) {
    buckets.set(key, { n: 1, t: now });
    return false;
  }
  b.n += 1;
  return b.n > max;
}
