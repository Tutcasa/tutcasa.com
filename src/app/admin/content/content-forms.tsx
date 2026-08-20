"use client";

import { useActionState } from "react";
import { saveContactAction, saveFamilyAction, saveFxAction, saveGoogleReviewsAction, saveListPropertyAction, uploadDeckAction, type ContentFormState } from "./actions";
import type { ContactSettings, FamilyContent, InvestorSettings, ListPropertyContent } from "@/modules/settings";

const initial: ContentFormState = { ok: true, message: "" };
const inputCls =
  "w-full rounded-xl border-[1.5px] border-line bg-white px-3 py-2.5 text-sm outline-none focus:border-rosa";

export function ContactForm({ contact }: { contact: ContactSettings }) {
  const [state, action, pending] = useActionState(saveContactAction, initial);
  return (
    <form action={action} className="grid gap-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="text-xs font-bold">WHATSAPP (digits only, with country code)
          <input name="whatsapp" defaultValue={contact.whatsapp} className={inputCls} />
        </label>
        <label className="text-xs font-bold">CONTACT EMAIL
          <input name="email" type="email" defaultValue={contact.email} className={inputCls} />
        </label>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="text-xs font-bold">INSTAGRAM URL
          <input name="instagram" defaultValue={contact.instagram} className={inputCls} />
        </label>
        <label className="text-xs font-bold">FACEBOOK URL
          <input name="facebook" defaultValue={contact.facebook} className={inputCls} />
        </label>
      </div>
      {state.message && (
        <p className={`text-sm font-semibold ${state.ok ? "text-cactus" : "text-rosa-deep"}`}>{state.message}</p>
      )}
      <button disabled={pending}
        className="w-fit rounded-pill bg-rosa px-6 py-2.5 text-sm font-bold text-white disabled:opacity-50">
        {pending ? "Saving…" : "Save contact info"}
      </button>
    </form>
  );
}

export function DeckForm({ investor }: { investor: InvestorSettings }) {
  const [state, action, pending] = useActionState(uploadDeckAction, initial);
  return (
    <form action={action} className="grid gap-3">
      {investor.deck_url ? (
        <p className="text-sm">
          Current deck:{" "}
          <a href={investor.deck_url} target="_blank" rel="noopener"
             className="font-semibold text-rosa hover:underline">
            {investor.deck_name || "investor-deck.pdf"} ↗
          </a>
        </p>
      ) : (
        <p className="text-sm text-grey">No deck uploaded yet.</p>
      )}
      <div className="flex flex-wrap items-center gap-2">
        <input type="file" name="deck" accept="application/pdf" required className="text-sm" />
        <button disabled={pending}
          className="rounded-pill bg-rosa px-5 py-2 text-sm font-bold text-white disabled:opacity-50">
          {pending ? "Uploading…" : investor.deck_url ? "Replace PDF" : "Upload PDF"}
        </button>
      </div>
      {state.message && (
        <p className={`text-sm font-semibold ${state.ok ? "text-cactus" : "text-rosa-deep"}`}>{state.message}</p>
      )}
      <p className="text-xs text-grey">
        Uploading a new PDF replaces the old one — the &ldquo;Request investor
        deck&rdquo; flow always serves the latest file.
      </p>
    </form>
  );
}

export function FxForm({ fx }: { fx: { mxnPerUsd: number; cadPerUsd: number } }) {
  const [state, action, pending] = useActionState(saveFxAction, initial);
  return (
    <form action={action} className="grid gap-3">
      <p className="text-xs text-grey">
        Display conversion only — guests are always charged in the home&apos;s own
        currency. These rates convert what the currency switcher shows.
      </p>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="text-xs font-bold">MXN PER 1 USD
          <input name="mxnPerUsd" type="number" step="0.01" min="0.01" defaultValue={fx.mxnPerUsd} className={inputCls} />
        </label>
        <label className="text-xs font-bold">CAD PER 1 USD
          <input name="cadPerUsd" type="number" step="0.01" min="0.01" defaultValue={fx.cadPerUsd} className={inputCls} />
        </label>
      </div>
      <div className="flex items-center gap-3">
        <button disabled={pending}
          className="rounded-pill bg-rosa px-6 py-2.5 text-sm font-bold text-white disabled:opacity-50">
          {pending ? "Saving…" : "Save rates"}
        </button>
        {state.message && (
          <span className={`text-sm font-semibold ${state.ok ? "text-cactus" : "text-rosa-deep"}`}>{state.message}</span>
        )}
      </div>
    </form>
  );
}

export function GoogleReviewsForm({
  placeId,
  cache,
}: {
  placeId: string;
  cache: { fetchedAt: string | null; rating: number; total: number; reviews: unknown[] };
}) {
  const [state, action, pending] = useActionState(saveGoogleReviewsAction, initial);
  return (
    <form action={action} className="grid gap-3">
      <p className="text-xs text-grey">
        Shows your REAL Google reviews on the homepage, refreshed daily. Two
        things are needed: the business&apos;s <b>Place ID</b> (find it at
        Google&apos;s “Place ID Finder”) and a <b>GOOGLE_MAPS_API_KEY</b> in the
        server environment (Google Cloud key with the Places API enabled).
      </p>
      <label className="text-xs font-bold">GOOGLE PLACE ID
        <input name="placeId" defaultValue={placeId} placeholder="e.g. ChIJN1t_tDeuEmsRUsoyG83frY4" className={inputCls} />
      </label>
      {cache.fetchedAt && (
        <p className="text-xs font-semibold text-cactus">
          Last sync: {new Date(cache.fetchedAt).toLocaleString()} — rating {cache.rating} from {cache.total} reviews, {cache.reviews.length} shown.
        </p>
      )}
      <div className="flex items-center gap-3">
        <button disabled={pending}
          className="rounded-pill bg-rosa px-6 py-2.5 text-sm font-bold text-white disabled:opacity-50">
          {pending ? "Syncing…" : "Save & sync now"}
        </button>
        {state.message && (
          <span className={`text-sm font-semibold ${state.ok ? "text-cactus" : "text-rosa-deep"}`}>{state.message}</span>
        )}
      </div>
    </form>
  );
}

function StatsRow({ stats }: { stats: { big: string; label: string }[] }) {
  return (
    <div className="grid gap-3 sm:grid-cols-3">
      {stats.map((st, i) => (
        <div key={i} className="grid gap-2">
          <label className="text-xs font-bold">STAT {i + 1} NUMBER
            <input name={`stat_big_${i}`} defaultValue={st.big} className={inputCls} />
          </label>
          <label className="text-xs font-bold">STAT {i + 1} LABEL
            <input name={`stat_label_${i}`} defaultValue={st.label} className={inputCls} />
          </label>
        </div>
      ))}
    </div>
  );
}

const emptyHint = (
  <p className="text-xs text-grey">
    Leave a field empty to keep the built-in text (which is translated EN/FR/ES).
    Anything you type here shows in ALL languages.
  </p>
);

export function ListPropertyForm({ content }: { content: ListPropertyContent }) {
  const [state, action, pending] = useActionState(saveListPropertyAction, initial);
  return (
    <form action={action} className="grid gap-3">
      {emptyHint}
      <label className="text-xs font-bold">PAGE TITLE
        <input name="title" defaultValue={content.title} className={inputCls} />
      </label>
      <label className="text-xs font-bold">INTRO
        <textarea name="intro" rows={2} defaultValue={content.intro} className={inputCls} />
      </label>
      <StatsRow stats={content.stats} />
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="text-xs font-bold">FORM TITLE
          <input name="formTitle" defaultValue={content.formTitle} className={inputCls} />
        </label>
        <label className="text-xs font-bold">FORM INTRO
          <input name="formIntro" defaultValue={content.formIntro} className={inputCls} />
        </label>
      </div>
      <label className="text-xs font-bold">EXTRA FORM QUESTIONS{" "}
        <span className="font-normal text-grey">
          (one per line: &ldquo;Question | text&rdquo;, &ldquo;Question | textarea&rdquo;, or
          &ldquo;Question | checkboxes | option1, option2&rdquo; — answers arrive in admin → Leads)
        </span>
        <textarea name="extraFields" rows={4} className={inputCls}
          placeholder={"Which amenities does your home have? | checkboxes | Pool, Gym, Beach access\nHOA / building rules we should know? | textarea"}
          defaultValue={content.extraFields.map((f) =>
            f.kind === "checkboxes" ? `${f.label} | checkboxes | ${f.options.join(", ")}` : `${f.label} | ${f.kind}`,
          ).join("\n")} />
      </label>
      <div className="flex items-center gap-3">
        <button disabled={pending}
          className="rounded-pill bg-rosa px-6 py-2.5 text-sm font-bold text-white disabled:opacity-50">
          {pending ? "Saving…" : "Save & publish"}
        </button>
        {state.message && (
          <span className={`text-sm font-semibold ${state.ok ? "text-cactus" : "text-rosa-deep"}`}>{state.message}</span>
        )}
      </div>
    </form>
  );
}

export function FamilyForm({ content }: { content: FamilyContent }) {
  const [state, action, pending] = useActionState(saveFamilyAction, initial);
  return (
    <form action={action} className="grid gap-3">
      {emptyHint}
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="text-xs font-bold">EYEBROW
          <input name="eyebrow" defaultValue={content.eyebrow} className={inputCls} />
        </label>
        <label className="text-xs font-bold">PAGE TITLE
          <input name="title" defaultValue={content.title} className={inputCls} />
        </label>
      </div>
      <label className="text-xs font-bold">INTRO
        <textarea name="intro" rows={2} defaultValue={content.intro} className={inputCls} />
      </label>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="text-xs font-bold">STORY TAG
          <input name="tag" defaultValue={content.tag} className={inputCls} />
        </label>
        <label className="text-xs font-bold">STORY TITLE
          <input name="storyTitle" defaultValue={content.storyTitle} className={inputCls} />
        </label>
      </div>
      <label className="text-xs font-bold">STORY — PARAGRAPH 1
        <textarea name="p1" rows={2} defaultValue={content.p1} className={inputCls} />
      </label>
      <label className="text-xs font-bold">STORY — PARAGRAPH 2
        <textarea name="p2" rows={2} defaultValue={content.p2} className={inputCls} />
      </label>
      <label className="text-xs font-bold">STORY — PARAGRAPH 3
        <textarea name="p3" rows={2} defaultValue={content.p3} className={inputCls} />
      </label>
      <label className="text-xs font-bold">SIGNATURE LINE
        <input name="sign" defaultValue={content.sign} className={inputCls} />
      </label>
      <StatsRow stats={content.stats} />
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="text-xs font-bold">VALUES SECTION TITLE
          <input name="valuesTitle" defaultValue={content.valuesTitle} className={inputCls} />
        </label>
        <label className="text-xs font-bold">VALUES SECTION SUBTITLE
          <input name="valuesSub" defaultValue={content.valuesSub} className={inputCls} />
        </label>
      </div>
      {content.values.map((v, i) => (
        <div key={i} className="grid gap-3 sm:grid-cols-[80px_1fr_2fr]">
          <label className="text-xs font-bold">ICON
            <input name={`val_icon_${i}`} defaultValue={v.icon} className={inputCls} />
          </label>
          <label className="text-xs font-bold">VALUE {i + 1} TITLE
            <input name={`val_title_${i}`} defaultValue={v.title} className={inputCls} />
          </label>
          <label className="text-xs font-bold">VALUE {i + 1} TEXT
            <input name={`val_text_${i}`} defaultValue={v.text} className={inputCls} />
          </label>
        </div>
      ))}
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="text-xs font-bold">CLOSING BANNER TITLE
          <input name="ctaTitle" defaultValue={content.ctaTitle} className={inputCls} />
        </label>
        <label className="text-xs font-bold">CLOSING BANNER TEXT
          <input name="ctaText" defaultValue={content.ctaText} className={inputCls} />
        </label>
      </div>
      <div className="flex items-center gap-3">
        <button disabled={pending}
          className="rounded-pill bg-rosa px-6 py-2.5 text-sm font-bold text-white disabled:opacity-50">
          {pending ? "Saving…" : "Save & publish"}
        </button>
        {state.message && (
          <span className={`text-sm font-semibold ${state.ok ? "text-cactus" : "text-rosa-deep"}`}>{state.message}</span>
        )}
      </div>
    </form>
  );
}
