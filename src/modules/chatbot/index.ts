import "server-only";
import { getDb } from "@/lib/db";
import { getSetting } from "@/modules/settings";

/**
 * Knowledge base for the AI concierge ("Contact us" chat). The system
 * prompt is rebuilt from live data at most every 5 minutes per server
 * instance — listings, tours, FAQs, policies — so the bot always knows
 * the real catalog without a per-message DB hit.
 */

interface KB {
  prompt: string;
  builtAt: number;
}

let cache: KB | null = null;
const TTL_MS = 5 * 60 * 1000;

async function buildKnowledge(): Promise<string> {
  const db = getDb();
  const [homes, tours, faq, contact, fx] = await Promise.all([
    db.query(
      `select l.title, l.slug, l.city, l.country, l.max_guests, l.bedrooms,
              l.min_stay, coalesce(l.instant_book,false) as instant_book,
              coalesce(l.allow_pets,false) as allow_pets, r.nightly_cents, r.tax_pct
         from listings l
         left join listing_rates r on r.listing_id = l.id and r.season is null
        where l.status = 'published' order by l.city, l.title`,
    ),
    db.query(
      `select title, city, category, price_cents, duration_label
         from tours where status = 'published' order by category, title limit 60`,
    ),
    getSetting("page_faq"),
    getSetting("contact"),
    getSetting("fx"),
  ]);
  const usd = (mxn: number) => Math.round(mxn / fx.mxnPerUsd);

  const homeLines = homes.rows.map((h) => {
    const allIn = h.nightly_cents
      ? Math.round((h.nightly_cents / 100) * (1 + Number(h.tax_pct ?? 0) / 100))
      : null;
    return `- ${h.title} — ${h.city}${h.country === "EG" ? ", Egypt" : h.country === "US" ? ", Florida" : ", Mexico"} · sleeps ${h.max_guests} · ${h.bedrooms} BR · min ${h.min_stay} nights${allIn ? ` · from ~$${allIn} USD/night all-in` : ""}${h.instant_book ? " · instant book" : ""}${h.allow_pets ? " · pets OK" : ""} · page: /stays/${h.slug}`;
  });

  const tourLines = tours.rows.map((t) =>
    `- ${t.title}${t.city ? ` (${t.city})` : ""} · ${t.category}${t.price_cents > 0 ? ` · from ~$${usd(t.price_cents / 100)} USD ($${Math.round(t.price_cents / 100)} MXN)` : " · price on request"}${t.duration_label ? ` · ${t.duration_label}` : ""}`,
  );

  const faqLines = faq.items.map((f) => `Q: ${f.q}\nA: ${f.a}`);

  return [
    `## Homes (${homeLines.length})`,
    ...homeLines,
    ``,
    `## Tours & parks (partner prices via Amanah Vacations)`,
    ...tourLines,
    ``,
    `## FAQ`,
    ...faqLines,
    ``,
    `## Contact`,
    `WhatsApp: +${contact.whatsapp} (share as https://wa.me/${contact.whatsapp})`,
  ].join("\n");
}

export async function getSystemPrompt(): Promise<string> {
  if (cache && Date.now() - cache.builtAt < TTL_MS) return cache.prompt;
  const knowledge = await buildKnowledge();
  const prompt = [
    `You are the TutCasa concierge assistant on tutcasa.com — a family-run vacation-rental company with homes in Playa del Carmen, Tulum, Nuba (Egypt) and Orlando, plus tours, theme-park tickets and airport transfers in the Riviera Maya.`,
    ``,
    `Your job: help guests pick a home, answer questions about booking, pricing, policies, tours and transfers, and guide them to the right page. Every booking includes a free arrival airport transfer and WhatsApp concierge.`,
    ``,
    `Today's date: ${new Date(Date.now() - 5 * 3600 * 1000).toISOString().slice(0, 10)} (Cancún time).`,
    ``,
    `Rules:`,
    `- Be warm, concise and concrete. A few sentences per reply; use short lists when comparing homes.`,
    `- Only state facts from the knowledge below or from your tools. If you still don't know, say so and hand off to WhatsApp.`,
    `- AVAILABILITY & EXACT PRICES: never guess — use check_availability_and_price with the home's slug and the guest's dates. Use get_busy_dates when they ask "when is it free" without dates. Quote the tool's numbers exactly (total, due today, balance, security deposit).`,
    `- BOOKING: you complete bookings by preparing checkout. Once the guest confirms home + dates + guests and the availability check passes, give them the bookingLink from the tool result and say: opening that link shows the exact price breakdown and reserves the dates — no charge is taken until the booking is confirmed. Never claim you booked something yourself.`,
    `- Base prices in the knowledge are estimates ("from"); tools give exact totals.`,
    `- TOUR RECOMMENDATIONS: before recommending tours, ask (if not already known) how many people are going and the kids' ages. Then call get_tours_for_group with the group size and pick 2-3 tours that genuinely fit: use the descriptions/highlights to judge age suitability (gentle beach/park days for small kids; longer adventure days for teens/adults), respect min/max group limits, and use the group-tier total when one exists (else per-person × group). Point them to /tours to book, and mention park tickets need at least a day's notice if the description says so.`,
    `- CURRENCY: quote every price in USD by default (use the tools' USD fields). Tours are CHARGED in MXN — add the MXN amount in parentheses for tour totals. If the guest asks in pesos or clearly prefers MXN, quote MXN first instead.`,
    `- When you mention a home or page, give its path (e.g. /stays/casa-selva) so the site can link it.`,
    `- Payment questions: card via Stripe, PayPal, Zelle, bank wire; InstaPay from Egypt. Deposits: a security deposit may apply — never call it refundable, just "security deposit".`,
    `- For anything personal (existing booking changes, complaints, discounts beyond listed coupons, urgent matters) hand off to WhatsApp.`,
    `- Never invent coupon codes, availability, or homes not in the list.`,
    `- Reply in the guest's language (English, Spanish or French).`,
    ``,
    `# Knowledge`,
    knowledge,
  ].join("\n");
  cache = { prompt, builtAt: Date.now() };
  return prompt;
}
