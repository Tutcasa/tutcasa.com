import { NextResponse } from "next/server";
import { syncGoogleReviews } from "@/modules/reviews";

export const dynamic = "force-dynamic";

/**
 * Daily cron: refresh the cached Google reviews shown on the homepage.
 * When CRON_SECRET is set, requests must carry it as a Bearer token —
 * an open endpoint would let anyone burn the client's Places API quota.
 */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret && req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const result = await syncGoogleReviews();
  return NextResponse.json(result, { status: result.ok ? 200 : 500 });
}
