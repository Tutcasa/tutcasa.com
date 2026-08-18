"use server";

import { revalidatePath } from "next/cache";
import { upsertTransfer } from "@/modules/transfers";
import { getDb } from "@/lib/db";

export interface TransferFormState { ok: boolean; message: string }

export async function saveTransferAction(
  _prev: TransferFormState,
  formData: FormData,
): Promise<TransferFormState> {
  const res = await upsertTransfer({
    bookingId: String(formData.get("bookingId") ?? ""),
    fullName: String(formData.get("fullName") ?? ""),
    travelDate: String(formData.get("travelDate") ?? ""),
    flightNumber: String(formData.get("flightNumber") ?? ""),
    passengers: Math.max(1, Number(formData.get("passengers")) || 1),
    babySeat: formData.get("babySeat") === "on",
    note: String(formData.get("note") ?? ""),
    filledBy: "admin",
  });
  revalidatePath("/admin/transfers");
  return { ok: res.ok, message: res.message };
}

export async function cancelTransferAction(transferId: string): Promise<void> {
  await getDb().query(
    "update transfers set status='cancelled' where id=$1", [transferId]);
  // alert Amanah so the job is closed on their side too
  const { transferForBooking, pushToAmanah } = await import("@/modules/transfers");
  const row = await getDb().query("select booking_id from transfers where id=$1", [transferId]);
  if (row.rows[0]) {
    const t = await transferForBooking(row.rows[0].booking_id);
    if (t) await pushToAmanah(t).catch(() => {});
  }
  revalidatePath("/admin/transfers");
}
