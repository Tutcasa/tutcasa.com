import { getSetting } from "@/modules/settings";
import { ContactForm, DeckForm } from "./content-forms";
import { PoliciesForm, WhyForm, ConciergeForm, LoyaltyForm } from "./page-forms";

export const dynamic = "force-dynamic";

export default async function AdminContent() {
  const [contact, investor, policies, why, concierge, loyalty] = await Promise.all([
    getSetting("contact"),
    getSetting("investor"),
    getSetting("page_policies"),
    getSetting("page_why"),
    getSetting("page_concierge"),
    getSetting("page_loyalty"),
  ]);

  return (
    <div className="grid max-w-3xl gap-8">
      <div>
        <h1 className="mb-1 text-2xl font-extrabold">Content &amp; site info</h1>
        <p className="text-sm text-grey">
          Everything here goes live across the site the moment you save.
        </p>
      </div>

      <section className="rounded-card bg-paper p-5 shadow-soft">
        <h2 className="mb-4 font-display text-lg font-bold">Contact &amp; social</h2>
        <ContactForm contact={contact} />
      </section>

      <section className="rounded-card bg-paper p-5 shadow-soft">
        <h2 className="mb-4 font-display text-lg font-bold">Investor deck (PDF)</h2>
        <DeckForm investor={investor} />
      </section>

      <section className="rounded-card bg-paper p-5 shadow-soft">
        <h2 className="mb-1 font-display text-lg font-bold">Concierge page</h2>
        <p className="mb-4 text-xs text-grey">Edits /concierge</p>
        <ConciergeForm content={concierge} />
      </section>

      <section className="rounded-card bg-paper p-5 shadow-soft">
        <h2 className="mb-1 font-display text-lg font-bold">Loyalty program page</h2>
        <p className="mb-4 text-xs text-grey">Edits /loyalty</p>
        <LoyaltyForm content={loyalty} />
      </section>

      <section className="rounded-card bg-paper p-5 shadow-soft">
        <h2 className="mb-1 font-display text-lg font-bold">Why book with us page</h2>
        <p className="mb-4 text-xs text-grey">Edits /why-book-with-us</p>
        <WhyForm content={why} />
      </section>

      <section className="rounded-card bg-paper p-5 shadow-soft">
        <h2 className="mb-1 font-display text-lg font-bold">Help &amp; policies page</h2>
        <p className="mb-4 text-xs text-grey">Edits /policies — terms, deposits, cancellation, payment options</p>
        <PoliciesForm content={policies} />
      </section>
    </div>
  );
}
