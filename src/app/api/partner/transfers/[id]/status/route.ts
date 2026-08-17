import { NextResponse } from "next/server";
import { partnerAuthorized, unauthorized } from "@/lib/partner-auth";
import { setTransferStatus } from "@/modules/transfers";
import { revalidatePath } from "next/cache";

export const dynamic = "force-dynamic";

/**
 * POST /api/partner/transfers/{id}/status — Amanah's status callback for an
 * airport transfer: {"status":"confirmed"|"need_details"|"done","note":"…"}.
 * need_details requires a note; it reopens the form on the TutCasa side.
 */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!partnerAuthorized(req)) return unauthorized();
  const { id } = await params;

  let body: { status?: string; note?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "INVALID_BODY" }, { status: 422 });
  }
  const status = String(body.status ?? "");
  if (!["confirmed", "need_details", "done"].includes(status)) {
    return NextResponse.json({ ok: false, error: "INVALID_STATUS" }, { status: 422 });
  }
  if (status === "need_details" && !body.note?.trim()) {
    return NextResponse.json({ ok: false, error: "NOTE_REQUIRED" }, { status: 422 });
  }

  const ok = await setTransferStatus(id, status as "confirmed" | "need_details" | "done", body.note);
  if (!ok) return NextResponse.json({ ok: false, error: "NOT_FOUND" }, { status: 404 });
  revalidatePath("/admin/transfers");
  return NextResponse.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
}
