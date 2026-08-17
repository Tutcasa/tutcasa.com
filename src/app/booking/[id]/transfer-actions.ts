"use server";

import { revalidatePath } from "next/cache";
import { upsertTransfer } from "@/modules/transfers";

export interface GuestTransferState { ok: boolean; message: string }

/** The guest fills their own transfer from the booking page (the booking
    id in the URL is unguessable — it is the auth). */
export async function guestTransferAction(
  _prev: GuestTransferState,
  formData: FormData,
): Promise<GuestTransferState> {
  const bookingId = String(formData.get("bookingId") ?? "");
  if (!/^[0-9a-f-]{36}$/i.test(bookingId)) return { ok: false, message: "Invalid booking." };
  const res = await upsertTransfer({
    bookingId,
    fullName: String(formData.get("fullName") ?? ""),
    travelDate: String(formData.get("travelDate") ?? ""),
    flightNumber: String(formData.get("flightNumber") ?? ""),
    passengers: Math.max(1, Number(formData.get("passengers")) || 1),
    babySeat: formData.get("babySeat") === "on",
    note: String(formData.get("note") ?? ""),
    filledBy: "guest",
  });
  revalidatePath(`/booking/${bookingId}`);
  return {
    ok: res.ok,
    message: res.ok ? "Transfer requested! Amanah will confirm it shortly. 🚐" : res.message,
  };
}
