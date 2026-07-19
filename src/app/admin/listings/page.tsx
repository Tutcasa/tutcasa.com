import { getDb } from "@/lib/db";
import { ListingForm, type AdminListing } from "./listing-form";

export const dynamic = "force-dynamic";

async function allListings(): Promise<AdminListing[]> {
  const res = await getDb().query(
    `select l.id, l.title, coalesce(l.headline,'') as headline, l.city,
            coalesce(l.description,'') as description, l.max_guests,
            l.bedrooms, l.bathrooms, l.min_stay, l.status,
            coalesce(r.nightly_cents,0) as nightly_cents,
            coalesce(r.cleaning_cents,0) as cleaning_cents,
            coalesce(r.tax_pct,0) as tax_pct
       from listings l
       left join listing_rates r on r.listing_id = l.id and r.season is null
      where l.status <> 'archived'
      order by l.title`,
  );
  return res.rows.map((r) => ({
    id: r.id, title: r.title, headline: r.headline, city: r.city,
    description: r.description, maxGuests: r.max_guests,
    bedrooms: r.bedrooms, bathrooms: Number(r.bathrooms),
    minStay: r.min_stay, status: r.status,
    nightlyCents: r.nightly_cents, cleaningCents: r.cleaning_cents,
    taxPct: Number(r.tax_pct),
  }));
}

export default async function AdminListings({
  searchParams,
}: { searchParams: Promise<{ edit?: string }> }) {
  const { edit } = await searchParams;
  const listings = await allListings();
  const editing = edit ? listings.find((l) => l.id === edit) : listings[0];

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(280px,1fr)_1.4fr]">
      <div>
        <h1 className="mb-4 text-2xl font-extrabold">Stays &amp; homes</h1>
        <div className="grid gap-2">
          {listings.map((l) => (
            <a
              key={l.id}
              href={`/admin/listings?edit=${l.id}`}
              className={`flex items-center justify-between gap-3 rounded-xl border-[1.5px] bg-paper p-3.5 ${editing?.id === l.id ? "border-rosa" : "border-line hover:border-rosa/50"}`}
            >
              <div>
                <b>{l.title}</b>
                {l.status !== "published" && (
                  <span className="ml-2 rounded-pill bg-grey/15 px-2 py-0.5 text-[10px] font-bold uppercase text-grey">{l.status}</span>
                )}
                <div className="text-xs text-grey">
                  {l.city} · {l.bedrooms} BR · {l.maxGuests} guests
                </div>
              </div>
              <div className="whitespace-nowrap text-sm font-bold text-rosa">
                ${Math.round(l.nightlyCents / 100)}/n
              </div>
            </a>
          ))}
        </div>
      </div>
      <div>
        <h2 className="mb-4 text-xl font-extrabold">
          {editing ? `Edit: ${editing.title}` : "Select a home"}
        </h2>
        {editing && (
          <div className="rounded-card bg-paper p-5 shadow-soft">
            <ListingForm key={editing.id} listing={editing} />
          </div>
        )}
      </div>
    </div>
  );
}
