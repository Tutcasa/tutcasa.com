"use client";

import { useTransition } from "react";
import { deleteBookingAction } from "./bookings/actions";
import { deleteTourBookingAction } from "./tour-bookings/actions";

/**
 * Small confirm-then-delete button for admin rows. The browser confirm is
 * the safety net — deletion is permanent (there is no trash).
 */
export function DeleteButton({
  onDelete,
  what,
  compact = false,
}: {
  onDelete: () => Promise<void>;
  what: string;
  compact?: boolean;
}) {
  const [pending, start] = useTransition();
  return (
    <button
      disabled={pending}
      onClick={() => {
        if (!window.confirm(`Delete ${what} permanently? This cannot be undone.`)) return;
        start(() => onDelete());
      }}
      className={
        compact
          ? "text-xs font-bold text-grey underline-offset-2 hover:text-rosa-deep hover:underline disabled:opacity-50"
          : "rounded-pill border-[1.5px] border-line px-4 py-1.5 text-xs font-bold text-grey hover:border-rosa-deep hover:text-rosa-deep disabled:opacity-50"
      }
    >
      {pending ? "Deleting…" : compact ? "Delete" : `Delete ${what}`}
    </button>
  );
}

/**
 * Row-delete for anything backed by a booking row — stay bookings, tour
 * bookings, and the invoice/order views over them. Usable straight from
 * server components (only primitives cross the boundary).
 */
export function DeleteBookingButton({
  id,
  kind,
  what,
  compact = false,
}: {
  id: string;
  kind: "stay" | "tour";
  what: string;
  compact?: boolean;
}) {
  return (
    <DeleteButton
      what={what}
      compact={compact}
      onDelete={() => (kind === "tour" ? deleteTourBookingAction(id) : deleteBookingAction(id))}
    />
  );
}
