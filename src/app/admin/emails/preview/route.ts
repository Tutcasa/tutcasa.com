import { getAutomation, renderEmailHtml } from "@/modules/emails";

export const dynamic = "force-dynamic";

/** Branded live preview with sample data — shown in the admin's iframe.
    Protected by the admin middleware like every /admin route. */
export async function GET(req: Request) {
  const key = new URL(req.url).searchParams.get("key") ?? "";
  const a = await getAutomation(key);
  if (!a) return new Response("Not found", { status: 404 });
  return new Response(renderEmailHtml({ subject: a.subject, body: a.body }), {
    headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" },
  });
}
