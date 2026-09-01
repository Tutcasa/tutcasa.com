import { NextRequest, NextResponse } from "next/server";
import { partnerAuthorized, unauthorized } from "@/lib/partner-auth";
import { getDb } from "@/lib/db";

export const dynamic = "force-dynamic";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Amanah's decision on a TOUR booking, from their admin queue:
 *   accept  → partner_confirmed (they can operate it)
 *   deny    → cancelled
 *   need_details → stays pending, their question stored & shown in admin
 * Body: { bookingId, action: "accept"|"deny"|"need_details", note? }
 */
export async function POST(req: NextRequest) {
  if (!partnerAuthorized(req)) return unauthorized();
  let body: { bookingId?: string; action?: string; note?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "INVALID_JSON" }, { status: 400 });
  }
  const id = String(body.bookingId ?? "");
  const action = String(body.action ?? "");
  if (!UUID.test(id)) return NextResponse.json({ ok: false, error: "NOT_FOUND" }, { status: 404 });

  const db = getDb();
  let res;
  if (action === "accept") {
    res = await db.query(
      `update tour_bookings set status='partner_confirmed',
              partner_confirmed_at=now(), amanah_note=null
        where id=$1 and status in ('pending','paid') returning id`,
      [id],
    );
  } else if (action === "deny") {
    res = await db.query(
      `update tour_bookings set status='cancelled',
              amanah_note=coalesce($2, amanah_note)
        where id=$1 and status not in ('completed','cancelled') returning id`,
      [id, body.note?.trim() || null],
    );
  } else if (action === "need_details") {
    const note = body.note?.trim();
    if (!note) return NextResponse.json({ ok: false, error: "NOTE_REQUIRED" }, { status: 400 });
    res = await db.query(
      `update tour_bookings set amanah_note=$2
        where id=$1 and status not in ('completed','cancelled') returning id`,
      [id, note],
    );
  } else {
    return NextResponse.json({ ok: false, error: "INVALID_ACTION" }, { status: 400 });
  }

  if (!res.rows[0]) return NextResponse.json({ ok: false, error: "NOT_FOUND" }, { status: 404 });
  return NextResponse.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
}
