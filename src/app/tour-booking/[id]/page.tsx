import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getTourBooking } from "@/modules/tours";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Your tour booking", robots: { index: false } };

const STATUS: Record<string, { badge: string; cls: string; note: string }> = {
  pending: { badge: "Request received", cls: "bg-sol/15 text-terra",
    note: "We've sent your booking to the tour operator and will confirm shortly — then we'll arrange payment with you." },
  paid: { badge: "Paid", cls: "bg-cielo/15 text-cielo",
    note: "Payment received — awaiting final operator confirmation." },
  partner_confirmed: { badge: "Confirmed", cls: "bg-cactus/15 text-cactus",
    note: "Your tour is confirmed! Details and pickup time arrive by email & WhatsApp. 🎉" },
  completed: { badge: "Completed", cls: "bg-cielo/15 text-cielo",
    note: "Hope it was unforgettable! We'd love to hear about it." },
  cancelled: { badge: "Cancelled", cls: "bg-grey/15 text-grey",
    note: "This tour request was cancelled. You can book another anytime." },
};

export default async function TourBookingPage({
  params,
}: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const b = await getTourBooking(id);
  if (!b) notFound();
  const ui = STATUS[b.status];

  return (
    <div className="mx-auto max-w-xl px-4 py-12 sm:px-6">
      <div className="rounded-card bg-paper p-7 shadow-soft">
        <span className={`inline-block rounded-pill px-3.5 py-1.5 text-xs font-extrabold uppercase tracking-wide ${ui.cls}`}>
          {ui.badge}
        </span>
        <h1 className="mt-3 text-2xl font-extrabold sm:text-3xl">{b.tourTitle}</h1>

        <div className="mt-5 grid grid-cols-2 gap-3 text-sm">
          <div className="rounded-xl bg-crema p-3">
            <div className="text-xs font-bold text-grey">DATE</div>{b.tourDate}
          </div>
          <div className="rounded-xl bg-crema p-3">
            <div className="text-xs font-bold text-grey">PEOPLE</div>{b.groupSize}
          </div>
          <div className="rounded-xl bg-crema p-3">
            <div className="text-xs font-bold text-grey">TOTAL</div>
            ${(b.totalCents / 100).toLocaleString("en-US")} {b.currency}
          </div>
          <div className="rounded-xl bg-crema p-3">
            <div className="text-xs font-bold text-grey">REF</div>{b.id.slice(0, 8).toUpperCase()}
          </div>
        </div>

        <p className="mt-4 text-sm text-grey">{ui.note}</p>

        <a
          href={`https://wa.me/201069706782?text=${encodeURIComponent(`Hi May! About my tour booking ${b.id.slice(0, 8).toUpperCase()} (${b.tourTitle}, ${b.tourDate}) 👋`)}`}
          target="_blank" rel="noopener"
          className="mt-5 block rounded-pill bg-[#1EBE5D] py-3.5 text-center font-bold text-white shadow-soft"
        >
          Chat with May about this booking 💬
        </a>

        <Link href="/tours" className="mt-6 block text-center text-sm font-semibold text-rosa hover:underline">
          ← Back to tours &amp; parks
        </Link>
      </div>
    </div>
  );
}
