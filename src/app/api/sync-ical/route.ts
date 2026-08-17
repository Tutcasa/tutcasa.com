import { NextResponse } from "next/server";
import { syncIcalFeeds } from "@/modules/ical";

export const dynamic = "force-dynamic";

/**
 * Pulls every active external iCal feed into availability_blocks.
 * Vercel cron hits this on a schedule; the admin "Sync now" button uses a
 * server action instead. When CRON_SECRET is set, callers must send it.
 */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret && req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }
  const res = await syncIcalFeeds();
  return NextResponse.json(res, { headers: { "Cache-Control": "no-store" } });
}
