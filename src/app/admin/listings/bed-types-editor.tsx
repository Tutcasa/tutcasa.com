"use client";

import { useState } from "react";

/**
 * Structured bed-type rows (count + type dropdown, "+ add" for more).
 * Serializes to the same "2 x Queen" lines the save action already
 * parses, via a hidden textarea named bedTypes.
 */

const BED_TYPES = [
  "King", "Queen", "Double", "Single / Twin",
  "Bunk bed", "Sofa bed", "Murphy bed", "Crib", "Air mattress",
];

interface Row {
  count: number;
  type: string;
}

export function BedTypesEditor({ initial }: { initial: Row[] }) {
  const [rows, setRows] = useState<Row[]>(
    initial.length ? initial : [],
  );

  const serialized = rows
    .filter((r) => r.count > 0 && r.type)
    .map((r) => `${r.count} x ${r.type}`)
    .join("\n");

  const setRow = (i: number, patch: Partial<Row>) =>
    setRows((rs) => rs.map((r, j) => (j === i ? { ...r, ...patch } : r)));

  return (
    <div className="grid gap-2">
      <input type="hidden" name="bedTypes" value={serialized} readOnly />
      {rows.map((r, i) => (
        <div key={i} className="flex items-center gap-2">
          <input
            type="number" min={1} max={20} value={r.count}
            onChange={(e) => setRow(i, { count: Math.max(1, Number(e.target.value) || 1) })}
            className="w-20 rounded-xl border-[1.5px] border-line bg-white px-3 py-2.5 text-sm outline-none focus:border-rosa"
            aria-label="Number of beds"
          />
          <span className="text-sm text-grey">×</span>
          <select
            value={r.type}
            onChange={(e) => setRow(i, { type: e.target.value })}
            className="grow rounded-xl border-[1.5px] border-line bg-white px-3 py-2.5 text-sm outline-none focus:border-rosa"
            aria-label="Bed type"
          >
            {!BED_TYPES.includes(r.type) && r.type && <option value={r.type}>{r.type}</option>}
            {BED_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
          <button
            type="button"
            onClick={() => setRows((rs) => rs.filter((_, j) => j !== i))}
            className="rounded-full px-2 text-lg text-grey hover:text-rosa"
            aria-label="Remove bed row"
          >
            ×
          </button>
        </div>
      ))}
      <button
        type="button"
        onClick={() => setRows((rs) => [...rs, { count: 1, type: "Queen" }])}
        className="w-fit rounded-pill border-[1.5px] border-line bg-paper px-4 py-1.5 text-sm font-bold hover:border-rosa hover:text-rosa"
      >
        + Add bed type
      </button>
    </div>
  );
}
