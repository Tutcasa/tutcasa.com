import { getDb } from "@/lib/db";

export const dynamic = "force-dynamic";

const BADGE: Record<string, string> = {
  sent: "bg-cactus/15 text-cactus",
  pending: "bg-sol/15 text-terra",
  failed: "bg-rosa/15 text-rosa-deep",
  manual: "bg-grey/15 text-grey",
};

interface LogRow {
  id: string;
  kind: string;
  channel: string;
  recipient: string;
  subject: string | null;
  status: string;
  error: string | null;
  created_at: string;
}

const FILTERS = ["all", "sent", "pending", "failed", "manual"] as const;
type Filter = (typeof FILTERS)[number];

export default async function AdminNotifications({
  searchParams,
}: { searchParams: Promise<{ status?: string }> }) {
  const { status } = await searchParams;
  const filter: Filter = FILTERS.includes(status as Filter) ? (status as Filter) : "all";

  const db = getDb();
  const res = filter === "all"
    ? await db.query<LogRow>(
        `select id, kind, channel, recipient, subject, status, error, created_at
           from notifications_log order by created_at desc limit 200`)
    : await db.query<LogRow>(
        `select id, kind, channel, recipient, subject, status, error, created_at
           from notifications_log where status=$1
          order by created_at desc limit 200`, [filter]);

  return (
    <div>
      <h1 className="mb-4 text-2xl font-extrabold">Notifications</h1>
      <p className="mb-4 text-sm text-grey">
        Every email &amp; WhatsApp the platform sends (or queues) — newest
        first. <b>manual</b> means no email key was configured at the time, so
        it was logged for you to send by hand.
      </p>

      <div className="mb-4 flex flex-wrap gap-1.5">
        {FILTERS.map((f) => (
          <a key={f}
            href={f === "all" ? "/admin/notifications" : `/admin/notifications?status=${f}`}
            className={`rounded-pill border-[1.5px] px-4 py-1.5 text-sm font-bold capitalize ${
              filter === f
                ? "border-ink bg-ink text-white"
                : "border-line bg-paper hover:border-rosa hover:text-rosa"
            }`}>
            {f}
          </a>
        ))}
      </div>

      <div className="overflow-x-auto rounded-card bg-paper shadow-soft">
        <table className="w-full min-w-[760px] text-sm">
          <thead className="border-b border-line text-left text-xs uppercase text-grey">
            <tr>
              <th className="p-3">When</th><th className="p-3">Kind</th>
              <th className="p-3">Channel</th><th className="p-3">To</th>
              <th className="p-3">Subject</th><th className="p-3">Status</th>
            </tr>
          </thead>
          <tbody>
            {res.rows.map((n) => (
              <tr key={n.id} className="border-b border-line/60">
                <td className="whitespace-nowrap p-3 text-xs text-grey">
                  {new Date(n.created_at).toLocaleString()}
                </td>
                <td className="p-3 font-mono text-xs">{n.kind}</td>
                <td className="p-3">{n.channel}</td>
                <td className="p-3">{n.recipient}</td>
                <td className="max-w-[280px] truncate p-3">{n.subject ?? "—"}</td>
                <td className="p-3">
                  <span className={`rounded-pill px-2.5 py-1 text-xs font-bold ${BADGE[n.status] ?? ""}`}>{n.status}</span>
                  {n.error && <div className="mt-1 max-w-[220px] truncate text-[10px] text-rosa-deep" title={n.error}>{n.error}</div>}
                </td>
              </tr>
            ))}
            {res.rows.length === 0 && (
              <tr><td colSpan={6} className="p-8 text-center text-grey">Nothing logged yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
