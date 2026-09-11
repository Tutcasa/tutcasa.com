"use server";

import { revalidatePath } from "next/cache";
import {
  getSetting,
  setSetting,
  type ConciergeContent,
  type LoyaltyContent,
  type PoliciesContent,
  type WhyBookContent,
} from "@/modules/settings";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { requireAdmin } from "@/lib/admin-auth";

export interface ContentFormState { ok: boolean; message: string }

const s = (v: FormDataEntryValue | null) => String(v ?? "").trim();
const hero = (fd: FormData) => ({
  eyebrow: s(fd.get("eyebrow")),
  title: s(fd.get("title")),
  intro: s(fd.get("intro")),
});
const lines = (v: FormDataEntryValue | null) =>
  String(v ?? "").split("\n").map((l) => l.trim()).filter(Boolean);

/** "icon | title | text" per line */
function parseCards(v: FormDataEntryValue | null): WhyBookContent["cards"] {
  return lines(v).map((l) => {
    const [icon = "", title = "", ...rest] = l.split("|").map((p) => p.trim());
    return { icon, title, text: rest.join(" | ") };
  }).filter((c) => c.title);
}

/** "icon | title | tag | item, item, … | note(optional)" per line */
function parseServices(v: FormDataEntryValue | null): ConciergeContent["services"] {
  return lines(v).map((l) => {
    const [icon = "", title = "", tag = "", items = "", note = ""] =
      l.split("|").map((p) => p.trim());
    return {
      icon, title, tag,
      items: items.split(",").map((i) => i.trim()).filter(Boolean),
      ...(note ? { note } : {}),
    };
  }).filter((sv) => sv.title);
}

/** "title :: text" per line */
function parseSteps(v: FormDataEntryValue | null): ConciergeContent["steps"] {
  return lines(v).map((l) => {
    const i = l.indexOf("::");
    return i === -1
      ? { title: l, text: "" }
      : { title: l.slice(0, i).trim(), text: l.slice(i + 2).trim() };
  }).filter((st) => st.title);
}

export async function savePoliciesAction(
  _prev: ContentFormState,
  formData: FormData,
): Promise<ContentFormState> {
  await requireAdmin();
  // free-form editor: a line starting with "== " begins a NEW section
  // (its title); everything under it is that section's body. Sections
  // can be added, removed and reordered at will.
  const raw = String(formData.get("sections") ?? "");
  const sections: PoliciesContent["sections"] = [];
  let cur: { id: string; title: string; body: string[] } | null = null;
  const slug = (t: string) =>
    t.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") || `section-${sections.length + 1}`;
  for (const line of raw.split("\n")) {
    if (line.startsWith("== ")) {
      if (cur) sections.push({ id: cur.id, title: cur.title, body: cur.body.join("\n").trim() });
      const title = line.slice(3).trim();
      cur = { id: slug(title), title, body: [] };
    } else if (cur) {
      cur.body.push(line);
    }
  }
  if (cur) sections.push({ id: cur.id, title: cur.title, body: cur.body.join("\n").trim() });
  if (sections.length === 0) {
    return { ok: false, message: "Add at least one section (a line starting with \"== \" is a section title)." };
  }
  await setSetting("page_policies", { hero: hero(formData), sections });
  revalidatePath("/policies");
  revalidatePath("/admin/content");
  return { ok: true, message: `Help & policies updated — ${sections.length} sections live now.` };
}

export async function saveWhyAction(
  _prev: ContentFormState,
  formData: FormData,
): Promise<ContentFormState> {
  await requireAdmin();
  const cards = parseCards(formData.get("cards"));
  if (!cards.length) return { ok: false, message: "Add at least one card (icon | title | text)." };
  await setSetting("page_why", { hero: hero(formData), cards });
  revalidatePath("/why-book-with-us");
  revalidatePath("/admin/content");
  return { ok: true, message: "Why book with us updated — live now." };
}

export async function saveConciergeAction(
  _prev: ContentFormState,
  formData: FormData,
): Promise<ContentFormState> {
  await requireAdmin();
  const services = parseServices(formData.get("services"));
  if (!services.length) return { ok: false, message: "Add at least one service line." };
  const value: ConciergeContent = {
    hero: hero(formData),
    services,
    why: String(formData.get("why") ?? "").split(",").map((w) => w.trim()).filter(Boolean),
    steps: parseSteps(formData.get("steps")),
    uniqueTitle: s(formData.get("uniqueTitle")),
    uniqueText: s(formData.get("uniqueText")),
  };
  await setSetting("page_concierge", value);
  revalidatePath("/concierge");
  revalidatePath("/admin/content");
  return { ok: true, message: "Concierge page updated — live now." };
}

export async function saveFaqAction(
  _prev: ContentFormState,
  formData: FormData,
): Promise<ContentFormState> {
  await requireAdmin();
  const items = lines(formData.get("items"))
    .filter((l) => l.includes("::"))
    .map((l) => {
      const i = l.indexOf("::");
      return { q: l.slice(0, i).trim(), a: l.slice(i + 2).trim() };
    })
    .filter((f) => f.q && f.a);
  if (!items.length) return { ok: false, message: "Add at least one question (Question? :: Answer)." };
  await setSetting("page_faq", { hero: hero(formData), items });
  revalidatePath("/faq");
  revalidatePath("/admin/content");
  return { ok: true, message: "FAQ updated — live now." };
}

export async function saveLoyaltyAction(
  _prev: ContentFormState,
  formData: FormData,
): Promise<ContentFormState> {
  await requireAdmin();
  const value: LoyaltyContent = {
    hero: hero(formData),
    step1Title: s(formData.get("step1Title")),
    step1Text: s(formData.get("step1Text")),
    friendAmount: s(formData.get("friendAmount")),
    friendTitle: s(formData.get("friendTitle")),
    friendText: s(formData.get("friendText")),
    youAmount: s(formData.get("youAmount")),
    youTitle: s(formData.get("youTitle")),
    youText: s(formData.get("youText")),
    bandTitle: s(formData.get("bandTitle")),
    bandText: s(formData.get("bandText")),
  };
  await setSetting("page_loyalty", value);
  revalidatePath("/loyalty");
  revalidatePath("/admin/content");
  return { ok: true, message: "Loyalty page updated — live now." };
}

export async function saveContactAction(
  _prev: ContentFormState,
  formData: FormData,
): Promise<ContentFormState> {
  await requireAdmin();
  await setSetting("contact", {
    whatsapp: String(formData.get("whatsapp") ?? "").replace(/[^\d]/g, ""),
    email: String(formData.get("email") ?? "").trim(),
    instagram: String(formData.get("instagram") ?? "").trim(),
    facebook: String(formData.get("facebook") ?? "").trim(),
  });
  revalidatePath("/", "layout"); // footer shows contact everywhere
  return { ok: true, message: "Contact info saved — live across the site." };
}

const MAX_PDF_BYTES = 25 * 1024 * 1024;

export async function uploadDeckAction(
  _prev: ContentFormState,
  formData: FormData,
): Promise<ContentFormState> {
  await requireAdmin();
  const sb = getSupabaseAdmin();
  if (!sb) return { ok: false, message: "Storage key missing — uploads unavailable." };

  const file = formData.get("deck") as File | null;
  if (!file || file.size === 0) return { ok: false, message: "Choose a PDF first." };
  if (file.type !== "application/pdf") return { ok: false, message: "The investor deck must be a PDF." };
  if (file.size > MAX_PDF_BYTES) return { ok: false, message: "PDF too large (max 25 MB)." };

  const path = `investor-deck/${Date.now()}.pdf`;
  const { error } = await sb.storage.from("documents")
    .upload(path, Buffer.from(await file.arrayBuffer()), { contentType: "application/pdf" });
  if (error) return { ok: false, message: `Upload failed: ${error.message}` };

  // replace previous deck file to avoid orphans
  const prev = await getSetting("investor");
  if (prev.deck_url) {
    const old = prev.deck_url.split("/documents/")[1];
    if (old) await sb.storage.from("documents").remove([old]);
  }

  const { data } = sb.storage.from("documents").getPublicUrl(path);
  await setSetting("investor", { deck_url: data.publicUrl, deck_name: file.name });
  revalidatePath("/admin/content");
  return { ok: true, message: "Investor deck updated." };
}

export async function saveFxAction(
  _prev: ContentFormState,
  formData: FormData,
): Promise<ContentFormState> {
  await requireAdmin();
  const mxn = Number(formData.get("mxnPerUsd"));
  const cad = Number(formData.get("cadPerUsd"));
  if (!Number.isFinite(mxn) || mxn <= 0 || !Number.isFinite(cad) || cad <= 0) {
    return { ok: false, message: "Rates must be positive numbers (units per 1 USD)." };
  }
  await setSetting("fx", { mxnPerUsd: mxn, cadPerUsd: cad });
  revalidatePath("/", "layout"); // prices display everywhere
  return { ok: true, message: "Exchange rates saved — applied across the whole site." };
}

export async function saveGoogleReviewsAction(
  _prev: ContentFormState,
  formData: FormData,
): Promise<ContentFormState> {
  await requireAdmin();
  await setSetting("google_reviews", {
    placeId: String(formData.get("placeId") ?? "").trim(),
  });
  // try a sync right away so the admin sees the result immediately
  const { syncGoogleReviews } = await import("@/modules/reviews");
  const sync = await syncGoogleReviews();
  revalidatePath("/");
  return sync.ok
    ? { ok: true, message: `Saved. ${sync.message}` }
    : { ok: true, message: `Place ID saved. Sync note: ${sync.message}` };
}

const statPair = (fd: FormData, i: number) => ({
  big: String(fd.get(`stat_big_${i}`) ?? "").trim(),
  label: String(fd.get(`stat_label_${i}`) ?? "").trim(),
});

export async function saveListPropertyAction(
  _prev: ContentFormState,
  formData: FormData,
): Promise<ContentFormState> {
  await requireAdmin();
  await setSetting("page_list_property", {
    title: String(formData.get("title") ?? "").trim(),
    intro: String(formData.get("intro") ?? "").trim(),
    stats: [0, 1, 2].map((i) => statPair(formData, i)),
    formTitle: String(formData.get("formTitle") ?? "").trim(),
    formIntro: String(formData.get("formIntro") ?? "").trim(),
    // one per line: "Label | text" / "Label | textarea" /
    // "Label | checkboxes | option1, option2, option3"
    extraFields: String(formData.get("extraFields") ?? "")
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => {
        const [label = "", kind = "text", opts = ""] = line.split("|").map((x) => x.trim());
        const k = kind === "textarea" || kind === "checkboxes" ? kind : "text";
        return {
          label,
          kind: k,
          options: k === "checkboxes" ? opts.split(",").map((o) => o.trim()).filter(Boolean) : [],
        };
      })
      .filter((f) => f.label),
  });
  revalidatePath("/list-my-property");
  return { ok: true, message: "List-your-property page saved — live now." };
}

export async function saveFamilyAction(
  _prev: ContentFormState,
  formData: FormData,
): Promise<ContentFormState> {
  await requireAdmin();
  const g = (k: string) => String(formData.get(k) ?? "").trim();
  await setSetting("page_family", {
    eyebrow: g("eyebrow"), title: g("title"), intro: g("intro"),
    mediaUrl: g("mediaUrl"),
    tag: g("tag"), storyTitle: g("storyTitle"),
    p1: g("p1"), p2: g("p2"), p3: g("p3"), sign: g("sign"),
    stats: [0, 1, 2].map((i) => statPair(formData, i)),
    valuesTitle: g("valuesTitle"), valuesSub: g("valuesSub"),
    values: [0, 1, 2].map((i) => ({
      icon: g(`val_icon_${i}`), title: g(`val_title_${i}`), text: g(`val_text_${i}`),
    })),
    ctaTitle: g("ctaTitle"), ctaText: g("ctaText"),
  });
  revalidatePath("/our-family");
  return { ok: true, message: "Our Family page saved — live now." };
}

/* ---------------- investors page ---------------- */

const iconRows = (v: FormDataEntryValue | null) =>
  lines(v)
    .map((l) => l.split("|").map((x) => x.trim()))
    .filter((p) => p.length >= 3 && p[1])
    .map(([icon, title, text]) => ({ icon, title, text }));

export async function saveInvestorsAction(
  _prev: ContentFormState,
  formData: FormData,
): Promise<ContentFormState> {
  await requireAdmin();
  const s = (k: string) => String(formData.get(k) ?? "").trim();
  const list = (k: string) => lines(formData.get(k));
  const pair = (k: string) =>
    lines(formData.get(k))
      .filter((l) => l.includes("::"))
      .map((l) => {
        const i = l.indexOf("::");
        return [l.slice(0, i).trim(), l.slice(i + 2).trim()] as const;
      });

  await setSetting("page_investors", {
    heroTitle: s("heroTitle"), heroHighlight: s("heroHighlight"), heroIntro: s("heroIntro"),
    metrics: pair("metrics").map(([b, sub]) => ({ b, s: sub })),
    visionTitle: s("visionTitle"), visionText: s("visionText"),
    oppTitle: s("oppTitle"), oppText: s("oppText"),
    painTitle: s("painTitle"), painPoints: list("painPoints"),
    advTitle: s("advTitle"), advantages: iconRows(formData.get("advantages")),
    marketTitle: s("marketTitle"), marketText: s("marketText"), trends: list("trends"),
    revTitle: s("revTitle"), revText: s("revText"), revenue: iconRows(formData.get("revenue")),
    growthTitle: s("growthTitle"),
    phases: iconRows(formData.get("phases")).map((r) => ({ p: r.icon, title: r.title, text: r.text })),
    growthNote: s("growthNote"),
    whyTitle: s("whyTitle"), whyText: s("whyText"), whyItems: list("whyItems"),
    valuesTitle: s("valuesTitle"), valuesText: s("valuesText"), values: iconRows(formData.get("values")),
    roadTitle: s("roadTitle"),
    roadmap: pair("roadmap").map(([yr, items]) => ({ yr, items: items.split(";").map((x) => x.trim()).filter(Boolean) })),
    faq: pair("faq").map(([q, a]) => ({ q, a })),
    finalTitle: s("finalTitle"), finalText: s("finalText"), disclaimer: s("disclaimer"),
  });
  revalidatePath("/investors");
  revalidatePath("/admin/content");
  return { ok: true, message: "Investors page updated — live now." };
}

/* ---------------- family media upload (signed, browser → storage) ---------------- */

/** Signed upload slot so images AND large videos go straight from the
    admin's browser to storage — server actions can't carry video bodies. */
export async function signFamilyUploadAction(
  filename: string,
  contentType: string,
): Promise<{ ok: true; path: string; token: string; publicUrl: string } | { ok: false; message: string }> {
  await requireAdmin();
  const sb = getSupabaseAdmin();
  if (!sb) return { ok: false, message: "Uploads need the Supabase service key (SUPABASE_SERVICE_ROLE_KEY)." };
  if (!/^(image\/(jpeg|png|webp|avif)|video\/(mp4|webm|quicktime))$/.test(contentType)) {
    return { ok: false, message: "Use a JPEG/PNG/WebP image or an MP4/WebM video." };
  }
  const ext = (filename.match(/\.(\w{2,5})$/)?.[1] ?? contentType.split("/")[1]).toLowerCase();
  const path = `site/family-${Date.now()}.${ext}`;
  const { data, error } = await sb.storage.from("listing-photos").createSignedUploadUrl(path);
  if (error || !data) return { ok: false, message: error?.message ?? "Couldn't prepare the upload." };
  const { data: pub } = sb.storage.from("listing-photos").getPublicUrl(path);
  return { ok: true, path, token: data.token, publicUrl: pub.publicUrl };
}
