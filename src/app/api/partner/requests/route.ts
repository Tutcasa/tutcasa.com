import { NextResponse } from "next/server";
import { partnerAuthorized, unauthorized } from "@/lib/partner-auth";
import { createPartnerRequest } from "@/modules/bookings/partner";

export const dynamic = "force-dynamic";

const NO_STORE = { "Cache-Control": "no-store" };

/**
 * POST /api/partner/requests — request-to-book flow: the guest books on
 * Amanah WITHOUT paying; the dates are held 72h while the owner approves
 * (admin Confirm) or declines (admin Cancel). Amanah polls
 * GET /api/partner/bookings/{id} and collects payment after approval.
 */
export async function POST(req: Request) {
  if (!partnerAuthorized(req)) return unauthorized();

  let body: {
    slug?: string; checkIn?: string; checkOut?: string; guests?: number;
    partnerRef?: string; guestName?: string; guestEmail?: string;
    guestWhatsapp?: string; notes?: string;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "INVALID_DATES" }, { status: 422, headers: NO_STORE });
  }
  if (!body.slug || !body.checkIn || !body.checkOut) {
    return NextResponse.json({ ok: false, error: "INVALID_DATES" }, { status: 422, headers: NO_STORE });
  }

  const res = await createPartnerRequest({
    slug: String(body.slug),
    checkIn: String(body.checkIn),
    checkOut: String(body.checkOut),
    guests: Math.max(1, Number(body.guests) || 1),
    partnerRef: body.partnerRef ? String(body.partnerRef) : undefined,
    guestName: String(body.guestName ?? ""),
    guestEmail: String(body.guestEmail ?? ""),
    guestWhatsapp: body.guestWhatsapp,
    notes: body.notes,
  });

  if (res.ok) return NextResponse.json(res, { status: 201, headers: NO_STORE });
  const status =
    res.error === "NOT_FOUND" ? 404 :
    res.error === "DATES_TAKEN" ? 409 : 422;
  return NextResponse.json(res, { status, headers: NO_STORE });
}
