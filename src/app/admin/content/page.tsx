import { getSetting } from "@/modules/settings";
import { ContactForm, DeckForm } from "./content-forms";

export const dynamic = "force-dynamic";

export default async function AdminContent() {
  const [contact, investor] = await Promise.all([
    getSetting("contact"),
    getSetting("investor"),
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
    </div>
  );
}
