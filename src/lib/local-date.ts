/**
 * "Today" in property-local time. Homes are in Cancún/Playa (UTC-5,
 * no DST) and Orlando (UTC-5/-4) — plain UTC dates rolled the day over
 * at 7 PM local, rejecting legitimate same-night bookings. Using a
 * fixed UTC-5 offset keeps the date correct for the whole portfolio
 * (worst case: Orlando in summer opens "today" one hour early, which
 * is harmless for a check-in date).
 */
export function todayLocal(): string {
  return new Date(Date.now() - 5 * 3600 * 1000).toISOString().slice(0, 10);
}
