"use client";

import { useState, useTransition } from "react";
import { payExtraAction } from "./actions";

export function PayExtra({ id, label }: { id: string; label: string }) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="mt-4">
      <button
        disabled={pending}
        onClick={() => start(async () => {
          const res = await payExtraAction(id);
          if (res.url) window.location.href = res.url;
          else setError(res.error ?? "Something went wrong — try again in a moment.");
        })}
        className="w-full rounded-pill bg-rosa px-6 py-3 text-base font-bold text-white disabled:opacity-50"
      >
        {pending ? "Opening secure payment…" : `Pay & confirm ${label.toLowerCase()}`}
      </button>
      {error && <p className="mt-2 text-center text-sm font-semibold text-rosa-deep">{error}</p>}
      <p className="mt-2 text-center text-xs text-grey">
        Secure card payment through Stripe. Nothing is charged until you complete it.
      </p>
    </div>
  );
}
