import { getDb } from "@/lib/db";
import { ReviewsClient, type ReviewRow } from "./reviews-client";

export const dynamic = "force-dynamic";

export default async function AdminReviews() {
  const db = getDb();
  const [reviews, listings] = await Promise.all([
    db.query(
      `select r.id, r.guest_name, r.rating, r.body, r.source, r.status,
              r.booking_id is not null as from_booking,
              to_char(coalesce(r.stayed_at, r.created_at::date), 'FMMonth YYYY') as when_label,
              l.title
         from listing_reviews r join listings l on l.id = r.listing_id
        order by (r.status = 'pending') desc, r.created_at desc limit 200`),
    db.query("select id, title from listings where status <> 'archived' order by title"),
  ]);
  const rows: ReviewRow[] = reviews.rows.map((r) => ({
    id: r.id, listingTitle: r.title, guestName: r.guest_name,
    rating: Number(r.rating), body: r.body, source: r.source,
    status: r.status, when: r.when_label, fromBooking: r.from_booking,
  }));
  return (
    <div>
      <h1 className="mb-2 text-2xl font-extrabold">Guest reviews</h1>
      <p className="mb-5 max-w-2xl text-sm text-grey">
        Guests get a review link by email the day after check-out. New
        submissions arrive here as <b>pending</b> — publish them to show them
        on the home&rsquo;s page. You can also add reviews by hand (e.g. from
        Airbnb). When a home has published reviews, they replace the sample
        ones on its page.
      </p>
      <ReviewsClient reviews={rows} listings={listings.rows as { id: string; title: string }[]} />
    </div>
  );
}
