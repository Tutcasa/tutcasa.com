import type { Metadata } from "next";
import { getSetting } from "@/modules/settings";
export const metadata: Metadata = {
  title: "Gift cards",
  description: "Give a getaway — TutCasa gift cards are redeemable toward any stay, tour or concierge service.",
};

export default async function GiftCardsPage() {
  const contact = await getSetting("contact");
  return (
    <div className="mx-auto max-w-[720px] px-4 sm:px-6">
      <section className="py-12 text-center">
        <p className="font-mono text-xs font-bold uppercase tracking-[.2em] text-terra">Gift cards</p>
        <h1 className="mt-2 text-4xl font-extrabold">Give the gift of a <span className="text-rosa">home away from home.</span></h1>
        <p className="mx-auto mt-4 max-w-[52ch] text-grey">
          A TutCasa gift card is a getaway waiting to happen — redeemable toward
          any stay, tour or concierge service. Personalized with your message,
          valid 12 months, always fee-free.
        </p>
      </section>
      <div className="ph-g2 relative mb-10 rounded-card p-8 text-white shadow-lift">
        <div className="font-display text-xl font-extrabold tracking-wide">TUT CASA</div>
        <div className="text-xs opacity-90">A king in your own house</div>
        <div className="mt-6 font-display text-4xl font-extrabold">$2,500 <span className="text-lg">MXN</span></div>
        <div className="mt-2 text-sm opacity-90">To: someone special · “Enjoy your stay like royalty.”</div>
      </div>
      <div className="pb-16 text-center">
        <a
          href={`https://wa.me/${contact.whatsapp}?text=${encodeURIComponent("Hi May! I'd like to buy a TutCasa gift card 🎁")}`}
          target="_blank" rel="noopener"
          className="rounded-pill bg-rosa px-7 py-3.5 font-bold text-white shadow-soft hover:bg-rosa-deep"
        >
          Buy a gift card 🎁
        </a>
        <p className="mt-3 text-xs text-grey">Online purchase &amp; redemption arrive with card checkout — May arranges it personally until then.</p>
      </div>
    </div>
  );
}
