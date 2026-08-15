"use client";

import { useActionState, useState, useTransition } from "react";
import type { EmailAutomation } from "@/modules/emails";
import {
  saveAutomationAction,
  toggleAutomationAction,
  addAutomationAction,
  deleteAutomationAction,
  sendTestAction,
  type EmailFormState,
} from "./actions";

const initial: EmailFormState = { ok: true, message: "" };
const inputCls =
  "w-full rounded-xl border-[1.5px] border-line bg-white px-3 py-2 text-sm outline-none focus:border-rosa";

const TRIGGERS: [string, string][] = [
  ["booking_request", "Booking request / instant booking arrives"],
  ["booking_confirmed", "Booking confirmed"],
  ["second_payment_due", "Second payment due"],
  ["payment_receipt", "Payment completed"],
  ["before_checkin", "N days before check-in"],
  ["before_checkout", "N days before check-out"],
  ["custom", "Manual / custom"],
];

const VARS = "{{guest_name}} {{guest_email}} {{listing}} {{check_in}} {{check_out}} {{guests}} {{total}} {{balance}} {{balance_due_date}} {{amount_paid}} {{invoice_link}} {{checkin_message}} {{checkout_message}} {{checkin_from}} {{checkout_until}} {{booking_kind}} {{source}}";

function AutomationCard({ a }: { a: EmailAutomation }) {
  const [open, setOpen] = useState(false);
  const [previewNonce, setPreviewNonce] = useState(0);
  const [state, action, pending] = useActionState(saveAutomationAction, initial);
  const [testState, testAction, testPending] = useActionState(sendTestAction, initial);
  const [busy, start] = useTransition();
  const timed = a.triggerEvent === "before_checkin" || a.triggerEvent === "before_checkout";

  return (
    <div className={`rounded-card bg-paper p-4 shadow-soft ${a.enabled ? "" : "opacity-60"}`}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <b>{a.name}</b>
          <span className={`ml-2 rounded-pill px-2 py-0.5 text-[10px] font-bold uppercase ${a.audience === "guest" ? "bg-rosa/15 text-rosa" : "bg-cielo/15 text-cielo"}`}>
            {a.audience === "guest" ? "to guest" : "to team"}
          </span>
          {!a.builtin && (
            <span className="ml-1 rounded-pill bg-grey/15 px-2 py-0.5 text-[10px] font-bold uppercase text-grey">custom</span>
          )}
          <div className="text-xs text-grey">
            {TRIGGERS.find(([k]) => k === a.triggerEvent)?.[1] ?? a.triggerEvent}
            {timed && ` — ${a.offsetDays} day${a.offsetDays === 1 ? "" : "s"} before`}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button disabled={busy} onClick={() => start(() => toggleAutomationAction(a.id))}
            className={`rounded-pill border-[1.5px] px-3 py-1 text-xs font-bold disabled:opacity-50 ${a.enabled ? "border-cactus text-cactus" : "border-line text-grey"}`}>
            {a.enabled ? "On" : "Off"}
          </button>
          <button onClick={() => setOpen((v) => !v)}
            className="rounded-pill border-[1.5px] border-line px-3 py-1 text-xs font-bold text-grey hover:border-ink hover:text-ink">
            {open ? "Close" : "Edit & preview"}
          </button>
          {!a.builtin && (
            <button disabled={busy} onClick={() => start(() => deleteAutomationAction(a.id))}
              className="rounded-pill border-[1.5px] border-line px-3 py-1 text-xs font-bold text-grey hover:border-rosa hover:text-rosa-deep disabled:opacity-50">
              Delete
            </button>
          )}
        </div>
      </div>

      {open && (
        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          <div className="grid content-start gap-3">
            <form action={action} className="grid gap-2">
              <input type="hidden" name="id" value={a.id} />
              <label className="text-xs font-bold">SUBJECT
                <input name="subject" defaultValue={a.subject} required className={inputCls} />
              </label>
              {timed && (
                <label className="text-xs font-bold">DAYS BEFORE
                  <input name="offsetDays" type="number" min="0" defaultValue={a.offsetDays} className={`${inputCls} w-28`} />
                </label>
              )}
              {!timed && <input type="hidden" name="offsetDays" value={a.offsetDays} />}
              <label className="text-xs font-bold">MESSAGE <span className="font-normal text-grey">(blank line = new paragraph, “- ” = highlighted list)</span>
                <textarea name="body" rows={12} defaultValue={a.body} required className={`${inputCls} font-mono text-xs`} />
              </label>
              <div className="text-[11px] leading-5 text-grey">
                Variables: <span className="font-mono">{VARS}</span>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <button disabled={pending}
                  className="rounded-pill bg-rosa px-5 py-2 text-sm font-bold text-white disabled:opacity-50">
                  {pending ? "Saving…" : "Save"}
                </button>
                <button type="button" onClick={() => setPreviewNonce((x) => x + 1)}
                  className="rounded-pill border-[1.5px] border-line px-4 py-2 text-sm font-bold text-grey hover:border-ink hover:text-ink">
                  Refresh preview
                </button>
                {state.message && (
                  <span className={`text-sm font-semibold ${state.ok ? "text-cactus" : "text-rosa-deep"}`}>{state.message}</span>
                )}
              </div>
            </form>
            <form action={testAction} className="flex items-end gap-2 border-t border-line pt-3">
              <input type="hidden" name="key" value={a.key} />
              <label className="grow text-xs font-bold">SEND A TEST TO
                <input name="to" type="email" placeholder="you@email.com" className={inputCls} />
              </label>
              <button disabled={testPending}
                className="whitespace-nowrap rounded-pill border-[1.5px] border-rosa px-4 py-2 text-sm font-bold text-rosa hover:bg-rosa hover:text-white disabled:opacity-50">
                {testPending ? "Sending…" : "Send test"}
              </button>
            </form>
            {testState.message && (
              <span className={`text-sm font-semibold ${testState.ok ? "text-cactus" : "text-rosa-deep"}`}>{testState.message}</span>
            )}
          </div>

          <div>
            <div className="mb-1 text-[11px] font-extrabold uppercase tracking-wider text-grey">
              Live preview (sample data — save first, then refresh)
            </div>
            <iframe key={previewNonce} src={`/admin/emails/preview?key=${a.key}&n=${previewNonce}`}
              className="h-[520px] w-full rounded-xl border-[1.5px] border-line bg-white" />
          </div>
        </div>
      )}
    </div>
  );
}

export function EmailsClient({ automations }: { automations: EmailAutomation[] }) {
  const [addState, addAction, addPending] = useActionState(addAutomationAction, initial);
  const guest = automations.filter((a) => a.audience === "guest");
  const admin = automations.filter((a) => a.audience === "admin");

  return (
    <div className="grid gap-6">
      <div>
        <div className="mb-2 text-[11px] font-extrabold uppercase tracking-wider text-grey">Guest emails</div>
        <div className="grid gap-3">{guest.map((a) => <AutomationCard key={a.id} a={a} />)}</div>
      </div>
      <div>
        <div className="mb-2 text-[11px] font-extrabold uppercase tracking-wider text-grey">Team emails</div>
        <div className="grid gap-3">{admin.map((a) => <AutomationCard key={a.id} a={a} />)}</div>
      </div>

      <div className="rounded-card bg-paper p-4 shadow-soft">
        <div className="mb-3 text-[11px] font-extrabold uppercase tracking-wider text-grey">Add an automation</div>
        <form action={addAction} className="grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
          <input name="name" required placeholder="Name (e.g. Review request)" className={inputCls} />
          <select name="audience" className={inputCls}>
            <option value="guest">To the guest</option>
            <option value="admin">To the team</option>
          </select>
          <select name="trigger" className={inputCls}>
            {TRIGGERS.map(([k, label]) => <option key={k} value={k}>{label}</option>)}
          </select>
          <input name="offsetDays" type="number" min="0" placeholder="Days (timed only)" className={inputCls} />
          <input name="subject" required placeholder="Subject" className={inputCls} />
          <textarea name="body" rows={3} placeholder="Message… (variables work here too)" className={`${inputCls} sm:col-span-2 lg:col-span-4`} />
          <button disabled={addPending}
            className="rounded-pill bg-rosa px-4 py-2 text-sm font-bold text-white disabled:opacity-50">
            {addPending ? "Creating…" : "+ Create"}
          </button>
        </form>
        {addState.message && (
          <p className={`mt-2 text-sm font-semibold ${addState.ok ? "text-cactus" : "text-rosa-deep"}`}>{addState.message}</p>
        )}
      </div>
    </div>
  );
}
