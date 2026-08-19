import Anthropic from "@anthropic-ai/sdk";
import { betaZodTool } from "@anthropic-ai/sdk/helpers/beta/zod";
import { z } from "zod";
import { getSystemPrompt } from "@/modules/chatbot";
import { checkStay, busyRanges } from "@/modules/chatbot/tools";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * AI concierge endpoint for the "Contact us" chat widget. Streams plain
 * text; the model can check REAL availability and prices through the
 * same engine checkout uses, and hands the guest a prefilled booking
 * link. When ANTHROPIC_API_KEY isn't configured the widget falls back
 * to the WhatsApp handoff (response: { fallback: true }).
 */

const MAX_TURNS = 24;
const MAX_CHARS = 2000;

const hits = new Map<string, { n: number; t: number }>();
function throttled(ip: string): boolean {
  const now = Date.now();
  const h = hits.get(ip);
  if (!h || now - h.t > 10 * 60 * 1000) {
    hits.set(ip, { n: 1, t: now });
    return false;
  }
  h.n += 1;
  return h.n > 30;
}

const checkAvailabilityTool = betaZodTool({
  name: "check_availability_and_price",
  description:
    "Check whether a specific home is available for concrete dates and get the exact all-in price, deposit split, and a prefilled booking link. Use the home's slug from the knowledge list (the part after /stays/). Dates are YYYY-MM-DD; checkOut is the departure day.",
  inputSchema: z.object({
    slug: z.string().describe("listing slug, e.g. casa-selva"),
    checkIn: z.string().describe("YYYY-MM-DD"),
    checkOut: z.string().describe("YYYY-MM-DD"),
    guests: z.number().int().min(1).max(30),
  }),
  run: async ({ slug, checkIn, checkOut, guests }) =>
    JSON.stringify(await checkStay(slug, checkIn, checkOut, guests)),
});

const busyRangesTool = betaZodTool({
  name: "get_busy_dates",
  description:
    "List a home's already-booked/blocked date ranges for the next 6 months (checkOut day is free again). Use when the guest asks WHEN a home is available without giving exact dates.",
  inputSchema: z.object({
    slug: z.string().describe("listing slug, e.g. casa-selva"),
  }),
  run: async ({ slug }) => JSON.stringify(await busyRanges(slug)),
});

export async function POST(req: Request) {
  if (!process.env.ANTHROPIC_API_KEY) {
    return Response.json({ fallback: true });
  }
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  if (throttled(ip)) {
    return Response.json({ error: "Too many messages — give it a few minutes." }, { status: 429 });
  }

  let body: { messages?: { role: string; content: string }[] };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Bad request" }, { status: 400 });
  }
  const history = (body.messages ?? [])
    .filter((m) => (m.role === "user" || m.role === "assistant") && typeof m.content === "string" && m.content.trim())
    .slice(-MAX_TURNS)
    .map((m) => ({
      role: m.role as "user" | "assistant",
      content: m.content.slice(0, MAX_CHARS),
    }));
  if (history.length === 0 || history[history.length - 1].role !== "user") {
    return Response.json({ error: "Bad request" }, { status: 400 });
  }

  const client = new Anthropic();
  const system = await getSystemPrompt();

  const runner = client.beta.messages.toolRunner({
    model: "claude-opus-5",
    max_tokens: 1024,
    // fast, cheap replies for a chat widget; the knowledge does the work
    output_config: { effort: "low" },
    // safety-refusal fallback routing (recommended default for Opus 5)
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default",
    tools: [checkAvailabilityTool, busyRangesTool],
    max_iterations: 6,
    system: [{ type: "text", text: system, cache_control: { type: "ephemeral" } }],
    messages: history,
    stream: true,
  });

  const encoder = new TextEncoder();
  const readable = new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        for await (const messageStream of runner) {
          for await (const event of messageStream) {
            if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
              controller.enqueue(encoder.encode(event.delta.text));
            }
          }
        }
      } catch {
        controller.enqueue(encoder.encode(
          "\n\nSorry — I hit a snag. Please try again, or reach us on WhatsApp for a human. ",
        ));
      } finally {
        controller.close();
      }
    },
  });
  return new Response(readable, {
    headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" },
  });
}
