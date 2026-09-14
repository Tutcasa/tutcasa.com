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
