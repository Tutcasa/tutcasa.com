import Anthropic from "@anthropic-ai/sdk";
import { getSystemPrompt } from "@/modules/chatbot";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * AI concierge endpoint for the "Contact us" chat widget. Streams plain
 * text back. When ANTHROPIC_API_KEY isn't configured the widget falls
 * back to the WhatsApp handoff (response: { fallback: true }).
 */

const MAX_TURNS = 24; // client sends trimmed history
const MAX_CHARS = 2000; // per message

/* Small in-memory throttle per instance — enough to stop a casual
   abuse loop from burning tokens (Vercel instances are ephemeral). */
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

  const stream = client.beta.messages.stream({
    model: "claude-opus-5",
    max_tokens: 1024,
    // fast, cheap replies for a chat widget; the knowledge does the work
    output_config: { effort: "low" },
    // safety-refusal fallback routing (recommended default for Opus 5)
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default",
    system: [{ type: "text", text: system, cache_control: { type: "ephemeral" } }],
    messages: history,
  });

  const encoder = new TextEncoder();
  const readable = new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        for await (const event of stream) {
          if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
            controller.enqueue(encoder.encode(event.delta.text));
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
