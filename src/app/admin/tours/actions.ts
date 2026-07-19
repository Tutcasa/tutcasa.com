"use server";

import { revalidatePath } from "next/cache";
import { upsertTour } from "@/modules/tours";

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
