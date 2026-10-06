/** The team's alert inboxes: TUTCASA_NOTIFY_EMAIL, comma-separated. */
export function teamEmails(): string[] {
  return [...new Set((process.env.TUTCASA_NOTIFY_EMAIL ?? "")
    .split(/[,;\s]+/).map((s) => s.trim()).filter(Boolean))];
}
