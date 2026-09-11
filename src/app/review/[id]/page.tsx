import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getDb } from "@/lib/db";
import { BackBar } from "@/components/site/BackBar";
import { ReviewClient } from "./review-client";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: { absolute: "TutCasa — Review your stay" },
  robots: { index: false },
};

export default async function ReviewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const res = await getDb().query(
    `select b.guest_name, b.status, upper(b.stay) <= current_date as ended,
            l.title, l.city,
            exists(select 1 from listing_reviews r where r.booking_id = b.id) as reviewed
       from bookings b join listings l on l.id = b.listing_id
      where b.id = $1`, [id]);
  const b = res.rows[0];
  if (!b || b.status === "cancelled") notFound();

  return (
    <div style={{ background: "var(--crema, #FFF6EC)", minHeight: "70vh" }}>
      <BackBar />
      <div style={{ maxWidth: 560, margin: "0 auto", padding: "34px 18px 70px" }}>
        <div style={{ background: "var(--paper, #FFFDF9)", borderRadius: 22, padding: "28px 26px", boxShadow: "0 10px 28px rgba(58,44,40,.10)" }}>
          <h1 style={{ fontFamily: "'Baloo 2'", fontSize: 26, margin: "0 0 4px" }}>How was your stay? &#127796;</h1>
          <p style={{ color: "var(--grey)", margin: "0 0 18px", fontSize: 14.5 }}>
            {b.title} &middot; {b.city}
          </p>
          {b.reviewed ? (
            <p style={{ color: "var(--cactus)", fontWeight: 700 }}>
              You&rsquo;ve already reviewed this stay — thank you! &#128149;
            </p>
          ) : !b.ended ? (
            <p style={{ color: "var(--grey)" }}>
              Your stay hasn&rsquo;t ended yet — come back after check-out to leave your review!
            </p>
          ) : (
            <ReviewClient
              bookingId={id}
              guestName={(b.guest_name ?? "").split(" ")[0]}
              listing={b.title}
            />
          )}
        </div>
      </div>
    </div>
  );
}
