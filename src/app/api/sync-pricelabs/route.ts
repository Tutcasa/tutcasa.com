import { NextResponse } from "next/server";
import { syncPriceLabs } from "@/modules/pricelabs";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

/** Daily PriceLabs pull — every mapped home's future nightly prices. */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret && req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }
  const res = await syncPriceLabs();
  return NextResponse.json(res, { headers: { "Cache-Control": "no-store" } });
}
