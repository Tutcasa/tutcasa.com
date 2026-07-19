import type { Metadata } from "next";
import { getSetting } from "@/modules/settings";
export const metadata: Metadata = {
  title: "List your property",
  description: "Earn more, worry less. List your Riviera Maya, Egypt or Florida property with TutCasa — we handle guests, cleaning, pricing & support.",
};

export default async function ListPropertyPage() {
  const contact = await getSetting("contact");
  return (
    <div className="mx-auto max-w-[900px] px-4 sm:px-6">
      <section className="py-12 text-center">
        <h1 className="text-4xl font-extrabold">List your property with <span className="text-rosa">TutCasa.</span></h1>
        <p className="mx-auto mt-4 max-w-[54ch] text-grey">
          Earn more, worry less. We handle everything — guests, cleaning,
          pricing and support — while you watch the ROI.
        </p>
      </section>
      <div className="grid gap-4 pb-10 text-center sm:grid-cols-3">
        {[["85%", "avg. occupancy"], ["40+", "homes managed"], ["24/7", "guest support"]].map(([k, v]) => (
          <div key={v} className="rounded-card bg-paper p-6 shadow-soft">
            <div className="font-display text-3xl font-extrabold text-rosa">{k}</div>
            <div className="mt-1 text-sm text-grey">{v}</div>
          </div>
        ))}
      </div>
      <div className="pb-16 text-center">
        <a
          href={`https://wa.me/${contact.whatsapp}?text=${encodeURIComponent("Hi! I'd like to list my property with TutCasa 🏠")}`}
          target="_blank" rel="noopener"
          className="rounded-pill bg-rosa px-7 py-3.5 font-bold text-white shadow-soft hover:bg-rosa-deep"
        >
          Tell us about your place 🏠
        </a>
        <p className="mt-3 text-xs text-grey">Our team reaches out within 24 hours.</p>
      </div>
    </div>
  );
}
