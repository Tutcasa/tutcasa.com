import { NextRequest, NextResponse } from "next/server";
import { syncAmanahTours } from "@/modules/tours/sync";

export const dynamic = "force-dynamic";

/**
 * Runs the Amanah tours sync. Called by Vercel Cron (vercel.json) so
 * Amanah price/tour changes propagate automatically, and usable manually.
 * When CRON_SECRET is set, requests must carry it as a Bearer token.
 */
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (secret && req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }
  const res = await syncAmanahTours();
  return NextResponse.json(res, { status: res.ok ? 200 : 502 });
}
