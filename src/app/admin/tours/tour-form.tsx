"use client";

import { useActionState } from "react";
import { saveTourAction, type TourFormState } from "./actions";
import { uploadTourPhotoAction } from "../listings/actions";
import { compressPhoto } from "../listings/photo-manager";
import type { Tour } from "@/modules/tours";

const initial: TourFormState = { ok: true, message: "" };

function TourPhotoUpload({ tourId }: { tourId: string }) {
  const [state, action, pending] = useActionState(
    async (_prev: TourFormState, fd: FormData) => {
      // shrink in the browser first — the host rejects >4.5 MB requests
      const file = fd.get("photo") as File | null;
      if (file && file.size > 0) fd.set("photo", await compressPhoto(file));
      return uploadTourPhotoAction(fd);
    }, initial);
  return (
    <form action={action} className="flex items-center gap-2">
      <input type="hidden" name="tourId" value={tourId} />
      <input type="file" name="photo" accept="image/jpeg,image/png,image/webp,image/avif" required className="text-sm" />
      <button disabled={pending}
        className="rounded-pill bg-rosa px-4 py-1.5 text-sm font-bold text-white disabled:opacity-50">
        {pending ? "Uploading…" : "Upload"}
      </button>
      {state.message && <span className={`text-xs font-semibold ${state.ok ? "text-cactus" : "text-rosa-deep"}`}>{state.message}</span>}
    </form>
  );
}

export function TourForm({ tour }: { tour?: Tour }) {
  const [state, action, pending] = useActionState(saveTourAction, initial);
  const inputCls =
    "w-full rounded-xl border-[1.5px] border-line bg-white px-3 py-2.5 text-sm outline-none focus:border-rosa";

  return (
    <form action={action} className="grid gap-3">
      {tour && <input type="hidden" name="id" value={tour.id} />}
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="text-xs font-bold">TITLE *
          <input name="title" required defaultValue={tour?.title} className={inputCls} />
        </label>
        <label className="text-xs font-bold">SUBTITLE
          <input name="subtitle" defaultValue={tour?.subtitle ?? ""} className={inputCls} />
        </label>
      </div>
      <div className="grid gap-3 sm:grid-cols-4">
        <label className="text-xs font-bold">CITY
          <input name="city" defaultValue={tour?.city ?? ""} className={inputCls} />
        </label>
        <label className="text-xs font-bold">DURATION LABEL
          <input name="durationLabel" placeholder="e.g. Full day" defaultValue={tour?.durationLabel} className={inputCls} />
        </label>
        <label className="text-xs font-bold">PRICE (per person) *
          <input name="priceMXN" type="number" min="0" step="1" required
                 defaultValue={tour ? tour.priceCents / 100 : ""} className={inputCls} />
        </label>
        <label className="text-xs font-bold">CURRENCY
          <select name="currency" defaultValue={tour?.currency ?? "MXN"} className={inputCls}
            disabled={tour?.source === "amanah"}>
            <option value="MXN">MXN</option>
            <option value="USD">USD</option>
          </select>
        </label>
      </div>
      <label className="text-xs font-bold">DESCRIPTION
        <textarea name="description" rows={3} defaultValue={tour?.description} className={inputCls} />
      </label>
      {tour && (
        <div className="text-xs font-bold">COVER PHOTO
          <div className="mt-1 flex items-center gap-3 font-normal">
            {tour.photoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={tour.photoUrl} alt="" className="h-16 w-24 rounded-lg object-cover" />
            ) : (
              <span className="text-grey">No photo yet</span>
            )}
            <TourPhotoUpload tourId={tour.id} />
          </div>
          {tour.source === "amanah" && (
            <p className="mt-1 text-[11px] font-normal text-grey">
              Heads-up: this tour syncs from Amanah — their photo returns on the next sync.
            </p>
          )}
        </div>
      )}
      <div className="grid gap-3 sm:grid-cols-4">
        <label className="text-xs font-bold">MIN GROUP
          <input name="minGroup" type="number" min="1" defaultValue={tour?.minGroup ?? 1} className={inputCls} />
        </label>
        <label className="text-xs font-bold">MAX GROUP
          <input name="maxGroup" type="number" min="1" defaultValue={tour?.maxGroup ?? 12} className={inputCls} />
        </label>
        <label className="text-xs font-bold">TYPE
          <select name="category" defaultValue={tour?.category ?? "tour"} className={inputCls}>
            <option value="tour">Tour</option>
            <option value="park">Park</option>
          </select>
        </label>
        <label className="text-xs font-bold">STATUS
          <select name="status" defaultValue={tour?.status ?? "published"} className={inputCls}>
            <option value="published">Published</option>
            <option value="draft">Draft</option>
            <option value="archived">Archived</option>
          </select>
        </label>
      </div>
      {state.message && (
        <p className={`text-sm font-semibold ${state.ok ? "text-cactus" : "text-rosa-deep"}`}>{state.message}</p>
      )}
      <button
        disabled={pending}
        className="w-fit rounded-pill bg-rosa px-6 py-2.5 text-sm font-bold text-white disabled:opacity-50"
      >
        {pending ? "Saving…" : tour ? "Save changes" : "Add tour"}
      </button>
    </form>
  );
}
