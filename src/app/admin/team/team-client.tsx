"use client";

import { useActionState, useState, useTransition } from "react";
import type { AdminUser } from "@/modules/admin-users";
import { addTeamMemberAction, resetPasswordAction, setActiveAction, removeMemberAction, type TeamState } from "./actions";

const initial: TeamState = { ok: true, message: "" };
const inputCls = "w-full rounded-xl border-[1.5px] border-line bg-white px-3 py-2.5 text-sm font-normal outline-none focus:border-rosa";
const when = (d: string | null) => d ? new Date(d).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" }) : "never";

function ResetPassword({ id }: { id: string }) {
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState(resetPasswordAction, initial);
  if (!open) return <button onClick={() => setOpen(true)} className="text-xs font-bold text-grey hover:text-ink">Change password</button>;
  return (
    <form action={action} className="flex flex-wrap items-center gap-2">
      <input type="hidden" name="id" value={id} />
      <input name="password" type="text" minLength={10} required placeholder="New password (10+ characters)" autoComplete="new-password"
        className="rounded-xl border-[1.5px] border-line bg-white px-3 py-1.5 text-xs outline-none focus:border-rosa" />
      <button disabled={pending} className="rounded-pill bg-rosa px-3 py-1.5 text-xs font-bold text-white disabled:opacity-50">
        {pending ? "Saving…" : "Save"}
      </button>
      <button type="button" onClick={() => setOpen(false)} className="text-xs font-bold text-grey">Cancel</button>
      {state.message && <span className={`text-xs font-semibold ${state.ok ? "text-cactus" : "text-rosa-deep"}`}>{state.message}</span>}
    </form>
  );
}

export function TeamClient({ users }: { users: AdminUser[] }) {
  const [state, action, pending] = useActionState(addTeamMemberAction, initial);
  const [busy, start] = useTransition();
  return (
    <div className="grid gap-6">
      <div className="rounded-card bg-paper p-5 shadow-soft">
        <div className="mb-3 text-[11px] font-extrabold uppercase tracking-wider text-grey">Add a team member</div>
        <form action={action} className="grid gap-2 sm:grid-cols-[1fr_1.3fr_1.2fr_auto] sm:items-end">
          <label className="text-xs font-bold">NAME<input name="name" required placeholder="e.g. Mosly" className={inputCls} /></label>
          <label className="text-xs font-bold">EMAIL<input name="email" type="email" required placeholder="name@tutcasa.com" className={inputCls} /></label>
          <label className="text-xs font-bold">PASSWORD
            <input name="password" type="text" minLength={10} required placeholder="10+ characters" autoComplete="new-password" className={inputCls} />
          </label>
          <button disabled={pending} className="rounded-pill bg-rosa px-5 py-2.5 text-sm font-bold text-white disabled:opacity-50">
            {pending ? "Adding…" : "+ Add"}
          </button>
        </form>
        {state.message && (
          <p className={`mt-2 rounded-xl p-3 text-sm font-semibold ${state.ok ? "bg-cactus/10 text-cactus" : "text-rosa-deep"}`}>{state.message}</p>
        )}
        <p className="mt-2 text-xs text-grey">
          Share the password with them privately. They sign in at <b>tutcasa.com/admin-login</b> with
          their email; they can change it here any time. The main admin password keeps working as before.
        </p>
      </div>

      <div className="overflow-x-auto rounded-card bg-paper shadow-soft">
        <table className="w-full min-w-[720px] text-sm">
          <thead className="border-b border-line text-left text-xs uppercase text-grey">
            <tr><th className="p-3">Member</th><th className="p-3">Status</th><th className="p-3">Last sign-in</th><th className="p-3"></th></tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} className={`border-b border-line/60 ${u.active ? "" : "opacity-60"}`}>
                <td className="p-3"><b>{u.name}</b><div className="text-xs text-grey">{u.email}</div></td>
                <td className="p-3">
                  <span className={`rounded-pill px-2.5 py-1 text-xs font-bold ${u.active ? "bg-cactus/15 text-cactus" : "bg-grey/15 text-grey"}`}>
                    {u.active ? "active" : "disabled"}
                  </span>
                </td>
                <td className="p-3 text-xs text-grey">{when(u.lastLoginAt)}</td>
                <td className="p-3">
                  <div className="flex flex-wrap items-center gap-3">
                    <ResetPassword id={u.id} />
                    <button disabled={busy} onClick={() => start(() => setActiveAction(u.id, !u.active))}
                      className="text-xs font-bold text-grey hover:text-ink disabled:opacity-50">
                      {u.active ? "Disable" : "Re-enable"}
                    </button>
                    <button disabled={busy}
                      onClick={() => { if (window.confirm(`Remove ${u.name} from the team? They lose admin access immediately.`)) start(() => removeMemberAction(u.id)); }}
                      className="text-xs font-bold text-grey hover:text-rosa-deep disabled:opacity-50">
                      Remove
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {users.length === 0 && (
              <tr><td colSpan={4} className="p-8 text-center text-grey">No team members yet — add the first above.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
