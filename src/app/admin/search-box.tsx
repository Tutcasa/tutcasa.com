/** Shared admin search bar — plain GET form so it works on any
    server-rendered page. Type and press Enter; empty search clears. */
export function AdminSearch({
  placeholder,
  q,
  extra,
}: {
  placeholder: string;
  q: string;
  extra?: Record<string, string | undefined>;
}) {
  return (
    <form method="get" className="mb-4 flex max-w-md gap-2">
      {extra &&
        Object.entries(extra).map(([k, v]) =>
          v ? <input key={k} type="hidden" name={k} value={v} /> : null,
        )}
      <input
        name="q"
        defaultValue={q}
        placeholder={placeholder}
        className="w-full rounded-pill border-[1.5px] border-line bg-paper px-4 py-2 text-sm outline-none focus:border-rosa"
      />
      <button className="rounded-pill border-[1.5px] border-line bg-paper px-4 py-2 text-sm font-bold hover:border-rosa hover:text-rosa">
        🔍
      </button>
    </form>
  );
}

/** Case-insensitive "any field contains the query" row matcher. */
export function rowMatches(q: string, ...fields: (string | null | undefined)[]): boolean {
  const needle = q.trim().toLowerCase();
  if (!needle) return true;
  return fields.some((f) => (f ?? "").toLowerCase().includes(needle));
}
