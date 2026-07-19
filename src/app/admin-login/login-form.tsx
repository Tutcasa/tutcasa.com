"use client";

import { useActionState } from "react";
import { adminLoginAction, type LoginState } from "./actions";

export function LoginForm({ next }: { next: string }) {
  const [state, action, pending] = useActionState<LoginState, FormData>(
    adminLoginAction,
    { error: "" },
  );
  return (
    <form action={action} className="mt-5 grid gap-3">
      <input type="hidden" name="next" value={next} />
      <input
        type="password"
        name="password"
        placeholder="Admin password"
        required
        autoFocus
        className="w-full rounded-xl border-[1.5px] border-line bg-white px-3 py-2.5 text-sm outline-none focus:border-rosa"
      />
      {state.error && (
        <p className="text-sm font-semibold text-rosa-deep">{state.error}</p>
      )}
      <button
        disabled={pending}
        className="rounded-pill bg-rosa py-3 font-bold text-white disabled:opacity-50"
      >
        {pending ? "Signing in…" : "Sign in"}
      </button>
    </form>
  );
}
