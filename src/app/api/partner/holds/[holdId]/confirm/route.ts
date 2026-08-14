import { NextResponse } from "next/server";
import { partnerAuthorized, unauthorized } from "@/lib/partner-auth";
import { confirmPartnerHold } from "@/modules/bookings/partner";

export const dynamic = "force-dynamic";

const NO_STORE = { "Cache-Control": "no-store" };

/**
 * POST /api/partner/holds/{holdId}/confirm — payment received on Amanah;
 * convert the hold into a confirmed, paid-in-full booking. Idempotent.
 * NOTE: no TutCasa payment email is sent — Amanah owns the confirmation
 * email for partner bookings.
 */
export async function POST(req: Request, { params }: { params: Promise<{ holdId: string }> }) {
  if (!partnerAuthorized(req)) return unauthorized();
  const { holdId } = await params;

  let body: {
    partnerRef?: string; guestName?: string; guestEmail?: string;
    guestWhatsapp?: string; amountPaid?: number; currency?: string; notes?: string;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "INVALID_CONTACT" }, { status: 422, headers: NO_STORE });
  }

  const res = await confirmPartnerHold(holdId, {
    partnerRef: body.partnerRef,
    guestName: String(body.guestName ?? ""),
    guestEmail: String(body.guestEmail ?? ""),
    guestWhatsapp: body.guestWhatsapp,
    amountPaid: Number(body.amountPaid) || 0,
    notes: body.notes,
  });

  if (res.ok) return NextResponse.json(res, { status: 200, headers: NO_STORE });
  const status = res.error === "INVALID_CONTACT" ? 422 : 410;
  return NextResponse.json(res, { status, headers: NO_STORE });
}
