"use server";

import { revalidatePath } from "next/cache";
import { getSetting, setSetting } from "@/modules/settings";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

export interface ContentFormState { ok: boolean; message: string }

export async function saveContactAction(
  _prev: ContentFormState,
  formData: FormData,
): Promise<ContentFormState> {
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
