import type { Metadata } from "next";
export const metadata: Metadata = {
  title: "Help & policies",
  description: "Cancellations, refunds, check-in, house rules and everything about booking with TutCasa.",
};

const SECTIONS = [
  ["Booking & payment", "Reserving holds your dates instantly for 30 minutes. All prices are all-in — taxes and cleaning included. Payment is confirmed with our concierge; card checkout is arriving online."],
  ["Cancellations", "Free cancellation up to 14 days before check-in on most homes. Within 14 days, the first night is retained; within 48 hours, the stay is non-refundable. Tour bookings follow the operator's policy — we'll always tell you before you pay."],
  ["Check-in & check-out", "Check-in from 3:00 PM, check-out by 11:00 AM. Early or late times are often possible — just ask May."],
  ["House rules", "No parties without prior approval, no smoking indoors, and please treat every casa like your own. Specific rules appear on each home's page."],
  ["Damage & deposits", "Some homes carry a refundable security deposit, shown before you book. Accidents happen — tell us early and we'll sort it fairly."],
] as const;

export default function PoliciesPage() {
  return (
    <div className="mx-auto max-w-[720px] px-4 sm:px-6">
      <section className="py-12 text-center">
        <h1 className="text-4xl font-extrabold">Help &amp; policies</h1>
        <p className="mx-auto mt-3 max-w-[50ch] text-grey">The fine print, in plain language.</p>
      </section>
      <div className="grid gap-4 pb-16">
        {SECTIONS.map(([t, b]) => (
          <div key={t} className="rounded-card bg-paper p-6 shadow-soft">
            <h2 className="font-display text-lg font-bold">{t}</h2>
            <p className="mt-1 text-sm leading-relaxed text-grey">{b}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
