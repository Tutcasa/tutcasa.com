import { listTours } from "@/modules/tours";
import { TourForm } from "./tour-form";

export const dynamic = "force-dynamic";

export default async function AdminTours({
  searchParams,
}: { searchParams: Promise<{ edit?: string }> }) {
  const { edit } = await searchParams;
  const tours = await listTours({ includeUnpublished: true });
  const editing = edit ? tours.find((t) => t.id === edit) : undefined;

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_1fr]">
      <div>
        <h1 className="mb-4 text-2xl font-extrabold">Tours &amp; parks</h1>
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
                ${(t.priceCents / 100).toLocaleString("en-US")} MXN
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
