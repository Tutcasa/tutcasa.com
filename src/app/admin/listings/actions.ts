"use server";

import { revalidatePath } from "next/cache";
import { getDb } from "@/lib/db";

export interface ListingFormState { ok: boolean; message: string }

export async function saveListingAction(
  _prev: ListingFormState,
  formData: FormData,
): Promise<ListingFormState> {
  const id = String(formData.get("id") ?? "");
  const title = String(formData.get("title") ?? "").trim();
  const nightlyUSD = Number(formData.get("nightlyUSD") ?? 0);
  if (!id || !title || nightlyUSD <= 0) {
    return { ok: false, message: "Title and a nightly price above 0 are required." };
  }

  const db = getDb();
  await db.query(
    `update listings set
       title=$2, headline=$3, city=$4, description=$5,
       max_guests=$6, bedrooms=$7, bathrooms=$8, min_stay=$9, status=$10
     where id=$1`,
    [id, title,
     String(formData.get("headline") ?? ""),
     String(formData.get("city") ?? ""),
     String(formData.get("description") ?? ""),
     Number(formData.get("maxGuests") ?? 2),
     Number(formData.get("bedrooms") ?? 1),
     Number(formData.get("bathrooms") ?? 1),
     Number(formData.get("minStay") ?? 2),
     String(formData.get("status") ?? "published")],
  );
  await db.query(
    `update listing_rates set nightly_cents=$2, cleaning_cents=$3, tax_pct=$4
     where listing_id=$1 and season is null`,
    [id, Math.round(nightlyUSD * 100),
     Math.round(Number(formData.get("cleaningUSD") ?? 0) * 100),
     Number(formData.get("taxPct") ?? 0)],
  );

  revalidatePath("/admin/listings");
  revalidatePath("/stays");
  revalidatePath("/");
  return { ok: true, message: "Home updated — live on the site now." };
}
