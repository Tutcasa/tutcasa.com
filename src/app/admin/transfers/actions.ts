"use server";

import { revalidatePath } from "next/cache";
import { upsertTransfer } from "@/modules/transfers";
import { getDb } from "@/lib/db";
import { requireAdmin, isAdmin } from "@/lib/admin-auth";

export interface TransferFormState { ok: boolean; message: string }

const LOGGED_OUT =
  "Your admin login has expired — refresh this page, log in again, and resubmit.";
const SAVE_FAILED =
  "The save didn't go through — refresh the page (it may be outdated after an update) and try again.";

export async function saveTransferAction(
  _prev: TransferFormState,
  formData: FormData,
): Promise<TransferFormState> {
  if (!(await isAdmin())) return { ok: false, message: LOGGED_OUT };
  try {
  const res = await upsertTransfer({
    bookingId: String(formData.get("bookingId") ?? ""),
    kind: formData.get("kind") === "dropoff" ? "dropoff" : "pickup",
    fullName: String(formData.get("fullName") ?? ""),
    travelDate: String(formData.get("travelDate") ?? ""),
    flightNumber: String(formData.get("flightNumber") ?? ""),
    passengers: Math.max(1, Number(formData.get("passengers")) || 1),
    babySeat: formData.get("babySeat") === "on",
    note: String(formData.get("note") ?? ""),
    whatsapp: String(formData.get("whatsapp") ?? ""),
    address: String(formData.get("address") ?? ""),
    filledBy: "admin",
  });
  revalidatePath("/admin/transfers");
  return { ok: res.ok, message: res.message };
  } catch (e) {
    console.error("saveTransferAction:", e);
    return { ok: false, message: SAVE_FAILED };
  }
}

/**
 * Answer Amanah's "needs details" question: the reply is appended to the
 * transfer's note and the whole transfer is re-sent to Amanah (status
 * back to Requested, their question cleared).
 */
export async function answerAmanahAction(
  _prev: TransferFormState,
  formData: FormData,
): Promise<TransferFormState> {
  if (!(await isAdmin())) return { ok: false, message: LOGGED_OUT };
  const transferId = String(formData.get("transferId") ?? "");
  const answer = String(formData.get("answer") ?? "").trim();
  if (!transferId || !answer) return { ok: false, message: "Write the answer first." };

  const { transferById } = await import("@/modules/transfers");
  const t = await transferById(transferId);
  if (!t) return { ok: false, message: "Transfer not found." };

  const question = t.amanahNote;
  const note = [t.note, `${question ? `Re "${question}": ` : "Answer: "}${answer}`]
    .filter(Boolean).join(" — ").slice(0, 1000);
  const res = await upsertTransfer({
    bookingId: t.bookingId,
    kind: t.kind,
    fullName: t.fullName,
    travelDate: t.travelDate,
    flightNumber: t.flightNumber,
    passengers: t.passengers,
    babySeat: t.babySeat,
    note,
    filledBy: "admin",
    lastAnswer: answer,
  });
  revalidatePath("/admin/transfers");
  return res.ok
    ? { ok: true, message: "Answer sent to Amanah — the transfer is back in their queue." }
    : { ok: res.ok, message: res.message };
}

export async function cancelTransferAction(transferId: string): Promise<void> {
  await requireAdmin();
  await getDb().query(
    "update transfers set status='cancelled' where id=$1", [transferId]);
  // alert Amanah so the job is closed on their side too — email is the
  // fallback channel, and a failed push clears sent_at so the list shows
  // the cancellation as NOT yet delivered
  const { transferForBooking, pushToAmanah, notifyAmanahEmail } = await import("@/modules/transfers");
  const row = await getDb().query("select booking_id from transfers where id=$1", [transferId]);
  if (row.rows[0]) {
    const t = await transferForBooking(row.rows[0].booking_id);
    if (t) {
      const push = await pushToAmanah(t).catch(() => ({ ok: false }));
      await notifyAmanahEmail(t).catch(() => {});
      if (!push.ok) {
        await getDb().query("update transfers set sent_at=null where id=$1", [transferId]);
      }
    }
  }
  revalidatePath("/admin/transfers");
}

/** Permanently remove a transfer (e.g. after it's done). Local only —
    Amanah's queue has its own delete button. */
export async function deleteTransferAction(transferId: string): Promise<void> {
  await requireAdmin();
  await getDb().query("delete from transfers where id=$1", [transferId]);
  revalidatePath("/admin/transfers");
}
