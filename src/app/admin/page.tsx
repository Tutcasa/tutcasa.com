import { listBookings } from "@/modules/bookings";
import { listTourBookings } from "@/modules/tours";

export const dynamic = "force-dynamic";

export default async function AdminOverview() {
  const [stays, tours] = await Promise.all([listBookings(), listTourBookings()]);
  const active = stays.filter((b) => b.status === "pending" || b.status === "confirmed");
  const pendingTours = tours.filter((t) => t.status === "pending");

  const cards = [
    ["Stay bookings (active)", active.length, "/admin/bookings"],
    ["Tour bookings (awaiting confirm)", pendingTours.length, "/admin/tour-bookings"],
    ["Stay bookings (all)", stays.length, "/admin/bookings"],
    ["Tour bookings (all)", tours.length, "/admin/tour-bookings"],
  ] as const;

  return (
    <div>
      <h1 className="mb-6 text-2xl font-extrabold">Overview</h1>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map(([label, n, href]) => (
          <a key={label} href={href} className="rounded-card bg-paper p-5 shadow-soft hover:shadow-lift">
            <div className="font-display text-3xl font-extrabold text-rosa">{n}</div>
            <div className="mt-1 text-sm text-grey">{label}</div>
          </a>
        ))}
      </div>
    </div>
  );
}
