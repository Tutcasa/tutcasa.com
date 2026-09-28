"use client";

import { useState, useTransition } from "react";
import { restoreAction } from "./actions";

export function RestoreButton({ id }: { id: string }) {
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<{ ok: boolean; message: string } | null>(null);
  return (
    <div className="text-right">
      <button disabled={pending}
        onClick={() => start(async () => setMsg(await restoreAction(id)))}
        className="rounded-pill bg-cactus px-4 py-1.5 text-xs font-bold text-white disabled:opacity-50">
        {pending ? "Restoring…" : "Restore"}
      </button>
      {msg && !msg.ok && <p className="mt-1 max-w-[260px] text-xs font-semibold text-rosa-deep">{msg.message}</p>}
    </div>
  );
}
