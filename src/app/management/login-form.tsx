"use client";

import { useActionState } from "react";
import { managerLoginAction, type ManagerLoginState } from "./actions";

const initial: ManagerLoginState = { ok: true, message: "" };

export function ManagerLogin() {
  const [state, action, pending] = useActionState(managerLoginAction, initial);
  return (
    <form action={action} className="mx-auto grid w-full max-w-sm gap-3 rounded-card bg-paper p-8 shadow-soft">
      <div className="text-center">
        <div className="text-3xl">🗓️</div>
        <h1 className="mt-1 font-display text-xl font-extrabold">Property management</h1>
        <p className="mt-1 text-sm text-grey">The team calendar — enter the management password.</p>
      </div>
      <input
        name="password" type="password" required autoFocus placeholder="Password"
        className="w-full rounded-xl border-[1.5px] border-line bg-white px-3 py-2.5 text-sm outline-none focus:border-rosa"
      />
      <button disabled={pending}
        className="rounded-pill bg-rosa px-5 py-2.5 text-sm font-bold text-white disabled:opacity-50">
        {pending ? "Checking…" : "Open the calendar"}
      </button>
      {state.message && <p className="text-center text-sm font-semibold text-rosa-deep">{state.message}</p>}
    </form>
  );
}
