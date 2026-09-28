"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/admin-auth";

export interface GiftFormState { ok: boolean; message: string }

export async function createGiftCardAction(
  _prev: GiftFormState,
  formData: FormData,
): Promise<GiftFormState> {
  await requireAdmin();
  const amountUSD = Number(formData.get("amountUSD"));
  if (!(amountUSD >= 1 && amountUSD <= 100000)) {
    return { ok: false, message: "Enter an amount between $1 and $100,000." };
  }
  const { createGiftCard } = await import("@/modules/giftcards");
  const { code } = await createGiftCard({
    amountUSD,
    recipientEmail: String(formData.get("recipientEmail") ?? "").trim() || undefined,
    message: String(formData.get("message") ?? "").trim() || undefined,
  });
  revalidatePath("/admin/gift-cards");
  // the code is shown ONCE — only its hash is stored
  return { ok: true, message: `Card created — the code is ${code} — copy it NOW, it can never be shown again.` };
}

export async function setGiftCardStatusAction(id: string, status: "active" | "void"): Promise<void> {
  await requireAdmin();
  const { setGiftCardStatus } = await import("@/modules/giftcards");
  await setGiftCardStatus(id, status);
  revalidatePath("/admin/gift-cards");
}

/** Delete a gift card → Admin → Trash (30 days). A card already used on a
    stay booking can't go (the booking's invoice points at it) — disable it. */
export async function deleteGiftCardAction(id: string): Promise<{ ok: boolean; message: string }> {
  await requireAdmin();
  const { getDb } = await import("@/lib/db");
  const used = await getDb().query<{ invoice_no: string | null }>(
    "select invoice_no from bookings where gift_card_id = $1 limit 1", [id]);
  if (used.rows[0]) {
    return { ok: false, message: `This card was used on booking invoice #${used.rows[0].invoice_no ?? "?"}, so it can't be deleted — use Disable instead.` };
  }
  const { moveToTrash } = await import("@/modules/trash");
  await moveToTrash("gift_card", id);
  revalidatePath("/admin/gift-cards");
  revalidatePath("/admin/trash");
  return { ok: true, message: "" };
}
