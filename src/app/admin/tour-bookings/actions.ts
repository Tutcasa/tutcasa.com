"use server";

import { revalidatePath } from "next/cache";
import { setTourBookingStatus, type TourBooking } from "@/modules/tours";
import { requireAdmin } from "@/lib/admin-auth";

export async function setStatusAction(id: string, status: TourBooking["status"]) {
  await requireAdmin();
  await setTourBookingStatus(id, status);
  revalidatePath("/admin/tour-bookings");
}
