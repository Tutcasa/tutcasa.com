import { listBookings } from "@/modules/bookings";
import { fmtMoney } from "@/modules/pricing";

export const dynamic = "force-dynamic";

const BADGE: Record<string, string> = {
  pending: "bg-sol/15 text-terra",
  confirmed: "bg-cactus/15 text-cactus",
  cancelled: "bg-grey/15 text-grey",
  completed: "bg-cielo/15 text-cielo",
};

export default async function AdminBookings() {
  const bookings = await listBookings();
  return (
    <div>
      <h1 className="mb-6 text-2xl font-extrabold">Stay bookings</h1>
      <div className="overflow-x-auto rounded-card bg-paper shadow-soft">
        <table className="w-full min-w-[720px] text-sm">
          <thead className="border-b border-line text-left text-xs uppercase text-grey">
            <tr>
              <th className="p-3">Ref</th><th className="p-3">Home</th>
              <th className="p-3">Dates</th><th className="p-3">Guest</th>
              <th className="p-3">Total</th><th className="p-3">Status</th>
            </tr>
          </thead>
          <tbody>
            {bookings.map((b) => (
              <tr key={b.id} className="border-b border-line/60">
                <td className="p-3 font-mono text-xs">{b.id.slice(0, 8).toUpperCase()}</td>
                <td className="p-3 font-semibold">{b.listingTitle}<div className="text-xs font-normal text-grey">{b.listingCity}</div></td>
                <td className="p-3 whitespace-nowrap">{b.checkIn} → {b.checkOut}<div className="text-xs text-grey">{b.guests} guests</div></td>
                <td className="p-3">{b.guestName}<div className="text-xs text-grey">{b.guestEmail}</div></td>
                <td className="p-3 font-bold">{fmtMoney(b.totalCents)}</td>
                <td className="p-3">
                  <span className={`rounded-pill px-2.5 py-1 text-xs font-bold ${BADGE[b.status]}`}>{b.status}</span>
                </td>
              </tr>
            ))}
            {bookings.length === 0 && (
              <tr><td colSpan={6} className="p-8 text-center text-grey">No bookings yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
