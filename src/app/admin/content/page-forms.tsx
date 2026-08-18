"use client";

import { useActionState } from "react";
import type {
  FaqContent,
  ConciergeContent,
  LoyaltyContent,
  PoliciesContent,
  WhyBookContent,
} from "@/modules/settings";
import {
  savePoliciesAction,
  saveWhyAction,
  saveConciergeAction,
  saveLoyaltyAction,
  saveFaqAction,
  type ContentFormState,
} from "./actions";

const initial: ContentFormState = { ok: true, message: "" };
const inputCls =
  "w-full rounded-xl border-[1.5px] border-line bg-white px-3 py-2.5 text-sm outline-none focus:border-rosa";

function Hero({ hero }: { hero: { eyebrow: string; title: string; intro: string } }) {
  return (
    <div className="grid gap-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="text-xs font-bold">EYEBROW (small line above the title)
          <input name="eyebrow" defaultValue={hero.eyebrow} className={inputCls} />
        </label>
        <label className="text-xs font-bold">PAGE TITLE
          <input name="title" defaultValue={hero.title} className={inputCls} />
        </label>
      </div>
      <label className="text-xs font-bold">INTRO PARAGRAPH
        <textarea name="intro" rows={2} defaultValue={hero.intro} className={inputCls} />
      </label>
    </div>
  );
}

function SaveRow({ state, pending }: { state: ContentFormState; pending: boolean }) {
  return (
    <div className="flex items-center gap-3">
      <button disabled={pending}
        className="rounded-pill bg-rosa px-6 py-2.5 text-sm font-bold text-white disabled:opacity-50">
        {pending ? "Saving…" : "Save & publish"}
      </button>
      {state.message && (
        <span className={`text-sm font-semibold ${state.ok ? "text-cactus" : "text-rosa-deep"}`}>{state.message}</span>
      )}
    </div>
  );
}

export function PoliciesForm({ content }: { content: PoliciesContent }) {
  const [state, action, pending] = useActionState(savePoliciesAction, initial);
  return (
    <form action={action} className="grid gap-4">
      <Hero hero={content.hero} />
      {content.sections.map((sec, i) => (
        <div key={sec.id} className="grid gap-2 border-t border-line pt-3">
          <label className="text-xs font-bold">SECTION TITLE
            <input name={`sec_title_${i}`} defaultValue={sec.title} className={inputCls} />
          </label>
          <label className="text-xs font-bold">BODY <span className="font-normal text-grey">(start a line with “- ” for a bullet)</span>
            <textarea name={`sec_body_${i}`} rows={4} defaultValue={sec.body} className={inputCls} />
          </label>
        </div>
      ))}
      <SaveRow state={state} pending={pending} />
    </form>
  );
}

export function WhyForm({ content }: { content: WhyBookContent }) {
  const [state, action, pending] = useActionState(saveWhyAction, initial);
  return (
    <form action={action} className="grid gap-4">
      <Hero hero={content.hero} />
      <label className="text-xs font-bold">CARDS <span className="font-normal text-grey">(one per line: icon | title | text)</span>
        <textarea name="cards" rows={7} className={inputCls}
          defaultValue={content.cards.map((c) => `${c.icon} | ${c.title} | ${c.text}`).join("\n")} />
      </label>
      <SaveRow state={state} pending={pending} />
    </form>
  );
}

export function ConciergeForm({ content }: { content: ConciergeContent }) {
  const [state, action, pending] = useActionState(saveConciergeAction, initial);
  return (
    <form action={action} className="grid gap-4">
      <Hero hero={content.hero} />
      <label className="text-xs font-bold">SERVICES <span className="font-normal text-grey">(one per line: icon | title | tagline | item, item, item | note — note is optional)</span>
        <textarea name="services" rows={12} className={inputCls}
          defaultValue={content.services
            .map((s) => `${s.icon} | ${s.title} | ${s.tag} | ${s.items.join(", ")}${s.note ? ` | ${s.note}` : ""}`)
            .join("\n")} />
      </label>
      <label className="text-xs font-bold">“WHY CHOOSE US” POINTS <span className="font-normal text-grey">(comma-separated)</span>
        <input name="why" defaultValue={content.why.join(", ")} className={inputCls} />
      </label>
      <label className="text-xs font-bold">HOW-IT-WORKS STEPS <span className="font-normal text-grey">(one per line: title :: description)</span>
        <textarea name="steps" rows={4} className={inputCls}
          defaultValue={content.steps.map((s) => `${s.title} :: ${s.text}`).join("\n")} />
      </label>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="text-xs font-bold">CLOSING BLOCK TITLE
          <input name="uniqueTitle" defaultValue={content.uniqueTitle} className={inputCls} />
        </label>
      </div>
      <label className="text-xs font-bold">CLOSING BLOCK TEXT
        <textarea name="uniqueText" rows={3} defaultValue={content.uniqueText} className={inputCls} />
      </label>
      <SaveRow state={state} pending={pending} />
    </form>
  );
}

export function LoyaltyForm({ content }: { content: LoyaltyContent }) {
  const [state, action, pending] = useActionState(saveLoyaltyAction, initial);
  return (
    <form action={action} className="grid gap-4">
      <Hero hero={content.hero} />
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="text-xs font-bold">STEP 1 TITLE
          <input name="step1Title" defaultValue={content.step1Title} className={inputCls} />
        </label>
        <label className="text-xs font-bold">STEP 1 TEXT
          <input name="step1Text" defaultValue={content.step1Text} className={inputCls} />
        </label>
        <label className="text-xs font-bold">FRIEND AMOUNT (e.g. $100)
          <input name="friendAmount" defaultValue={content.friendAmount} className={inputCls} />
        </label>
        <label className="text-xs font-bold">FRIEND CARD TITLE
          <input name="friendTitle" defaultValue={content.friendTitle} className={inputCls} />
        </label>
      </div>
      <label className="text-xs font-bold">FRIEND CARD TEXT
        <input name="friendText" defaultValue={content.friendText} className={inputCls} />
      </label>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="text-xs font-bold">YOUR AMOUNT (e.g. $200)
          <input name="youAmount" defaultValue={content.youAmount} className={inputCls} />
        </label>
        <label className="text-xs font-bold">YOUR CARD TITLE
          <input name="youTitle" defaultValue={content.youTitle} className={inputCls} />
        </label>
      </div>
      <label className="text-xs font-bold">YOUR CARD TEXT
        <input name="youText" defaultValue={content.youText} className={inputCls} />
      </label>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="text-xs font-bold">BANNER TITLE
          <input name="bandTitle" defaultValue={content.bandTitle} className={inputCls} />
        </label>
      </div>
      <label className="text-xs font-bold">BANNER TEXT
        <input name="bandText" defaultValue={content.bandText} className={inputCls} />
      </label>
      <SaveRow state={state} pending={pending} />
    </form>
  );
}

export function FaqForm({ content }: { content: FaqContent }) {
  const [state, action, pending] = useActionState(saveFaqAction, initial);
  return (
    <form action={action} className="grid gap-4">
      <Hero hero={content.hero} />
      <label className="text-xs font-bold">QUESTIONS <span className="font-normal text-grey">(one per line: Question? :: Answer)</span>
        <textarea name="items" rows={12} className={inputCls}
          defaultValue={content.items.map((f) => `${f.q} :: ${f.a}`).join("\n")} />
      </label>
      <SaveRow state={state} pending={pending} />
    </form>
  );
}
