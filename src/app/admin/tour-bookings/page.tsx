import { listTourBookings } from "@/modules/tours";
import { amanahWhatsAppLink } from "@/modules/notifications";
import { StatusButtons } from "./status-buttons";
import { TourAnswerForm } from "./answer-form";
import { TourEditForm } from "./edit-form";

export const dynamic = "force-dynamic";

const BADGE: Record<string, string> = {
  pending: "bg-sol/15 text-terra",
  paid: "bg-cielo/15 text-cielo",
  partner_confirmed: "bg-cactus/15 text-cactus",
  completed: "bg-cielo/15 text-cielo",
  cancelled: "bg-grey/15 text-grey",
};

export default async function AdminTourBookings({
  searchParams,
}: { searchParams: Promise<{ src?: string; city?: string }> }) {
  const { src = "all", city = "" } = await searchParams;
  const allBookings = await listTourBookings();
  const bookings = allBookings
    .filter((b) => src === "amanah" ? b.tourSource === "amanah"
                 : src === "ours" ? b.tourSource !== "amanah" : true)
    .filter((b) => !city || b.tourCity.toLowerCase() === city.toLowerCase());
  const cities = [...new Set(allBookings.map((b) => b.tourCity).filter(Boolean))].sort();
  const link = (s: string, c: string) =>
    `/admin/tour-bookings?src=${s}${c ? `&city=${encodeURIComponent(c)}` : ""}`;
  const srcTabs: [string, string, number][] = [
    ["all", "All", allBookings.length],
    ["amanah", "Amanah tours", allBookings.filter((b) => b.tourSource === "amanah").length],
    ["ours", "Our own", allBookings.filter((b) => b.tourSource !== "amanah").length],
  ];
  return (
    <div>
      <h1 className="mb-2 text-2xl font-extrabold">Tour bookings</h1>
      <p className="mb-4 text-sm text-grey">
        Amanah Vacations is notified by email automatically on every booking
        of THEIR tours — the WhatsApp button opens the same message ready to
        send. Bookings of your own tours stay yours alone.
      </p>
      <div className="mb-4 flex flex-wrap items-center gap-1.5">
        {srcTabs.map(([key, label, n]) => (
          <a key={key} href={link(key, city)}
            className={`rounded-pill border-[1.5px] px-4 py-1.5 text-sm font-bold ${
              src === key ? "border-ink bg-ink text-white" : "border-line bg-paper hover:border-rosa hover:text-rosa"}`}>
            {label} ({n})
          </a>
        ))}
        {cities.length > 1 && (
          <span className="ml-2 flex flex-wrap items-center gap-1.5">
            <span className="text-xs font-bold uppercase text-grey">Destination:</span>
            <a href={link(src, "")}
              className={`rounded-pill border-[1.5px] px-3 py-1 text-xs font-bold ${
                !city ? "border-ink bg-ink text-white" : "border-line bg-paper hover:border-rosa hover:text-rosa"}`}>
              All
            </a>
            {cities.map((c) => (
              <a key={c} href={link(src, c)}
                className={`rounded-pill border-[1.5px] px-3 py-1 text-xs font-bold ${
                  city.toLowerCase() === c.toLowerCase() ? "border-ink bg-ink text-white" : "border-line bg-paper hover:border-rosa hover:text-rosa"}`}>
                {c}
              </a>
            ))}
          </span>
        )}
      </div>
      <div className="grid gap-4">
        {bookings.map((b) => (
          <div key={b.id} className="rounded-card bg-paper p-5 shadow-soft">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  {b.invoiceNo && <span className="font-mono text-sm font-extrabold">#{b.invoiceNo}</span>}
                  <span className="font-mono text-xs text-grey">{b.id.slice(0, 8).toUpperCase()}</span>
                  <span className={`rounded-pill px-2.5 py-1 text-xs font-bold ${BADGE[b.status]}`}>{b.status.replace("_", " ")}</span>
                  {b.partnerNotifiedAt && (
                    <span className="rounded-pill bg-cactus/10 px-2.5 py-1 text-xs font-bold text-cactus">✓ Amanah emailed</span>
                  )}
                </div>
                <h2 className="mt-1 font-display text-lg font-bold">{b.tourTitle}</h2>
                <p className="text-sm text-grey">
                  {b.tourDate} · {b.tourCity && <>{b.tourCity} · </>}{b.groupSize} people ·{" "}
                  <b className="text-ink">${(b.totalCents / 100).toLocaleString("en-US")} {b.currency}</b>
                </p>
                <p className="mt-1 text-sm">
                  {b.guestName} · {b.guestEmail}{b.guestPhone ? ` · ${b.guestPhone}` : ""}
                </p>
                {b.notes && <p className="mt-1 text-sm italic text-grey">&ldquo;{b.notes}&rdquo;</p>}
                {b.amanahNote && (
                  <div className="mt-1 rounded-xl bg-rosa/10 px-3 py-2 text-sm">
                    <div className="font-semibold text-rosa-deep">Amanah asks: {b.amanahNote}</div>
                    <TourAnswerForm bookingId={b.id} />
                  </div>
                )}
              </div>
              <div className="flex flex-col gap-2">
                <a
                  href={amanahWhatsAppLink({
                    tourBookingId: b.id, tourTitle: b.tourTitle, tourDate: b.tourDate,
                    groupSize: b.groupSize,
                    totalLabel: `${(b.totalCents / 100).toLocaleString("en-US")} ${b.currency}`,
                    guestName: b.guestName, guestEmail: b.guestEmail,
                    guestPhone: b.guestPhone, notes: b.notes, partnerTour: true,
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
            <TourEditForm b={{
              id: b.id, guestName: b.guestName, guestEmail: b.guestEmail,
              guestPhone: b.guestPhone, tourDate: b.tourDate,
              groupSize: b.groupSize, totalCents: b.totalCents,
            }} />
          </div>
        ))}
        {bookings.length === 0 && (
          <div className="rounded-card bg-paper p-10 text-center text-grey shadow-soft">No tour bookings yet.</div>
        )}
      </div>
    </div>
  );
}
