"use client";

import { useActionState } from "react";
import { saveListingAction, type ListingFormState } from "./actions";

export interface AdminListing {
  id: string;
  slug: string;
  title: string;
  headline: string;
  city: string;
  country: string;
  region: string;
  propertyType: string;
  description: string;
  maxGuests: number;
  bedrooms: number;
  bathrooms: number;
  minStay: number;
  status: string;
  sizeSqft: number | null;
  bedTypes: { count: number; type: string }[];
  checkinFrom: string;
  checkoutUntil: string;
  lat: number | null;
  lng: number | null;
  address: string | null;
  amenities: string[];
  houseRules: string;
  featured: boolean;
  instantBook: boolean;
  keepCalendarClean: boolean;
  affiliateUrl: string;
  notifyEmails: string[];
  cancellationPolicy: string;
  otherRules: string;
  faqs: { q: string; a: string }[];
  checkinMessage: string;
  checkoutMessage: string;
  privateNotes: string;
  allowChildren: boolean;
  allowSmoking: boolean;
  allowParty: boolean;
  allowPets: boolean;
  rating: number;
  reviewCount: number;
  nightlyCents: number;
}

const initial: ListingFormState = { ok: true, message: "" };

const inputCls =
  "w-full rounded-xl border-[1.5px] border-line bg-white px-3 py-2.5 text-sm outline-none focus:border-rosa";
const sectionCls = "border-t border-line pt-4 mt-2";
const sectionTitleCls =
  "mb-3 text-[11px] font-extrabold uppercase tracking-wider text-grey";

function Check({
  name, label, defaultChecked,
}: { name: string; label: string; defaultChecked: boolean }) {
  return (
    <label className="flex items-center gap-2 text-sm font-semibold">
      <input type="checkbox" name={name} defaultChecked={defaultChecked}
             className="h-4 w-4 accent-rosa" />
      {label}
    </label>
  );
}

export function ListingForm({ listing }: { listing: AdminListing }) {
  const [state, action, pending] = useActionState(saveListingAction, initial);

  return (
    <form action={action} className="grid gap-3">
      <input type="hidden" name="id" value={listing.id} />

      {/* ------------------------------------------------ basics */}
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="text-xs font-bold">TITLE *
          <input name="title" required defaultValue={listing.title} className={inputCls} />
        </label>
        <label className="text-xs font-bold">CARD TAG
          <input name="headline" defaultValue={listing.headline} placeholder="e.g. Oceanfront" className={inputCls} />
        </label>
      </div>
      <div className="grid gap-3 sm:grid-cols-4">
        <label className="text-xs font-bold">CITY
          <input name="city" defaultValue={listing.city} className={inputCls} />
        </label>
        <label className="text-xs font-bold">COUNTRY <span className="font-normal text-grey">(2-letter code)</span>
          <input name="country" defaultValue={listing.country} maxLength={2}
                 list="tc-countries" className={`${inputCls} uppercase`}
                 pattern="[A-Za-z]{2}" title="Two-letter country code, e.g. MX" />
          <datalist id="tc-countries">
            <option value="MX">Mexico</option>
            <option value="EG">Egypt</option>
            <option value="US">USA</option>
            <option value="CA">Canada</option>
            <option value="DO">Dominican Republic</option>
            <option value="CR">Costa Rica</option>
          </datalist>
        </label>
        <label className="text-xs font-bold">REGION / NEIGHBORHOOD
          <input name="region" defaultValue={listing.region} placeholder="e.g. Riviera Maya" className={inputCls} />
        </label>
        <label className="text-xs font-bold">TYPE
          <select name="propertyType" defaultValue={listing.propertyType} className={inputCls}>
            <option value="condo">Condo</option>
            <option value="villa">Villa</option>
            <option value="house">House</option>
            <option value="apartment">Apartment</option>
          </select>
        </label>
      </div>
      <label className="text-xs font-bold">DESCRIPTION
        <textarea name="description" rows={4} defaultValue={listing.description} className={inputCls} />
      </label>
      <div className="grid gap-3 sm:grid-cols-4">
        <label className="text-xs font-bold">MAX GUESTS
          <input name="maxGuests" type="number" min="1" defaultValue={listing.maxGuests} className={inputCls} />
        </label>
        <label className="text-xs font-bold">BEDROOMS
          <input name="bedrooms" type="number" min="0" defaultValue={listing.bedrooms} className={inputCls} />
        </label>
        <label className="text-xs font-bold">BATHROOMS
          <input name="bathrooms" type="number" min="0" step="0.5" defaultValue={listing.bathrooms} className={inputCls} />
        </label>
        <label className="text-xs font-bold">SIZE (ft²)
          <input name="sizeSqft" type="number" min="0" defaultValue={listing.sizeSqft ?? ""} className={inputCls} />
        </label>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="text-xs font-bold">RATING <span className="font-normal text-grey">(from Airbnb/Google, e.g. 4.92 — shows &ldquo;New&rdquo; while reviews are 0)</span>
          <input name="rating" type="number" min="0" max="5" step="0.01" defaultValue={listing.rating || ""} className={inputCls} />
        </label>
        <label className="text-xs font-bold">NUMBER OF REVIEWS
          <input name="reviewCount" type="number" min="0" defaultValue={listing.reviewCount || ""} className={inputCls} />
        </label>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="text-xs font-bold">BED TYPES <span className="font-normal text-grey">(one per line, e.g. “2 x Queen”)</span>
          <textarea name="bedTypes" rows={2} className={inputCls}
            defaultValue={listing.bedTypes.map((b) => `${b.count} x ${b.type}`).join("\n")} />
        </label>
        <label className="text-xs font-bold">AMENITIES <span className="font-normal text-grey">(comma-separated)</span>
          <textarea name="amenities" rows={2} className={inputCls}
            defaultValue={listing.amenities.join(", ")} />
        </label>
      </div>
      <div className="grid gap-3 sm:grid-cols-4">
        <label className="text-xs font-bold">CHECK-IN FROM
          <input name="checkinFrom" type="time" defaultValue={listing.checkinFrom} className={inputCls} />
        </label>
        <label className="text-xs font-bold">CHECK-OUT UNTIL
          <input name="checkoutUntil" type="time" defaultValue={listing.checkoutUntil} className={inputCls} />
        </label>
        <label className="text-xs font-bold sm:col-span-2">ADDRESS <span className="font-normal text-grey">(street, city — the map pin sets itself from this)</span>
          <input name="address" defaultValue={listing.address ?? ""} placeholder="e.g. Calle 38 Norte 5, Playa del Carmen"
            className={inputCls} />
          {listing.lat != null && listing.lng != null && (
            <span className="mt-1 block text-[11px] font-normal text-grey">
              Current map pin: {listing.lat.toFixed(4)}, {listing.lng.toFixed(4)} — updates when you save a new address.
            </span>
          )}
        </label>
      </div>

      {/* ------------------------------------- booking & visibility */}
      <div className={sectionCls}>
        <div className={sectionTitleCls}>Booking &amp; visibility</div>
        <div className="grid gap-3 sm:grid-cols-3">
          <label className="text-xs font-bold">STATUS
            <select name="status" defaultValue={listing.status ?? "published"} className={inputCls}>
              <option value="published">Published</option>
              <option value="unlisted">Unlisted (bookable by link)</option>
              <option value="draft">Draft (hidden)</option>
              <option value="archived">Archived</option>
            </select>
          </label>
          <label className="text-xs font-bold">MIN STAY (nights)
            <input name="minStay" type="number" min="1" defaultValue={listing.minStay} className={inputCls} />
          </label>
          <label className="text-xs font-bold">AFFILIATE LINK <span className="font-normal text-grey">(books off-site)</span>
            <input name="affiliateUrl" type="url" placeholder="https://…" defaultValue={listing.affiliateUrl} className={inputCls} />
          </label>
        </div>
        <div className="mt-3 flex flex-wrap gap-x-6 gap-y-2">
          <Check name="featured" label="Featured on the homepage" defaultChecked={listing.featured} />
          <Check name="instantBook" label="Instant booking (requests auto-accepted)" defaultChecked={listing.instantBook} />
          <Check name="keepCalendarClean" label="Keep calendar clean (hotel mode — bookings don't block dates)" defaultChecked={listing.keepCalendarClean} />
        </div>
        <label className="mt-3 block text-xs font-bold">BOOKING NOTIFICATION EMAILS <span className="font-normal text-grey">(comma-separated — who hears about new bookings)</span>
          <input name="notifyEmails" defaultValue={listing.notifyEmails.join(", ")} className={inputCls} />
        </label>
      </div>

      {/* ------------------------------------------ rules & policies */}
      <div className={sectionCls}>
        <div className={sectionTitleCls}>Rules &amp; policies</div>
        <div className="flex flex-wrap gap-x-6 gap-y-2">
          <Check name="allowChildren" label="Children allowed" defaultChecked={listing.allowChildren} />
          <Check name="allowPets" label="Pets allowed" defaultChecked={listing.allowPets} />
          <Check name="allowSmoking" label="Smoking allowed" defaultChecked={listing.allowSmoking} />
          <Check name="allowParty" label="Parties allowed" defaultChecked={listing.allowParty} />
        </div>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <label className="text-xs font-bold">CANCELLATION POLICY
            <textarea name="cancellationPolicy" rows={3} defaultValue={listing.cancellationPolicy} className={inputCls} />
          </label>
          <label className="text-xs font-bold">OTHER RULES
            <textarea name="otherRules" rows={3} defaultValue={listing.otherRules} className={inputCls} />
          </label>
        </div>
        <label className="mt-3 block text-xs font-bold">HOUSE RULES <span className="font-normal text-grey">(shown on the property page)</span>
          <textarea name="houseRules" rows={2} defaultValue={listing.houseRules} className={inputCls} />
        </label>
        <label className="mt-3 block text-xs font-bold">FAQs <span className="font-normal text-grey">(one per line: “Question? :: Answer”)</span>
          <textarea name="faqs" rows={3} className={inputCls}
            defaultValue={listing.faqs.map((f) => `${f.q} :: ${f.a}`).join("\n")} />
        </label>
      </div>

      {/* ------------------------------------------- guest messages */}
      <div className={sectionCls}>
        <div className={sectionTitleCls}>Automatic guest messages</div>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="text-xs font-bold">CHECK-IN MESSAGE <span className="font-normal text-grey">(emailed 2 days before check-in)</span>
            <textarea name="checkinMessage" rows={3} defaultValue={listing.checkinMessage} className={inputCls} />
          </label>
          <label className="text-xs font-bold">CHECK-OUT MESSAGE <span className="font-normal text-grey">(emailed 1 day before check-out)</span>
            <textarea name="checkoutMessage" rows={3} defaultValue={listing.checkoutMessage} className={inputCls} />
          </label>
        </div>
      </div>

      {/* -------------------------------------------- private notes */}
      <div className={sectionCls}>
        <label className="text-xs font-bold">PRIVATE NOTES <span className="font-normal text-grey">(admins only — never shown to guests)</span>
          <textarea name="privateNotes" rows={2} defaultValue={listing.privateNotes} className={inputCls} />
        </label>
        <p className="mt-2 text-xs text-grey">
          Page address: <span className="font-mono">/stays/{listing.slug}</span> (fixed — changing it would break links &amp; Google)
        </p>
      </div>

      {state.message && (
        <p className={`text-sm font-semibold ${state.ok ? "text-cactus" : "text-rosa-deep"}`}>{state.message}</p>
      )}
      <button
        disabled={pending}
        className="w-fit rounded-pill bg-rosa px-6 py-2.5 text-sm font-bold text-white disabled:opacity-50"
      >
        {pending ? "Saving…" : "Save changes"}
      </button>
    </form>
  );
}
