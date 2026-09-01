"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/admin-auth";
import { createReferral } from "@/modules/growth";

export interface AffiliateFormState { ok: boolean; message: string }

/** Create (or resend) an affiliate/invite link for any name + email. */
export async function createAffiliateAction(
  _prev: AffiliateFormState,
  formData: FormData,
): Promise<AffiliateFormState> {
  await requireAdmin();
  const name = String(formData.get("name") ?? "");
  const email = String(formData.get("email") ?? "");
  const res = await createReferral(name, email);
  revalidatePath("/admin/affiliates");
  return { ok: res.ok, message: res.message };
}

/* ---------------- marketing partners (paid commission links) ---------------- */

export async function createPartnerAction(
  _prev: AffiliateFormState,
  formData: FormData,
): Promise<AffiliateFormState> {
  await requireAdmin();
  const name = String(formData.get("name") ?? "").trim();
  const code = String(formData.get("code") ?? "").trim().toUpperCase().replace(/\s+/g, "-");
  const pct = Number(formData.get("pct") ?? 0);
  if (!name || !/^[A-Z0-9_-]{2,32}$/.test(code)) {
    return { ok: false, message: "Name and a short code (letters/numbers) are required." };
  }
  if (!Number.isFinite(pct) || pct < 0 || pct > 100) {
    return { ok: false, message: "Commission must be between 0 and 100%." };
  }
  const { getDb } = await import("@/lib/db");
  const res = await getDb().query(
    `insert into marketing_partners (code, name, commission_pct)
     values ($1,$2,$3)
     on conflict (code) do update set name=$2, commission_pct=$3, active=true
     returning code`,
    [code, name, pct],
  );
  revalidatePath("/admin/affiliates");
  return { ok: true, message: `Partner link ready: tutcasa.com/?via=${res.rows[0].code}` };
}

export async function togglePartnerAction(id: string): Promise<void> {
  await requireAdmin();
  const { getDb } = await import("@/lib/db");
  await getDb().query("update marketing_partners set active = not active where id=$1", [id]);
  revalidatePath("/admin/affiliates");
}

export async function deletePartnerAction(id: string): Promise<void> {
  await requireAdmin();
  const { getDb } = await import("@/lib/db");
  await getDb().query("delete from marketing_partners where id=$1", [id]);
  revalidatePath("/admin/affiliates");
}
