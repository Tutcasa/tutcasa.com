"use server";

import { revalidatePath } from "next/cache";
import { getDb } from "@/lib/db";

export interface CouponFormState { ok: boolean; message: string }

export async function addCouponAction(
  _prev: CouponFormState,
  formData: FormData,
): Promise<CouponFormState> {
  const code = String(formData.get("code") ?? "").trim().toUpperCase().replace(/\s+/g, "");
  const kind = String(formData.get("kind") ?? "percent");
  const value = Number(formData.get("value") ?? 0);
  if (!code) return { ok: false, message: "A coupon code is required." };
  if (value <= 0) return { ok: false, message: "The discount value must be above 0." };
  if (kind === "percent" && value > 100) return { ok: false, message: "Percent discounts max out at 100." };

  const maxUses = formData.get("maxUses") ? Number(formData.get("maxUses")) : null;
  const expires = String(formData.get("expiresAt") ?? "") || null;
  const minNights = Number(formData.get("minNights") ?? 0) || 0;

  try {
    await getDb().query(
      `insert into coupons (code, kind, percent_off, amount_cents, min_nights, max_uses, expires_at, note)
       values ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [code, kind,
       kind === "percent" ? value : null,
       kind === "fixed" ? Math.round(value * 100) : null,
       minNights, maxUses, expires,
       String(formData.get("note") ?? "").trim() || null],
    );
  } catch (e) {
    if ((e as { code?: string }).code === "23505") {
      return { ok: false, message: "That code already exists." };
    }
    throw e;
  }
  revalidatePath("/admin/coupons");
  return { ok: true, message: `Coupon ${code} created.` };
}

export async function toggleCouponAction(id: string): Promise<void> {
  await getDb().query("update coupons set active = not active where id=$1", [id]);
  revalidatePath("/admin/coupons");
}

export async function deleteCouponAction(id: string): Promise<void> {
  await getDb().query("delete from coupons where id=$1", [id]);
  revalidatePath("/admin/coupons");
}
