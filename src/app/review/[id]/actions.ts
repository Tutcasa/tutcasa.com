"use server";

import { headers } from "next/headers";
import { getDb } from "@/lib/db";
import { overLimit } from "@/lib/rate-limit";

export interface ReviewFormState { ok: boolean; message: string }

/** A guest submits their post-stay review — it waits for admin approval. */
export async function submitReviewAction(
  _prev: ReviewFormState,
  formData: FormData,
): Promise<ReviewFormState> {
  const ip = (await headers()).get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  if (overLimit(`review:${ip}`, 6, 10 * 60 * 1000)) {
    return { ok: false, message: "Too many attempts — try again in a few minutes." };
  }
  const bookingId = String(formData.get("bookingId") ?? "");
  const name = String(formData.get("name") ?? "").trim().slice(0, 60);
  const rating = Math.round(Number(formData.get("rating")));
  const body = String(formData.get("body") ?? "").trim().slice(0, 2000);
  if (!/^[0-9a-f-]{36}$/i.test(bookingId)) return { ok: false, message: "This review link isn't valid." };
  if (!name || !body) return { ok: false, message: "Add your name and a few words about your stay." };
  if (!(rating >= 1 && rating <= 5)) return { ok: false, message: "Pick a star rating." };

  const db = getDb();
  const bk = await db.query(
    `select id, listing_id, status, upper(stay) <= current_date as ended
       from bookings where id = $1`, [bookingId]);
  const b = bk.rows[0];
  if (!b || b.status === "cancelled") return { ok: false, message: "This review link isn't valid." };
  if (!b.ended) return { ok: false, message: "You can review once your stay has ended — see you soon!" };

  try {
    await db.query(
      `insert into listing_reviews (listing_id, booking_id, guest_name, rating, body, stayed_at)
       values ($1, $2, $3, $4, $5, current_date)`,
      [b.listing_id, bookingId, name, rating, body],
    );
  } catch (e) {
    if ((e as { code?: string }).code === "23505") {
      return { ok: false, message: "You've already reviewed this stay — thank you!" };
    }
    throw e;
  }
  return { ok: true, message: "Thank you! Your review was sent to our team and will appear once approved. 💕" };
}
