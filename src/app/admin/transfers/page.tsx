import { getDb } from "@/lib/db";
import { listTransfers } from "@/modules/transfers";
import { TransfersClient, type BookingOption } from "./transfers-client";

export const dynamic = "force-dynamic";

async function bookingOptions(): Promise<BookingOption[]> {
  const res = await getDb().query(
    `select b.id, b.invoice_no, b.guest_name,
            to_char(lower(b.stay),'YYYY-MM-DD') as check_in, l.title
       from bookings b join listings l on l.id = b.listing_id
      where b.status in ('pending','confirmed')
        and upper(b.stay) >= current_date
      order by lower(b.stay)`,
  );
  return res.rows.map((r) => ({
    id: r.id,
    label: `#${r.invoice_no} · ${r.title} · ${r.check_in} · ${r.guest_name}`,
    guestName: r.guest_name,
    checkIn: r.check_in,
  }));
}

export default async function AdminTransfers() {
  const [transfers, bookings] = await Promise.all([listTransfers(), bookingOptions()]);
  return (
    <div>
      <h1 className="mb-2 text-2xl font-extrabold">Airport transfers</h1>
      <p className="mb-5 max-w-2xl text-sm text-grey">
        Every booking includes a free <b>arrival</b> transfer, fulfilled by
        Amanah Vacations. Fill the details here (or let the guest do it from
        their booking page) — it goes straight to Amanah&rsquo;s queue.
        Statuses come back from Amanah: <b>Requested → Confirmed / Needs
        details → Done</b>.
      </p>
      <TransfersClient transfers={transfers} bookings={bookings} />
    </div>
  );
}
