"use client";

/**
 * Admin error boundary: a thrown server action (expired login, a page
 * left open across a deploy, a network hiccup) must never look like
 * "nothing happened" — say it loudly and offer the fix.
 */
export default function AdminError({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="mx-auto max-w-lg rounded-card bg-paper p-8 text-center shadow-soft">
      <div className="text-3xl">⚠️</div>
      <h2 className="mt-2 text-xl font-extrabold">That didn&rsquo;t go through</h2>
      <p className="mt-2 text-sm text-grey">
        Usually this means your admin login expired, or this page was open
        while the site updated. Reload the page — and log in again if asked —
        then resubmit. Nothing was saved.
      </p>
      <div className="mt-4 flex justify-center gap-3">
        <button onClick={() => window.location.reload()}
          className="rounded-pill bg-rosa px-5 py-2 text-sm font-bold text-white">
          Reload the page
        </button>
        <button onClick={reset}
          className="rounded-pill border-[1.5px] border-line px-5 py-2 text-sm font-bold text-grey">
          Try again
        </button>
      </div>
    </div>
  );
}
