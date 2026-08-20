import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getBooking } from "@/modules/bookings";
import { fmtMoney } from "@/modules/pricing";
import { transferForBooking } from "@/modules/transfers";
import { TransferSection } from "./transfer-section";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Your booking",
  robots: { index: false },
};

const STATUS_UI: Record<string, { badge: string; cls: string; note: string }> = {
  pending: {
    badge: "Dates held",
    cls: "bg-sol/15 text-terra",
    note: "Your dates are locked for 30 minutes while you complete payment. Nobody else can take them.",
  },
  confirmed: {
    badge: "Confirmed",
    cls: "bg-cactus/15 text-cactus",
    note: "You're booked! Check your email for details — see you soon. 🎉",
  },
  cancelled: {
    badge: "Cancelled",
    cls: "bg-grey/15 text-grey",
    note: "This booking was cancelled (or its hold expired). The dates are open again — you can rebook anytime.",
  },
  completed: {
    badge: "Completed",
    cls: "bg-cielo/15 text-cielo",
    note: "Hope you had a great stay! We'd love a review.",
  },
};

export default async function BookingPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const booking = await getBooking(id);
  if (!booking) notFound();
  const transfer = await transferForBooking(id);
  const amanahWhatsapp = process.env.AMANAH_WHATSAPP ?? "+529903516948";

  const ui = STATUS_UI[booking.status];
  const b = booking.priceBreakdown;
  const wa = `https://wa.me/201069706782?text=${encodeURIComponent(
    `Hi TutCasa! I just reserved ${booking.listingTitle} (${booking.checkIn} → ${booking.checkOut}), booking ref ${booking.id.slice(0, 8)}. I'd like to complete my payment 👋`,
  )}`;

  return (
    <div className="mx-auto max-w-xl px-4 py-12 sm:px-6">
      <div className="rounded-card bg-paper p-7 shadow-soft">
        <span className={`inline-block rounded-pill px-3.5 py-1.5 text-xs font-extrabold uppercase tracking-wide ${ui.cls}`}>
          {ui.badge}
        </span>
        <h1 className="mt-3 text-2xl font-extrabold sm:text-3xl">
          {booking.listingTitle}
        </h1>
        <p className="text-grey">{booking.listingCity}</p>

        <div className="mt-5 grid grid-cols-2 gap-3 text-sm">
          <div className="rounded-xl bg-crema p-3">
            <div className="text-xs font-bold text-grey">CHECK IN</div>
            {booking.checkIn}
          </div>
          <div className="rounded-xl bg-crema p-3">
            <div className="text-xs font-bold text-grey">CHECK OUT</div>
            {booking.checkOut}
          </div>
          <div className="rounded-xl bg-crema p-3">
            <div className="text-xs font-bold text-grey">GUESTS</div>
            {booking.guests}
          </div>
          <div className="rounded-xl bg-crema p-3">
            <div className="text-xs font-bold text-grey">REF</div>
            {booking.id.slice(0, 8).toUpperCase()}
          </div>
        </div>

        <div className="mt-5 rounded-xl border border-line p-4 text-sm">
          {/* manual/imported bookings may not carry a stored breakdown */}
          {b && (
            <>
              <div className="flex justify-between">
                <span>{fmtMoney(b.nightlyCents)} × {b.nights} nights</span>
                <span>{fmtMoney(b.accommodationCents)}</span>
              </div>
              <div className="mt-1 flex justify-between">
                <span>Cleaning</span><span>{fmtMoney(b.cleaningCents)}</span>
              </div>
              <div className="mt-1 flex justify-between">
                <span>Taxes</span><span>{fmtMoney(b.taxCents)}</span>
              </div>
            </>
          )}
          <div className={`flex justify-between font-display text-base font-extrabold ${b ? "mt-2 border-t border-line pt-2" : ""}`}>
            <span>Total — all-in</span>
            <span>{fmtMoney(booking.totalCents)}</span>
          </div>
        </div>

        <p className="mt-4 text-sm text-grey">{ui.note}</p>

        {(booking.status === "confirmed" || booking.status === "pending") && (
          <TransferSection
            bookingId={booking.id}
            guestName={booking.guestName}
            checkIn={booking.checkIn}
            amanahWhatsapp={amanahWhatsapp}
            refCode={`TC-${booking.invoiceNo}`}
            transfer={transfer ? {
              travelDate: transfer.travelDate,
              flightNumber: transfer.flightNumber,
              passengers: transfer.passengers,
              babySeat: transfer.babySeat,
              status: transfer.status,
              amanahNote: transfer.amanahNote,
            } : null}
          />
        )}

        {booking.status === "pending" && (
          <>
            <a
              href={wa}
              target="_blank"
              rel="noopener"
              className="mt-5 block rounded-pill bg-[#1EBE5D] py-3.5 text-center font-bold text-white shadow-soft"
            >
              Contact us to complete payment 💬
            </a>
            <p className="mt-2 text-center text-xs text-grey">
              Card checkout is coming online next — until then our team confirms your
              payment on WhatsApp in minutes.
            </p>
          </>
        )}

        <Link href="/stays" className="mt-6 block text-center text-sm font-semibold text-rosa hover:underline">
          ← Back to all casas
        </Link>
      </div>
    </div>
  );
}
