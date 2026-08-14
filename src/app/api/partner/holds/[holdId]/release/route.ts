import { NextResponse } from "next/server";
import { partnerAuthorized, unauthorized } from "@/lib/partner-auth";
import { releasePartnerHold } from "@/modules/bookings/partner";

export const dynamic = "force-dynamic";

/**
 * POST /api/partner/holds/{holdId}/release — free the dates early (payment
 * failed / guest abandoned checkout). Always 200, fully idempotent.
 */
export async function POST(req: Request, { params }: { params: Promise<{ holdId: string }> }) {
  if (!partnerAuthorized(req)) return unauthorized();
  const { holdId } = await params;
  await releasePartnerHold(holdId);
  return NextResponse.json({ ok: true }, { status: 200, headers: { "Cache-Control": "no-store" } });
}
