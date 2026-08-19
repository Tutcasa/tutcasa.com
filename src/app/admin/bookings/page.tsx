import { listBookings } from "@/modules/bookings";
import { getDb } from "@/lib/db";
import { BookingRow, type ListingOption } from "./booking-row";
import { NewBookingForm } from "./new-booking-form";
import { AdminSearch, rowMatches } from "../search-box";

export const dynamic = "force-dynamic";

const FILTERS = ["all", "pending", "confirmed", "completed", "cancelled"] as const;
type Filter = (typeof FILTERS)[number];

async function listingOptions(): Promise<ListingOption[]> {
  const res = await getDb().query(
    "select id, title from listings where status <> 'archived' order by title");
  return res.rows;
}

export default async function AdminBookings({
  searchParams,
}: { searchParams: Promise<{ status?: string; q?: string }> }) {
  const { status, q = "" } = await searchParams;
  const filter: Filter = FILTERS.includes(status as Filter) ? (status as Filter) : "all";
  const [bookings, listings] = await Promise.all([listBookings(), listingOptions()]);
  const shown = (filter === "all" ? bookings : bookings.filter((b) => b.status === filter))
    .filter((b) => rowMatches(q, b.guestName, b.guestEmail, b.listingTitle, b.invoiceNo, b.partnerRef));

  return (
    <div>
      <h1 className="mb-4 text-2xl font-extrabold">Stay bookings</h1>

      <NewBookingForm listings={listings} />

      <AdminSearch placeholder="Search by guest, home or invoice #…" q={q} extra={{ status }} />

      <div className="mb-4 flex flex-wrap gap-1.5">
        {FILTERS.map((f) => {
          const n = f === "all" ? bookings.length : bookings.filter((b) => b.status === f).length;
          return (
            <a key={f} href={f === "all" ? "/admin/bookings" : `/admin/bookings?status=${f}`}
              className={`rounded-pill border-[1.5px] px-4 py-1.5 text-sm font-bold capitalize ${
                filter === f
                  ? "border-ink bg-ink text-white"
                  : "border-line bg-paper hover:border-rosa hover:text-rosa"
              }`}>
              {f} <span className="opacity-60">({n})</span>
            </a>
          );
        })}
      </div>

      <div className="overflow-x-auto rounded-card bg-paper shadow-soft">
        <table className="w-full min-w-[860px] text-sm">
          <thead className="border-b border-line text-left text-xs uppercase text-grey">
            <tr>
              <th className="p-3">Ref</th><th className="p-3">Home</th>
              <th className="p-3">Dates</th><th className="p-3">Guest</th>
              <th className="p-3">Total</th><th className="p-3">Status</th>
              <th className="p-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {shown.map((b) => (
              <BookingRow key={b.id} booking={b} listings={listings} />
            ))}
            {shown.length === 0 && (
              <tr><td colSpan={7} className="p-8 text-center text-grey">
                {filter === "all" ? "No bookings yet." : `No ${filter} bookings.`}
              </td></tr>
            )}
          </tbody>
        </table>
      </div>
      <p className="mt-3 text-xs text-grey">
        Confirm turns a pending hold into a firm booking (the dates stay locked
        for the guest). Cancelling frees the dates immediately. Editing dates
        re-checks collisions automatically.
      </p>
    </div>
  );
}
