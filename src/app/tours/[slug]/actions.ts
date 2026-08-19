"use server";

import { headers } from "next/headers";
import { overLimit } from "@/lib/rate-limit";

import { createTourBooking, type TourReserveResult } from "@/modules/tours";

export async function reserveTourAction(input: {
  tourSlug: string;
  tourDate: string;
  groupSize: number;
  guestName: string;
  guestEmail: string;
  guestPhone?: string;
  addons?: string[];
  notes?: string;
}): Promise<TourReserveResult> {
  const ip = (await headers()).get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  if (overLimit(`reserve:${ip}`, 8, 10 * 60 * 1000)) return { ok: false, error: "INVALID_DATE" };
  return createTourBooking(input);
}
