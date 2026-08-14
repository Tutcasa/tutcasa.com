import { listBookings } from "@/modules/bookings";
import { listTourBookings } from "@/modules/tours";
import { fmtMoney } from "@/modules/pricing";

export const dynamic = "force-dynamic";

const BADGE: Record<string, string> = {
  pending: "bg-sol/15 text-terra",
  confirmed: "bg-cactus/15 text-cactus",
  paid: "bg-cactus/15 text-cactus",
  partner_confirmed: "bg-cielo/15 text-cielo",
  cancelled: "bg-grey/15 text-grey",
  completed: "bg-cielo/15 text-cielo",
};

export default async function AdminOverview() {
  const [stays, tours] = await Promise.all([listBookings(), listTourBookings()]);
  const active = stays.filter((b) => b.status === "pending" || b.status === "confirmed");
  const pendingTours = tours.filter((t) => t.status === "pending");

  // money actually secured: confirmed/completed stays + paid-and-beyond tours
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const revenueCents =
    stays
      .filter((b) => (b.status === "confirmed" || b.status === "completed") &&
                     new Date(b.createdAt) >= monthStart)
      .reduce((s, b) => s + b.totalCents, 0) +
    tours
      .filter((t) => t.status !== "pending" && t.status !== "cancelled" &&
                     new Date(t.createdAt) >= monthStart)
      .reduce((s, t) => s + t.totalCents, 0);

  const cards = [
    ["Stay bookings (active)", String(active.length), "/admin/bookings"],
    ["Tours awaiting confirm", String(pendingTours.length), "/admin/tour-bookings"],
    ["Booked this month", fmtMoney(revenueCents), "/admin/bookings"],
    ["All bookings", String(stays.length + tours.length), "/admin/bookings"],
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

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <div className="rounded-card bg-paper p-5 shadow-soft">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-extrabold">Latest stay bookings</h2>
            <a href="/admin/bookings" className="text-sm font-bold text-rosa hover:underline">All →</a>
          </div>
          <div className="grid gap-2">
            {stays.slice(0, 6).map((b) => (
              <a key={b.id} href="/admin/bookings"
                className="flex items-center justify-between gap-3 rounded-xl border-[1.5px] border-line px-3 py-2 text-sm hover:border-rosa/50">
                <div>
                  <b>{b.listingTitle}</b>
                  <div className="text-xs text-grey">{b.checkIn} → {b.checkOut} · {b.guestName}</div>
                </div>
                <div className="flex items-center gap-2 whitespace-nowrap">
                  <b>{fmtMoney(b.totalCents)}</b>
                  <span className={`rounded-pill px-2 py-0.5 text-[10px] font-bold ${BADGE[b.status] ?? ""}`}>{b.status}</span>
                </div>
              </a>
            ))}
            {stays.length === 0 && <p className="py-4 text-center text-sm text-grey">No stay bookings yet.</p>}
          </div>
        </div>

        <div className="rounded-card bg-paper p-5 shadow-soft">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-extrabold">Latest tour bookings</h2>
            <a href="/admin/tour-bookings" className="text-sm font-bold text-rosa hover:underline">All →</a>
          </div>
          <div className="grid gap-2">
            {tours.slice(0, 6).map((t) => (
              <a key={t.id} href="/admin/tour-bookings"
                className="flex items-center justify-between gap-3 rounded-xl border-[1.5px] border-line px-3 py-2 text-sm hover:border-rosa/50">
                <div>
                  <b>{t.tourTitle}</b>
                  <div className="text-xs text-grey">{t.tourDate} · {t.groupSize} people · {t.guestName}</div>
                </div>
                <div className="flex items-center gap-2 whitespace-nowrap">
                  <b>{fmtMoney(t.totalCents)}</b>
                  <span className={`rounded-pill px-2 py-0.5 text-[10px] font-bold ${BADGE[t.status] ?? ""}`}>{t.status}</span>
                </div>
              </a>
            ))}
            {tours.length === 0 && <p className="py-4 text-center text-sm text-grey">No tour bookings yet.</p>}
          </div>
        </div>
      </div>
    </div>
  );
}
