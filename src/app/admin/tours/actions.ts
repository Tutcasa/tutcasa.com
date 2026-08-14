"use server";

import { revalidatePath } from "next/cache";
import { upsertTour } from "@/modules/tours";
import { getDb } from "@/lib/db";

/**
 * Delete a tour/park. Archived instead when bookings exist.
 */
export async function deleteTourAction(
  tourId: string,
): Promise<{ deleted: boolean; message: string }> {
  const db = getDb();
  const has = await db.query<{ n: string }>(
    "select count(*) as n from tour_bookings where tour_id=$1", [tourId]);
  if (Number(has.rows[0].n) > 0) {
    await db.query("update tours set status='archived' where id=$1", [tourId]);
  } else {
    await db.query("delete from tours where id=$1", [tourId]);
  }
  revalidatePath("/admin/tours");
  revalidatePath("/tours");
  return Number(has.rows[0].n) > 0
    ? { deleted: false, message: "This tour has bookings, so it was archived (hidden) instead of erased." }
    : { deleted: true, message: "Tour deleted." };
}

export interface TourFormState { ok: boolean; message: string }

export async function saveTourAction(
  _prev: TourFormState,
  formData: FormData,
): Promise<TourFormState> {
  const id = (formData.get("id") as string) || undefined;
  const res = await upsertTour({
    id,
    title: String(formData.get("title") ?? ""),
    subtitle: String(formData.get("subtitle") ?? "") || undefined,
    city: String(formData.get("city") ?? "") || undefined,
    durationLabel: String(formData.get("durationLabel") ?? "") || undefined,
    description: String(formData.get("description") ?? "") || undefined,
    priceMXN: Number(formData.get("priceMXN") ?? 0),
    minGroup: Number(formData.get("minGroup") ?? 1),
    maxGroup: Number(formData.get("maxGroup") ?? 12),
    category: formData.get("category") === "park" ? "park" : "tour",
    status: (formData.get("status") as "draft" | "published" | "archived") ?? "draft",
  });
  revalidatePath("/admin/tours");
  revalidatePath("/tours");
  return res.ok
    ? { ok: true, message: id ? "Tour updated." : "Tour created." }
    : { ok: false, message: "Check the fields — title and a price of 0 or more are required." };
}

export async function syncAmanahAction(): Promise<{ ok: boolean; text: string }> {
  const { syncAmanahTours } = await import("@/modules/tours/sync");
  const res = await syncAmanahTours();
  revalidatePath("/admin/tours");
  revalidatePath("/tours");
  revalidatePath("/");
  return { ok: res.ok, text: res.message };
}
