"use client";

import { useActionState } from "react";
import type {
  FaqContent,
  GiftCardsContent,
  InvestorsContent,
  ConciergeContent,
  LoyaltyContent,
  PoliciesContent,
  WhyBookContent,
} from "@/modules/settings";
import {
  saveGiftCardsAction,
  saveInvestorsAction,
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
      <label className="text-xs font-bold">SECTIONS{" "}
        <span className="font-normal text-grey">
          — a line starting with &ldquo;== &rdquo; begins a new section (its title).
          Add, remove or reorder sections freely; &ldquo;- &rdquo; makes a bullet,
          &ldquo;# &rdquo;/&ldquo;## &rdquo; make headings inside a section.
        </span>
        <textarea name="sections" rows={18} className={`${inputCls} font-mono text-xs`}
          defaultValue={content.sections.map((sec) => `== ${sec.title}\n${sec.body}`).join("\n\n")} />
      </label>
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

export function GiftCardsForm({ content }: { content: GiftCardsContent }) {
  const [state, action, pending] = useActionState(saveGiftCardsAction, initial);
  return (
    <form action={action} className="grid gap-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="text-xs font-bold">EYEBROW (small line above the title)
          <input name="eyebrow" defaultValue={content.eyebrow} className={inputCls} />
        </label>
        <label className="text-xs font-bold">TITLE
          <input name="title" defaultValue={content.title} className={inputCls} />
        </label>
      </div>
      <label className="text-xs font-bold">INTRO PARAGRAPH
        <textarea name="intro" rows={3} defaultValue={content.intro} className={inputCls} />
      </label>
      <label className="text-xs font-bold">HOW-IT-WORKS STEPS <span className="font-normal text-grey">(one per line: icon | title | text)</span>
        <textarea name="steps" rows={4} className={inputCls}
          defaultValue={content.steps.map((x) => `${x.icon} | ${x.title} | ${x.text}`).join("\n")} />
      </label>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="text-xs font-bold">AFTER-PAYMENT TITLE
          <input name="paidTitle" defaultValue={content.paidTitle} className={inputCls} />
        </label>
      </div>
      <label className="text-xs font-bold">AFTER-PAYMENT TEXT
        <textarea name="paidText" rows={3} defaultValue={content.paidText} className={inputCls} />
      </label>
      <SaveRow state={state} pending={pending} />
    </form>
  );
}

export function InvestorsForm({ content }: { content: InvestorsContent }) {
  const [state, action, pending] = useActionState(saveInvestorsAction, initial);
  const rows3 = (xs: { icon: string; title: string; text: string }[]) =>
    xs.map((x) => `${x.icon} | ${x.title} | ${x.text}`).join("\n");
  return (
    <form action={action} className="grid gap-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="text-xs font-bold">HERO TITLE
          <input name="heroTitle" defaultValue={content.heroTitle} className={inputCls} />
        </label>
        <label className="text-xs font-bold">HERO TITLE — colored part
          <input name="heroHighlight" defaultValue={content.heroHighlight} className={inputCls} />
        </label>
      </div>
      <label className="text-xs font-bold">HERO PARAGRAPH
        <textarea name="heroIntro" rows={3} defaultValue={content.heroIntro} className={inputCls} />
      </label>
      <label className="text-xs font-bold">METRICS <span className="font-normal text-grey">(one per line: Number :: label)</span>
        <textarea name="metrics" rows={3} className={inputCls}
          defaultValue={content.metrics.map((mt) => `${mt.b} :: ${mt.s}`).join("\n")} />
      </label>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="text-xs font-bold">VISION TITLE
          <input name="visionTitle" defaultValue={content.visionTitle} className={inputCls} />
        </label>
        <label className="text-xs font-bold">OPPORTUNITY TITLE
          <input name="oppTitle" defaultValue={content.oppTitle} className={inputCls} />
        </label>
      </div>
      <label className="text-xs font-bold">VISION TEXT
        <textarea name="visionText" rows={3} defaultValue={content.visionText} className={inputCls} />
      </label>
      <label className="text-xs font-bold">OPPORTUNITY TEXT
        <textarea name="oppText" rows={3} defaultValue={content.oppText} className={inputCls} />
      </label>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="text-xs font-bold">PAIN BOX TITLE
          <input name="painTitle" defaultValue={content.painTitle} className={inputCls} />
        </label>
        <label className="text-xs font-bold">PAIN POINTS <span className="font-normal text-grey">(one per line)</span>
          <textarea name="painPoints" rows={2} defaultValue={content.painPoints.join("\n")} className={inputCls} />
        </label>
      </div>
      <label className="text-xs font-bold">ADVANTAGES TITLE
        <input name="advTitle" defaultValue={content.advTitle} className={inputCls} />
      </label>
      <label className="text-xs font-bold">ADVANTAGE CARDS <span className="font-normal text-grey">(one per line: icon | title | text)</span>
        <textarea name="advantages" rows={5} defaultValue={rows3(content.advantages)} className={inputCls} />
      </label>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="text-xs font-bold">MARKET TITLE
          <input name="marketTitle" defaultValue={content.marketTitle} className={inputCls} />
        </label>
        <label className="text-xs font-bold">TREND PILLS <span className="font-normal text-grey">(one per line)</span>
          <textarea name="trends" rows={2} defaultValue={content.trends.join("\n")} className={inputCls} />
        </label>
      </div>
      <label className="text-xs font-bold">MARKET TEXT
        <textarea name="marketText" rows={2} defaultValue={content.marketText} className={inputCls} />
      </label>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="text-xs font-bold">REVENUE TITLE
          <input name="revTitle" defaultValue={content.revTitle} className={inputCls} />
        </label>
        <label className="text-xs font-bold">REVENUE INTRO
          <input name="revText" defaultValue={content.revText} className={inputCls} />
        </label>
      </div>
      <label className="text-xs font-bold">REVENUE CARDS <span className="font-normal text-grey">(one per line: icon | title | text)</span>
        <textarea name="revenue" rows={5} defaultValue={rows3(content.revenue)} className={inputCls} />
      </label>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="text-xs font-bold">GROWTH TITLE
          <input name="growthTitle" defaultValue={content.growthTitle} className={inputCls} />
        </label>
        <label className="text-xs font-bold">GROWTH NOTE
          <input name="growthNote" defaultValue={content.growthNote} className={inputCls} />
        </label>
      </div>
      <label className="text-xs font-bold">PHASES <span className="font-normal text-grey">(one per line: Phase One | Riviera Maya | description)</span>
        <textarea name="phases" rows={3} className={inputCls}
          defaultValue={content.phases.map((ph) => `${ph.p} | ${ph.title} | ${ph.text}`).join("\n")} />
      </label>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="text-xs font-bold">WHY-INVEST TITLE
          <input name="whyTitle" defaultValue={content.whyTitle} className={inputCls} />
        </label>
        <label className="text-xs font-bold">WHY-INVEST TEXT
          <input name="whyText" defaultValue={content.whyText} className={inputCls} />
        </label>
      </div>
      <label className="text-xs font-bold">WHY-INVEST CHECKLIST <span className="font-normal text-grey">(one per line)</span>
        <textarea name="whyItems" rows={4} defaultValue={content.whyItems.join("\n")} className={inputCls} />
      </label>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="text-xs font-bold">VALUES TITLE
          <input name="valuesTitle" defaultValue={content.valuesTitle} className={inputCls} />
        </label>
        <label className="text-xs font-bold">VALUES INTRO
          <input name="valuesText" defaultValue={content.valuesText} className={inputCls} />
        </label>
      </div>
      <label className="text-xs font-bold">VALUE CARDS <span className="font-normal text-grey">(one per line: icon | title | text)</span>
        <textarea name="values" rows={4} defaultValue={rows3(content.values)} className={inputCls} />
      </label>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="text-xs font-bold">ROADMAP TITLE
          <input name="roadTitle" defaultValue={content.roadTitle} className={inputCls} />
        </label>
      </div>
      <label className="text-xs font-bold">ROADMAP <span className="font-normal text-grey">(one per line: Year :: item; item; item)</span>
        <textarea name="roadmap" rows={3} className={inputCls}
          defaultValue={content.roadmap.map((tl) => `${tl.yr} :: ${tl.items.join("; ")}`).join("\n")} />
      </label>
      <label className="text-xs font-bold">INVESTOR FAQ <span className="font-normal text-grey">(one per line: Question? :: Answer)</span>
        <textarea name="faq" rows={5} className={inputCls}
          defaultValue={content.faq.map((f) => `${f.q} :: ${f.a}`).join("\n")} />
      </label>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="text-xs font-bold">CLOSING TITLE
          <input name="finalTitle" defaultValue={content.finalTitle} className={inputCls} />
        </label>
      </div>
      <label className="text-xs font-bold">CLOSING TEXT
        <textarea name="finalText" rows={2} defaultValue={content.finalText} className={inputCls} />
      </label>
      <label className="text-xs font-bold">LEGAL DISCLAIMER
        <textarea name="disclaimer" rows={3} defaultValue={content.disclaimer} className={inputCls} />
      </label>
      <SaveRow state={state} pending={pending} />
    </form>
  );
}
