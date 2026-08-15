import { NextResponse } from "next/server";
import { partnerAuthorized, unauthorized } from "@/lib/partner-auth";
import { getPartnerBookingStatus } from "@/modules/bookings/partner";

export const dynamic = "force-dynamic";

/**
 * GET /api/partner/bookings/{id} — live status of a partner hold, request
 * or booking. Amanah polls this to learn when a request-to-book was
 * approved (status "confirmed" → collect payment) or declined/expired
 * (status "cancelled" → tell the guest).
 */
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!partnerAuthorized(req)) return unauthorized();
  const { id } = await params;
  const res = await getPartnerBookingStatus(id);
  if (!res) {
    return NextResponse.json({ ok: false, error: "NOT_FOUND" }, { status: 404, headers: { "Cache-Control": "no-store" } });
  }
  return NextResponse.json(res, { headers: { "Cache-Control": "no-store" } });
}
