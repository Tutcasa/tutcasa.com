"use client";

import { useActionState, useState } from "react";
import { adminLoginAction, type LoginState } from "./actions";

export function LoginForm({ next }: { next: string }) {
  const [state, action, pending] = useActionState<LoginState, FormData>(
    adminLoginAction,
    { error: "" },
  );
  // controlled, so a failed attempt doesn't wipe the email (form actions reset fields)
  const [email, setEmail] = useState("");
  return (
    <form action={action} className="mt-5 grid gap-3">
      <input type="hidden" name="next" value={next} />
      <label className="text-xs font-bold">EMAIL
        <input
          type="email"
          name="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="username"
          placeholder="Your team email (leave empty for the main admin password)"
          autoFocus
          className="mt-1 w-full rounded-xl border-[1.5px] border-line bg-white px-3 py-2.5 text-sm font-normal outline-none focus:border-rosa"
        />
      </label>
      <label className="text-xs font-bold">PASSWORD
      <input
        type="password"
        name="password"
        autoComplete="current-password"
        placeholder="Password"
        required
        className="mt-1 w-full rounded-xl border-[1.5px] border-line bg-white px-3 py-2.5 text-sm font-normal outline-none focus:border-rosa"
      />
      </label>
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
