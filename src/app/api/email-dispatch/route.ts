import { NextResponse } from "next/server";
import { runScheduledEmails } from "@/modules/emails/dispatch";

export const dynamic = "force-dynamic";

/**
 * Email sweep — timed automations (pre-check-in trip details,
 * pre-check-out instructions, second-payment-due reminders) plus due
 * scheduled blasts. Vercel cron hits this every 15 min; deduped via
 * notifications_log / row claims so reruns are safe.
 */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret && req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }
  const res = await runScheduledEmails();
  const { runDueBroadcasts } = await import("@/modules/emails/broadcast");
  const broadcasts = await runDueBroadcasts();
  return NextResponse.json({ ...res, broadcasts }, { headers: { "Cache-Control": "no-store" } });
}
