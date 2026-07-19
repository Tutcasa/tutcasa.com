import { listTourBookings } from "@/modules/tours";
import { amanahWhatsAppLink } from "@/modules/notifications";
import { StatusButtons } from "./status-buttons";

export const dynamic = "force-dynamic";

const BADGE: Record<string, string> = {
  pending: "bg-sol/15 text-terra",
  paid: "bg-cielo/15 text-cielo",
  partner_confirmed: "bg-cactus/15 text-cactus",
  completed: "bg-cielo/15 text-cielo",
  cancelled: "bg-grey/15 text-grey",
};

export default async function AdminTourBookings() {
  const bookings = await listTourBookings();
  return (
    <div>
      <h1 className="mb-2 text-2xl font-extrabold">Tour bookings</h1>
      <p className="mb-6 text-sm text-grey">
        Amanah Vacations is notified by email automatically on every booking —
        the WhatsApp button opens the same message ready to send.
      </p>
      <div className="grid gap-4">
        {bookings.map((b) => (
          <div key={b.id} className="rounded-card bg-paper p-5 shadow-soft">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-mono text-xs text-grey">{b.id.slice(0, 8).toUpperCase()}</span>
                  <span className={`rounded-pill px-2.5 py-1 text-xs font-bold ${BADGE[b.status]}`}>{b.status.replace("_", " ")}</span>
                  {b.partnerNotifiedAt && (
                    <span className="rounded-pill bg-cactus/10 px-2.5 py-1 text-xs font-bold text-cactus">✓ Amanah emailed</span>
                  )}
                </div>
                <h2 className="mt-1 font-display text-lg font-bold">{b.tourTitle}</h2>
                <p className="text-sm text-grey">
                  {b.tourDate} · {b.groupSize} people ·{" "}
                  <b className="text-ink">${(b.totalCents / 100).toLocaleString("en-US")} {b.currency}</b>
                </p>
                <p className="mt-1 text-sm">
                  {b.guestName} · {b.guestEmail}{b.guestPhone ? ` · ${b.guestPhone}` : ""}
                </p>
                {b.notes && <p className="mt-1 text-sm italic text-grey">"{b.notes}"</p>}
              </div>
              <div className="flex flex-col gap-2">
                <a
                  href={amanahWhatsAppLink({
                    tourBookingId: b.id, tourTitle: b.tourTitle, tourDate: b.tourDate,
                    groupSize: b.groupSize,
                    totalLabel: `${(b.totalCents / 100).toLocaleString("en-US")} ${b.currency}`,
                    guestName: b.guestName, guestEmail: b.guestEmail,
                    guestPhone: b.guestPhone, notes: b.notes,
                    ref: b.id.slice(0, 8).toUpperCase(),
                  })}
                  target="_blank" rel="noopener"
                  className="rounded-pill bg-[#1EBE5D] px-4 py-2 text-center text-sm font-bold text-white"
                >
                  WhatsApp Amanah 💬
                </a>
                <StatusButtons id={b.id} status={b.status} />
              </div>
            </div>
          </div>
        ))}
        {bookings.length === 0 && (
          <div className="rounded-card bg-paper p-10 text-center text-grey shadow-soft">No tour bookings yet.</div>
        )}
      </div>
    </div>
  );
}
