import { buildExportFeed } from "@/modules/ical";

export const dynamic = "force-dynamic";

/**
 * Per-listing iCal EXPORT feed — the URL you paste into Airbnb/VRBO's
 * "import calendar" box. The token is unguessable; the feed contains busy
 * date ranges only, never guest data.
 */
export async function GET(_req: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const feed = await buildExportFeed(token.replace(/\.ics$/i, ""));
  if (!feed) return new Response("Not found", { status: 404 });
  return new Response(feed.ics, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `inline; filename="tutcasa.ics"`,
      "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600",
    },
  });
}
