"use server";

import { revalidatePath } from "next/cache";
import { getDb } from "@/lib/db";
import { requireAdmin } from "@/lib/admin-auth";

export interface ReviewAdminState { ok: boolean; message: string }

function revalidate() {
  revalidatePath("/admin/reviews");
  revalidatePath("/stays");
}

export async function setReviewStatusAction(id: string, status: "pending" | "published"): Promise<void> {
  await requireAdmin();
  await getDb().query(
    "update listing_reviews set status=$2 where id=$1", [id, status]);
  revalidate();
}

export async function deleteReviewAction(id: string): Promise<void> {
  await requireAdmin();
  await getDb().query("delete from listing_reviews where id=$1", [id]);
  revalidate();
}

/** Add a review by hand — e.g. imported from Airbnb/Google. Published immediately. */
export async function addReviewAction(
  _prev: ReviewAdminState,
  formData: FormData,
): Promise<ReviewAdminState> {
  await requireAdmin();
  const listingId = String(formData.get("listingId") ?? "");
  const name = String(formData.get("name") ?? "").trim().slice(0, 60);
  const rating = Math.round(Number(formData.get("rating")));
  const body = String(formData.get("body") ?? "").trim().slice(0, 2000);
  const source = String(formData.get("source") ?? "airbnb");
  const stayedAt = String(formData.get("stayedAt") ?? "").trim() || null;
  if (!/^[0-9a-f-]{36}$/i.test(listingId) || !name || !body || !(rating >= 1 && rating <= 5)) {
    return { ok: false, message: "Pick a home and fill name, rating and text." };
  }
  await getDb().query(
    `insert into listing_reviews (listing_id, guest_name, rating, body, source, status, stayed_at)
     values ($1,$2,$3,$4,$5,'published',$6)`,
    [listingId, name, rating, body, source, stayedAt],
  );
  revalidate();
  return { ok: true, message: "Review added and published." };
}
