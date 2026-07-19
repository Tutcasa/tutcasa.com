"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

/**
 * Two-step destructive button: first click arms it, second confirms.
 * Used for deleting homes and tours in the admin.
 */
export function DeleteButton({
  label,
  confirmLabel,
  onDelete,
  redirectTo,
}: {
  label: string;
  confirmLabel: string;
  onDelete: () => Promise<{ deleted: boolean; message: string }>;
  redirectTo: string;
}) {
  const router = useRouter();
  const [armed, setArmed] = useState(false);
  const [msg, setMsg] = useState("");
  const [busy, start] = useTransition();

  function click() {
    if (!armed) { setArmed(true); return; }
    start(async () => {
      const res = await onDelete();
      setMsg(res.message);
      setArmed(false);
      router.push(redirectTo);
      router.refresh();
    });
  }

  return (
    <div className="mt-6 border-t border-line pt-4">
      <button
        type="button"
        onClick={click}
        disabled={busy}
        className={`rounded-pill border-[1.5px] px-5 py-2 text-sm font-bold disabled:opacity-50 ${
          armed
            ? "border-rosa-deep bg-rosa-deep text-white"
            : "border-line text-grey hover:border-rosa-deep hover:text-rosa-deep"
        }`}
      >
        {busy ? "Deleting…" : armed ? confirmLabel : label}
      </button>
      {armed && !busy && (
        <button type="button" onClick={() => setArmed(false)}
                className="ml-2 text-sm font-semibold text-grey hover:text-ink">
          Cancel
        </button>
      )}
      {msg && <p className="mt-2 text-sm font-semibold text-terra">{msg}</p>}
      <p className="mt-1 text-xs text-grey">
        Homes or tours with bookings are archived (hidden) instead of erased.
      </p>
    </div>
  );
}
