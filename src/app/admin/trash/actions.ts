"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/admin-auth";

/** Restore a trashed record, then re-take what the delete gave back
    (coupon use, gift-card value) so the books match the original again. */
export async function restoreAction(trashId: string): Promise<{ ok: boolean; message: string }> {
  await requireAdmin();
  const { restoreFromTrash } = await import("@/modules/trash");
  const res = await restoreFromTrash(trashId);
  if (!res.ok) return res;
  const { kind, row } = res;
  let note = "";
  if (kind !== "gift_card" && row.coupon_code && row.status !== "cancelled") {
    const { tryRedeemCoupon } = await import("@/modules/coupons");
    await tryRedeemCoupon(String(row.coupon_code)).catch(() => false);
  }
  if (kind === "stay" && row.gift_card_id && Number(row.gift_card_cents ?? 0) > 0 && row.status !== "cancelled") {
    const { redeemGiftCard } = await import("@/modules/giftcards");
    const ok = await redeemGiftCard(String(row.gift_card_id), Number(row.gift_card_cents), "booking restored from trash").catch(() => false);
    if (!ok) note = " Heads-up: its gift card no longer had enough balance to re-apply — check the card.";
  }
  for (const p of ["/admin/trash", "/admin/bookings", "/admin/tour-bookings", "/admin/invoices",
                   "/admin/orders", "/admin/gift-cards", "/admin/calendar", "/admin"]) revalidatePath(p);
  return { ok: true, message: `Restored.${note}` };
}
