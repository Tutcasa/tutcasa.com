"use server";

import { revalidatePath } from "next/cache";
import { setTourBookingStatus, type TourBooking } from "@/modules/tours";

export async function setStatusAction(id: string, status: TourBooking["status"]) {
  await setTourBookingStatus(id, status);
  revalidatePath("/admin/tour-bookings");
}
