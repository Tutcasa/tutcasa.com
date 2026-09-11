"use client";

/** "Download PDF" = the browser's print-to-PDF on a print-styled report. */
export function PrintButton() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="no-print rounded-pill bg-ink px-5 py-2 text-sm font-bold text-white hover:bg-rosa"
    >
      ⬇ Download PDF
    </button>
  );
}
