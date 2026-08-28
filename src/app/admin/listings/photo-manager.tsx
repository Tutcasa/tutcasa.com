"use client";

import { useRef, useState, useTransition } from "react";
import { uploadPhotoAction, deletePhotoAction, movePhotoAction, makeCoverPhotoAction } from "./actions";

export interface AdminPhoto { id: string; url: string; alt: string }

export function PhotoManager({
  listingId,
  photos,
  uploadsReady,
}: {
  listingId: string;
  photos: AdminPhoto[];
  uploadsReady: boolean;
}) {
  const formRef = useRef<HTMLFormElement>(null);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, start] = useTransition();

  function upload(formData: FormData) {
    setMsg(null);
    start(async () => {
      const res = await uploadPhotoAction(formData);
      setMsg({ ok: res.ok, text: res.message });
      if (res.ok) formRef.current?.reset();
    });
  }

  return (
    <div className="mt-6 border-t border-line pt-5">
      <h3 className="mb-3 font-display text-base font-bold">Photos</h3>

      {photos.length > 0 ? (
        <>
        <p className="mb-2 text-xs text-grey">
          The FIRST photo is the cover (cards, homepage, search). Use the
          arrows to arrange, ★ to make a photo the cover.
        </p>
        <div className="mb-4 grid grid-cols-3 gap-2 sm:grid-cols-4">
          {photos.map((p, i) => (
            <div key={p.id} className="relative overflow-hidden rounded-xl border border-line">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={p.url} alt={p.alt} className="h-24 w-full object-cover" />
              {i === 0 && (
                <span className="absolute left-1.5 top-1.5 rounded-pill bg-rosa px-2 py-0.5 text-[10px] font-bold text-white">COVER</span>
              )}
              <button
                type="button"
                aria-label="Delete photo"
                title="Delete photo"
                disabled={busy}
                onClick={() => {
                  if (!confirm("Delete this photo? It disappears from the website immediately and can't be undone.")) return;
                  start(async () => { await deletePhotoAction(p.id); });
                }}
                className="absolute right-1.5 top-1.5 flex h-7 w-7 items-center justify-center rounded-full bg-ink/70 text-sm text-white hover:bg-rosa disabled:opacity-50"
              >
                🗑
              </button>
              <div className="absolute bottom-1.5 left-1.5 right-1.5 flex justify-between gap-1">
                <button type="button" aria-label="Move photo earlier" title="Move earlier" disabled={busy || i === 0}
                  onClick={() => start(async () => { await movePhotoAction(p.id, "up"); })}
                  className="flex h-6 w-6 items-center justify-center rounded-full bg-ink/70 text-xs text-white hover:bg-rosa disabled:opacity-30">←</button>
                {i !== 0 && (
                  <button type="button" aria-label="Make cover photo" title="Make cover" disabled={busy}
                    onClick={() => start(async () => { await makeCoverPhotoAction(p.id); })}
                    className="flex h-6 items-center justify-center rounded-full bg-ink/70 px-2 text-xs text-white hover:bg-rosa disabled:opacity-30">★ cover</button>
                )}
                <button type="button" aria-label="Move photo later" title="Move later" disabled={busy || i === photos.length - 1}
                  onClick={() => start(async () => { await movePhotoAction(p.id, "down"); })}
                  className="flex h-6 w-6 items-center justify-center rounded-full bg-ink/70 text-xs text-white hover:bg-rosa disabled:opacity-30">→</button>
              </div>
            </div>
          ))}
        </div>
        </>
      ) : (
        <p className="mb-4 text-sm text-grey">
          No photos yet — guests currently see colored placeholders. The first
          photo you add becomes the card image everywhere.
        </p>
      )}

      {uploadsReady ? (
        <form ref={formRef} action={upload} className="flex flex-wrap items-center gap-2">
          <input type="hidden" name="listingId" value={listingId} />
          <input
            type="file" name="photo" accept="image/jpeg,image/png,image/webp,image/avif"
            multiple required className="text-sm"
          />
          <input
            type="text" name="alt" placeholder="Label (e.g. Living room)"
            className="rounded-xl border-[1.5px] border-line px-3 py-2 text-sm outline-none focus:border-rosa"
          />
          <button
            disabled={busy}
            className="rounded-pill bg-rosa px-5 py-2 text-sm font-bold text-white disabled:opacity-50"
          >
            {busy ? "Uploading…" : "Upload photo"}
          </button>
        </form>
      ) : (
        <p className="rounded-xl bg-sol/10 px-3 py-2.5 text-sm font-semibold text-terra">
          ⚠ To activate uploads, paste your Supabase <b>service role key</b>{" "}
          (Project Settings → API keys → <code>service_role</code> secret) into{" "}
          <code>.env.local</code> as <code>SUPABASE_SERVICE_ROLE_KEY</code>.
        </p>
      )}
      {msg && (
        <p className={`mt-2 text-sm font-semibold ${msg.ok ? "text-cactus" : "text-rosa-deep"}`}>
          {msg.text}
        </p>
      )}
    </div>
  );
}
