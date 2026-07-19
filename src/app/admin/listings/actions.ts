"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getDb } from "@/lib/db";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

export interface ListingFormState { ok: boolean; message: string }

function revalidatePublic() {
  revalidatePath("/admin/listings");
  revalidatePath("/stays");
  revalidatePath("/");
}

/** Create a new home as a draft and jump straight to its edit form. */
export async function addListingAction(formData: FormData): Promise<void> {
  const title = String(formData.get("title") ?? "").trim();
  if (!title) return;
  const slug =
    title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") +
    "-" + Math.random().toString(36).slice(2, 6);
  const db = getDb();
  const res = await db.query<{ id: string }>(
    `insert into listings (slug, title, city, country, property_type,
       max_guests, bedrooms, bathrooms, min_stay, status)
     values ($1,$2,'Playa del Carmen','MX','condo',2,1,1,2,'draft')
     returning id`,
    [slug, title],
  );
  await db.query(
    `insert into listing_rates (listing_id, nightly_cents, cleaning_cents, tax_pct, currency)
     values ($1, 10000, 0, 16, 'USD')`,
    [res.rows[0].id],
  );
  revalidatePublic();
  redirect(`/admin/listings?edit=${res.rows[0].id}`);
}

const MAX_PHOTO_BYTES = 8 * 1024 * 1024;

export async function uploadPhotoAction(formData: FormData): Promise<ListingFormState> {
  const sb = getSupabaseAdmin();
  if (!sb) {
    return { ok: false, message: "Photo uploads need the Supabase service key (SUPABASE_SERVICE_ROLE_KEY) — paste it in .env.local to activate." };
  }
  const listingId = String(formData.get("listingId") ?? "");
  const file = formData.get("photo") as File | null;
  if (!listingId || !file || file.size === 0) return { ok: false, message: "Choose an image first." };
  if (file.size > MAX_PHOTO_BYTES) return { ok: false, message: "Image too large (max 8 MB)." };
  if (!/^image\/(jpeg|png|webp|avif)$/.test(file.type)) {
    return { ok: false, message: "Use a JPEG, PNG, WebP or AVIF image." };
  }

  const ext = file.type.split("/")[1].replace("jpeg", "jpg");
  const path = `${listingId}/${Date.now()}.${ext}`;
  const { error } = await sb.storage.from("listing-photos")
    .upload(path, Buffer.from(await file.arrayBuffer()), { contentType: file.type });
  if (error) return { ok: false, message: `Upload failed: ${error.message}` };

  const { data } = sb.storage.from("listing-photos").getPublicUrl(path);
  const db = getDb();
  const next = await db.query<{ n: number }>(
    "select coalesce(max(sort),-1)+1 as n from listing_photos where listing_id=$1", [listingId]);
  await db.query(
    "insert into listing_photos (listing_id, url, alt, sort) values ($1,$2,$3,$4)",
    [listingId, data.publicUrl, String(formData.get("alt") ?? ""), next.rows[0].n],
  );
  revalidatePublic();
  return { ok: true, message: "Photo added." };
}

export async function deletePhotoAction(photoId: string): Promise<void> {
  const db = getDb();
  const res = await db.query<{ url: string }>(
    "delete from listing_photos where id=$1 returning url", [photoId]);
  const url = res.rows[0]?.url;
  const sb = getSupabaseAdmin();
  if (url && sb) {
    const path = url.split("/listing-photos/")[1];
    if (path) await sb.storage.from("listing-photos").remove([path]);
  }
  revalidatePublic();
}

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
