"use server";

import { revalidatePath } from "next/cache";
import { setTourBookingStatus, type TourBooking } from "@/modules/tours";
import { requireAdmin, isAdmin } from "@/lib/admin-auth";

export async function setStatusAction(id: string, status: TourBooking["status"]) {
  await requireAdmin();
  if (status === "cancelled") {
    const { getDb } = await import("@/lib/db");
    const row = await getDb().query<{ coupon_code: string | null; status: string }>(
      "select coupon_code, status from tour_bookings where id=$1", [id]);
    if (row.rows[0]?.coupon_code && row.rows[0].status !== "cancelled") {
      const { unredeemCoupon } = await import("@/modules/coupons");
      await unredeemCoupon(row.rows[0].coupon_code).catch(() => {});
    }
  }
  await setTourBookingStatus(id, status);
  revalidatePath("/admin/tour-bookings");
}

/**
 * Permanently delete a tour booking (its invoice goes with it). The emails
 * log is removed; gift-card ledger lines are kept for accounting but unlinked.
 */
export async function deleteTourBookingAction(id: string): Promise<void> {
  await requireAdmin();
  const { getDb } = await import("@/lib/db");
  const cur = await getDb().query<{ coupon_code: string | null; status: string }>(
    "select coupon_code, status from tour_bookings where id=$1", [id]);
  if (cur.rows[0]?.coupon_code && cur.rows[0].status !== "cancelled") {
    const { unredeemCoupon } = await import("@/modules/coupons");
    await unredeemCoupon(cur.rows[0].coupon_code).catch(() => {});
  }
  await getDb().query(
    `with n as (delete from notifications_log where tour_booking_id = $1),
          g as (update gift_card_ledger set tour_booking_id = null where tour_booking_id = $1)
     delete from tour_bookings where id = $1`,
    [id],
  );
  revalidatePath("/admin/tour-bookings");
  revalidatePath("/admin/invoices");
  revalidatePath("/admin");
}

export interface TourAnswerState { ok: boolean; message: string }

/** Answer Amanah's question on a tour booking — clears it here and shows
    the reply in Amanah's queue instantly. */
export async function answerTourQuestionAction(
  _prev: TourAnswerState,
  formData: FormData,
): Promise<TourAnswerState> {
  if (!(await isAdmin())) {
    return { ok: false, message: "Your admin login has expired — refresh the page and log in again." };
  }
  const id = String(formData.get("id") ?? "");
  const answer = String(formData.get("answer") ?? "").trim();
  if (!id || !answer) return { ok: false, message: "Write the answer first." };

  const { getTourBooking } = await import("@/modules/tours");
  const b = await getTourBooking(id);
  if (!b) return { ok: false, message: "Booking not found." };

  const { getDb } = await import("@/lib/db");
  await getDb().query("update tour_bookings set amanah_note=null where id=$1", [id]);

  const key = process.env.AMANAH_PARTNER_KEY;
  if (key) {
    try {
      await fetch(`${process.env.AMANAH_SITE_URL ?? "https://amanahvacations.com"}/api/partner/tutcasa-tours`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-partner-key": key },
        body: JSON.stringify({
          bookingId: b.id,
          ref: b.id.slice(0, 8).toUpperCase(),
          tourTitle: b.tourTitle,
          tourDate: b.tourDate,
          groupSize: b.groupSize,
          totalLabel: `$${Math.round(b.totalCents / 100).toLocaleString("en-US")} ${b.currency}`,
          guestName: b.guestName,
          guestEmail: b.guestEmail,
          guestPhone: b.guestPhone,
          notes: b.notes,
          lastAnswer: answer,
          status: "answered",
        }),
        signal: AbortSignal.timeout(15_000),
      });
    } catch {
      return { ok: false, message: "Saved here, but Amanah couldn't be reached — try Send again." };
    }
  }
  revalidatePath("/admin/tour-bookings");
  return { ok: true, message: "Answer sent — it shows in Amanah's queue now." };
}
