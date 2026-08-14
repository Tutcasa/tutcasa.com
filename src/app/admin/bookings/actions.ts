"use server";

import { revalidatePath } from "next/cache";
import { getDb } from "@/lib/db";
import type { BookingStatus } from "@/modules/bookings";

export interface BookingFormState { ok: boolean; message: string }

function revalidate() {
  revalidatePath("/admin/bookings");
  revalidatePath("/admin");
}

/** Allowed manual transitions (money safety: no resurrecting cancelled stays). */
const ALLOWED: Record<BookingStatus, BookingStatus[]> = {
  pending: ["confirmed", "cancelled"],
  confirmed: ["completed", "cancelled"],
  cancelled: [],
  completed: [],
};

export async function setBookingStatusAction(
  id: string,
  to: BookingStatus,
): Promise<void> {
  const db = getDb();
  const cur = await db.query<{ status: BookingStatus }>(
    "select status from bookings where id=$1", [id]);
  const from = cur.rows[0]?.status;
  if (!from || !ALLOWED[from].includes(to)) return;
  // confirming clears the hold — the dates are now committed
  await db.query(
    `update bookings set status=$2,
            hold_expires_at = case when $2='confirmed' then null else hold_expires_at end
      where id=$1`,
    [id, to],
  );
  revalidate();
}

/** Postgres exclusion-constraint violation (booking overlap). */
const isOverlap = (e: unknown) =>
  typeof e === "object" && e !== null && (e as { code?: string }).code === "23P01";

/**
 * Edit a booking — guest details, dates, party size, total, or even the home
 * itself (feature-spec parity with the old WpRentals admin).
 */
export async function updateBookingAction(
  _prev: BookingFormState,
  formData: FormData,
): Promise<BookingFormState> {
  const id = String(formData.get("id") ?? "");
  const listingId = String(formData.get("listingId") ?? "");
  const guestName = String(formData.get("guestName") ?? "").trim();
  const guestEmail = String(formData.get("guestEmail") ?? "").trim();
  const checkIn = String(formData.get("checkIn") ?? "");
  const checkOut = String(formData.get("checkOut") ?? "");
  const guests = Number(formData.get("guests") ?? 0);
  const totalUSD = Number(formData.get("totalUSD") ?? 0);

  if (!id || !listingId || !guestName || !guestEmail) {
    return { ok: false, message: "Guest name and email are required." };
  }
  if (!checkIn || !checkOut || checkOut <= checkIn) {
    return { ok: false, message: "Check-out must be after check-in." };
  }
  if (guests < 1) return { ok: false, message: "At least one guest." };
  if (totalUSD < 0) return { ok: false, message: "Total can't be negative." };

  try {
    await getDb().query(
      `update bookings set
         listing_id=$2, guest_name=$3, guest_email=$4, guest_phone=$5,
         stay=daterange($6::date, $7::date, '[)'), guests=$8, total_cents=$9
       where id=$1`,
      [id, listingId, guestName, guestEmail,
       String(formData.get("guestPhone") ?? "").trim() || null,
       checkIn, checkOut, guests, Math.round(totalUSD * 100)],
    );
  } catch (e) {
    if (isOverlap(e)) {
      return { ok: false, message: "Those dates collide with another booking on that home." };
    }
    throw e;
  }
  revalidate();
  return { ok: true, message: "Booking updated." };
}
