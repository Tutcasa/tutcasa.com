import { NextRequest, NextResponse } from "next/server";
import { partnerAuthorized, unauthorized } from "@/lib/partner-auth";
import { syncAmanahTours } from "@/modules/tours/sync";

export const dynamic = "force-dynamic";

/**
 * Amanah pings this the moment a tour/park/activity is saved in THEIR
 * admin, so TutCasa mirrors the change immediately instead of waiting
 * for the daily cron. Same shared partner key as the booking API.
 */
export async function POST(req: NextRequest) {
  if (!partnerAuthorized(req)) return unauthorized();
  const res = await syncAmanahTours();
  return NextResponse.json(res, {
    status: res.ok ? 200 : 502,
    headers: { "Cache-Control": "no-store" },
  });
}
