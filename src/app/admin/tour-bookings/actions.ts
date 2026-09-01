"use server";

import { revalidatePath } from "next/cache";
import { setTourBookingStatus, type TourBooking } from "@/modules/tours";
import { requireAdmin } from "@/lib/admin-auth";

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
