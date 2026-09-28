import type { MetadataRoute } from "next";
import { getDb } from "@/lib/db";

export const revalidate = 3600;

const SITE = "https://tutcasa.com";
const PAGES = ["", "/stays", "/tours", "/experiences", "/concierge", "/our-family", "/gift-cards",
  "/loyalty", "/why-book-with-us", "/faq", "/policies", "/contact", "/investors", "/list-my-property"];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const stays = await getDb()
    .query<{ slug: string; updated_at: Date }>("select slug, updated_at from listings where status = 'published'")
    .then((r) => r.rows).catch(() => []);
  return [
    ...PAGES.map((p) => ({ url: `${SITE}${p}`, changeFrequency: "weekly" as const, priority: p === "" ? 1 : 0.7 })),
    ...stays.map((s) => ({ url: `${SITE}/stays/${s.slug}`, lastModified: s.updated_at, changeFrequency: "daily" as const, priority: 0.9 })),
  ];
}
