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
