"use client";

import { useState } from "react";

export function CopyLink({ bookingId }: { bookingId: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="flex gap-2">
      <a href={`/invoice/${bookingId}`} target="_blank" rel="noopener"
         className="rounded-pill border-[1.5px] border-line px-3 py-1 text-xs font-bold hover:border-rosa hover:text-rosa">
        View
      </a>
      <button
        onClick={async () => {
          await navigator.clipboard.writeText(`${window.location.origin}/invoice/${bookingId}`);
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        }}
        className={`rounded-pill border-[1.5px] px-3 py-1 text-xs font-bold ${copied ? "border-cactus text-cactus" : "border-line hover:border-rosa hover:text-rosa"}`}
      >
        {copied ? "Copied!" : "Copy link"}
      </button>
    </div>
  );
}
