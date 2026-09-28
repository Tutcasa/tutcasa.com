import "server-only";
import { getDb } from "@/lib/db";

/**
 * Admin trash: a delete snapshots the row + its child rows into `trash`
 * (one transaction), so it can be restored for 30 days. pg_cron job
 * `tutcasa-trash-purge` then removes it for good (migration 0057).
 */
export type TrashKind = "stay" | "tour" | "gift_card";

/** children: removed with the record, restored with it.
    relink: rows that stay (accounting) but lose their link until restore. */
const SPEC: Record<TrashKind, { table: string; children: [string, string][]; relink: [string, string][] }> = {
  stay: {
    table: "bookings",
    children: [["notifications_log", "booking_id"], ["reviews", "booking_id"], ["transfers", "booking_id"],
               ["referral_rewards", "booking_id"], ["booking_extras", "booking_id"]],
    relink: [["gift_card_ledger", "booking_id"], ["listing_reviews", "booking_id"]],
  },
  tour: {
    table: "tour_bookings",
    children: [["notifications_log", "tour_booking_id"]],
    relink: [["gift_card_ledger", "tour_booking_id"]],
  },
  gift_card: { table: "gift_cards", children: [["gift_card_ledger", "gift_card_id"]], relink: [] },
};

type Row = Record<string, unknown>;
const usd = (c: unknown) => `$${Math.round(Number(c ?? 0) / 100).toLocaleString("en-US")}`;

function labelFor(kind: TrashKind, r: Row): string {
  if (kind === "gift_card") return `Gift card ****${r.code_last4} · ${usd(r.initial_cents)} (balance ${usd(r.balance_cents)})`;
  const inv = r.invoice_no ? `Invoice #${r.invoice_no} · ` : "";
  if (kind === "tour") return `${inv}Tour · ${r.guest_name} · ${r.tour_date} · ${usd(r.total_cents)} ${r.currency}`;
  const [ci, co] = String(r.stay ?? "").replace(/[[\]()]/g, "").split(",");
  return `${inv}Stay · ${r.guest_name} · ${ci} → ${co} · ${usd(r.total_cents)} · ${r.status}`;
}

/** Snapshot + delete. Returns the deleted row (null if it didn't exist). */
export async function moveToTrash(kind: TrashKind, id: string): Promise<Row | null> {
  const s = SPEC[kind];
  const c = await getDb().connect();
  try {
    await c.query("begin");
    const row = (await c.query(`select to_jsonb(t) as j from ${s.table} t where id = $1 for update`, [id])).rows[0]?.j as Row | undefined;
    if (!row) { await c.query("rollback"); return null; }
    const children: Record<string, unknown> = {};
    for (const [t, fk] of s.children) {
      children[t] = (await c.query(`delete from ${t} x where ${fk} = $1 returning to_jsonb(x) as j`, [id])).rows.map((r) => r.j);
    }
    const relink: Record<string, unknown> = {};
    for (const [t, fk] of s.relink) {
      relink[t] = (await c.query(`update ${t} set ${fk} = null where ${fk} = $1 returning id`, [id])).rows.map((r) => r.id);
    }
    await c.query(`delete from ${s.table} where id = $1`, [id]);
    await c.query("insert into trash (kind, record_id, label, data) values ($1,$2,$3,$4)",
      [kind, id, labelFor(kind, row), { row, children, relink }]);
    await c.query("commit");
    return row;
  } catch (e) {
    await c.query("rollback").catch(() => {});
    throw e;
  } finally {
    c.release();
  }
}

export interface TrashItem { id: string; kind: TrashKind; label: string; deletedAt: string; daysLeft: number }

export async function listTrash(): Promise<TrashItem[]> {
  const res = await getDb().query(
    `select id, kind, label, deleted_at,
            greatest(0, 30 - floor(extract(epoch from now() - deleted_at) / 86400))::int as days_left
       from trash order by deleted_at desc`);
  return res.rows.map((r) => ({ id: r.id, kind: r.kind, label: r.label, deletedAt: r.deleted_at, daysLeft: r.days_left }));
}

/** Put a trashed record back exactly as it was (same id, invoice number, children). */
export async function restoreFromTrash(trashId: string):
  Promise<{ ok: true; kind: TrashKind; row: Row } | { ok: false; message: string }> {
  const t = (await getDb().query("select kind, data from trash where id = $1", [trashId])).rows[0];
  if (!t) return { ok: false, message: "Already restored or gone." };
  const kind = t.kind as TrashKind;
  const s = SPEC[kind];
  const { row, children, relink } = t.data as { row: Row; children: Record<string, Row[]>; relink: Record<string, string[]> };
  const c = await getDb().connect();
  try {
    await c.query("begin");
    await c.query(`insert into ${s.table} select * from jsonb_populate_record(null::${s.table}, $1::jsonb)`, [row]);
    for (const [tbl] of s.children) {
      if (children[tbl]?.length) {
        await c.query(`insert into ${tbl} select * from jsonb_populate_recordset(null::${tbl}, $1::jsonb)`,
          [JSON.stringify(children[tbl])]);
      }
    }
    for (const [tbl, fk] of s.relink) {
      if (relink[tbl]?.length) {
        await c.query(`update ${tbl} set ${fk} = $1 where id::text = any($2) and ${fk} is null`,
          [row.id, relink[tbl].map(String)]);
      }
    }
    await c.query("delete from trash where id = $1", [trashId]);
    await c.query("commit");
    return { ok: true, kind, row };
  } catch (e) {
    await c.query("rollback").catch(() => {});
    const code = (e as { code?: string }).code;
    return {
      ok: false,
      message: code === "23P01" ? "Those dates were booked by someone else since — free them first, then restore."
        : code === "23505" ? "It already exists again (same id or invoice number)."
        : code === "23503" ? "The home, tour or gift card it belonged to no longer exists."
        : `Couldn't restore: ${(e as Error).message}`,
    };
  } finally {
    c.release();
  }
}
