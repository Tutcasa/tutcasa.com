"use server";

import { createTourBooking, type TourReserveResult } from "@/modules/tours";

export async function reserveTourAction(input: {
  tourSlug: string;
  tourDate: string;
  groupSize: number;
  guestName: string;
  guestEmail: string;
  guestPhone?: string;
  notes?: string;
}): Promise<TourReserveResult> {
  return createTourBooking(input);
}
