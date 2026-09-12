import { listTours } from "@/modules/tours";
import { TourForm } from "./tour-form";
import { deleteTourAction } from "./actions";
import { DeleteButton } from "@/components/DeleteButton";
import { SyncButton } from "./sync-button";
import { AdminSearch, rowMatches } from "../search-box";

export const dynamic = "force-dynamic";

export default async function AdminTours({
  searchParams,
}: { searchParams: Promise<{ edit?: string; q?: string; src?: string }> }) {
  const { edit, q = "", src = "all" } = await searchParams;
  const allTours = await listTours({ includeUnpublished: true });
  const isAmanah = (t: { source: string | null }) => t.source === "amanah";
  const tours = allTours
    .filter((t) => src === "amanah" ? isAmanah(t) : src === "ours" ? !isAmanah(t) : true)
    .filter((t) => rowMatches(q, t.title, t.city, t.category));
  const editing = edit ? allTours.find((t) => t.id === edit) : undefined;
  const srcTabs: [string, string, number][] = [
    ["all", "All", allTours.length],
    ["amanah", "Amanah tours", allTours.filter(isAmanah).length],
    ["ours", "Our own", allTours.filter((t) => !isAmanah(t)).length],
  ];

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_1fr]">
      <div>
        <h1 className="mb-4 text-2xl font-extrabold">Tours &amp; parks</h1>
        <SyncButton />
        <div className="mb-3 flex flex-wrap gap-1.5">
          {srcTabs.map(([key, label, n]) => (
            <a key={key} href={`/admin/tours?src=${key}${q ? `&q=${encodeURIComponent(q)}` : ""}`}
              className={`rounded-pill border-[1.5px] px-4 py-1.5 text-sm font-bold ${
                src === key ? "border-ink bg-ink text-white" : "border-line bg-paper hover:border-rosa hover:text-rosa"}`}>
              {label} ({n})
            </a>
          ))}
        </div>
        <AdminSearch placeholder="Search by tour name, city or type…" q={q}
          extra={{ src: src !== "all" ? src : undefined }} />
        <div className="grid gap-2">
          {tours.map((t) => (
            <a
              key={t.id}
              href={`/admin/tours?edit=${t.id}`}
              className={`flex items-center justify-between gap-3 rounded-xl border-[1.5px] bg-paper p-3.5 ${editing?.id === t.id ? "border-rosa" : "border-line hover:border-rosa/50"}`}
            >
              <div>
                <b>{t.title}</b>
                <span className={`ml-2 rounded-pill px-2 py-0.5 text-[10px] font-bold uppercase ${t.category === "park" ? "bg-cielo/15 text-cielo" : "bg-sol/15 text-terra"}`}>
                  {t.category}
                </span>
                {t.status !== "published" && (
                  <span className="ml-1 rounded-pill bg-grey/15 px-2 py-0.5 text-[10px] font-bold uppercase text-grey">{t.status}</span>
                )}
                <div className="text-xs text-grey">{t.city} · {t.durationLabel}</div>
              </div>
              <div className="whitespace-nowrap text-sm font-bold text-rosa">
                ${(t.priceCents / 100).toLocaleString("en-US")} {t.currency}
              </div>
            </a>
          ))}
        </div>
      </div>
      <div>
        <h2 className="mb-4 text-xl font-extrabold">
          {editing ? `Edit: ${editing.title}` : "Add a tour or park"}
        </h2>
        <div className="rounded-card bg-paper p-5 shadow-soft">
          <TourForm key={editing?.id ?? "new"} tour={editing} />
          {editing && (
            <DeleteButton
              label="Delete this tour"
              confirmLabel="Yes, delete permanently"
              onDelete={deleteTourAction.bind(null, editing.id)}
              redirectTo="/admin/tours"
            />
          )}
        </div>
        {editing && (
          <a href="/admin/tours" className="mt-3 inline-block text-sm font-semibold text-rosa hover:underline">
            + Add a new one instead
          </a>
        )}
      </div>
    </div>
  );
}
