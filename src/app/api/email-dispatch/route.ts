import { NextResponse } from "next/server";
import { runScheduledEmails } from "@/modules/emails/dispatch";

export const dynamic = "force-dynamic";

/**
 * Daily email sweep — timed automations (pre-check-in trip details,
 * pre-check-out instructions, second-payment-due reminders). Vercel cron
 * hits this; deduped via notifications_log so reruns are safe.
 */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret && req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }
  const res = await runScheduledEmails();
  return NextResponse.json(res, { headers: { "Cache-Control": "no-store" } });
}
