"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getDb } from "@/lib/db";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

export interface ListingFormState { ok: boolean; message: string }

function revalidatePublic() {
  revalidatePath("/admin/listings");
  revalidatePath("/stays");
  revalidatePath("/");
}

/** "a, b, c" → ['a','b','c'] */
function csvList(v: FormDataEntryValue | null): string[] {
  return String(v ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

/** One per line: "2 x Queen" / "1× Sofa bed" / "King" → [{count,type}] */
function parseBedTypes(v: FormDataEntryValue | null): { count: number; type: string }[] {
  return String(v ?? "")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const m = line.match(/^(\d+)\s*[x×]\s*(.+)$/i);
      return m
        ? { count: Number(m[1]), type: m[2].trim() }
        : { count: 1, type: line };
    });
}

/** One per line: "Question? :: Answer" → [{q,a}] (lines without :: are skipped) */
function parseFaqs(v: FormDataEntryValue | null): { q: string; a: string }[] {
  return String(v ?? "")
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.includes("::"))
    .map((line) => {
      const i = line.indexOf("::");
      return { q: line.slice(0, i).trim(), a: line.slice(i + 2).trim() };
    })
    .filter((f) => f.q && f.a);
}

const on = (v: FormDataEntryValue | null) => v === "on" || v === "true";
const usd = (v: FormDataEntryValue | null) =>
  Math.round(Number(v ?? 0) * 100) || 0;
const num = (v: FormDataEntryValue | null, fallback = 0) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
};
const orNull = (v: FormDataEntryValue | null) => {
  const s = String(v ?? "").trim();
  return s === "" ? null : s;
};

/** Postgres exclusion-constraint violation (overlap). */
const isOverlap = (e: unknown) =>
  typeof e === "object" && e !== null && (e as { code?: string }).code === "23P01";

/* ------------------------------------------------------------------ */
/* create / delete home (unchanged behavior)                           */
/* ------------------------------------------------------------------ */

/** Create a new home as a draft and jump straight to its edit form. */
export async function addListingAction(formData: FormData): Promise<void> {
  const title = String(formData.get("title") ?? "").trim();
  if (!title) return;
  const slug =
    title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") +
    "-" + Math.random().toString(36).slice(2, 6);
  const db = getDb();
  const res = await db.query<{ id: string }>(
    `insert into listings (slug, title, city, country, property_type,
       max_guests, bedrooms, bathrooms, min_stay, status)
     values ($1,$2,'Playa del Carmen','MX','condo',2,1,1,2,'draft')
     returning id`,
    [slug, title],
  );
  await db.query(
    `insert into listing_rates (listing_id, nightly_cents, cleaning_cents, tax_pct, currency)
     values ($1, 10000, 0, 16, 'USD')`,
    [res.rows[0].id],
  );
  await db.query(
    `insert into listing_pricing (listing_id) values ($1)
     on conflict (listing_id) do nothing`,
    [res.rows[0].id],
  );
  revalidatePublic();
  redirect(`/admin/listings?edit=${res.rows[0].id}`);
}

/**
 * Delete a home. If it has any bookings, it is archived instead
 * (bookings are money records — they must never lose their listing).
 */
export async function deleteListingAction(
  listingId: string,
): Promise<{ deleted: boolean; message: string }> {
  const db = getDb();
  const has = await db.query<{ n: string }>(
    "select count(*) as n from bookings where listing_id=$1", [listingId]);
  if (Number(has.rows[0].n) > 0) {
    await db.query("update listings set status='archived' where id=$1", [listingId]);
    revalidatePublic();
    return { deleted: false, message: "This home has bookings, so it was archived (hidden everywhere) instead of erased." };
  }
  // no bookings — remove photos (storage + rows), rates, listing
  const photos = await db.query<{ url: string }>(
    "select url from listing_photos where listing_id=$1", [listingId]);
  const sb = getSupabaseAdmin();
  if (sb && photos.rowCount) {
    const paths = photos.rows
      .map((p) => p.url.split("/listing-photos/")[1])
      .filter(Boolean) as string[];
    if (paths.length) await sb.storage.from("listing-photos").remove(paths);
  }
  await db.query("delete from listing_photos where listing_id=$1", [listingId]);
  await db.query("delete from listing_rates where listing_id=$1", [listingId]);
  await db.query("delete from availability_blocks where listing_id=$1", [listingId]);
  await db.query("delete from wishlists where listing_id=$1", [listingId]);
  await db.query("delete from listings where id=$1", [listingId]);
  revalidatePublic();
  return { deleted: true, message: "Home deleted." };
}

/* ------------------------------------------------------------------ */
/* photos (unchanged)                                                  */
/* ------------------------------------------------------------------ */

const MAX_PHOTO_BYTES = 8 * 1024 * 1024;

export async function uploadPhotoAction(formData: FormData): Promise<ListingFormState> {
  const sb = getSupabaseAdmin();
  if (!sb) {
    return { ok: false, message: "Photo uploads need the Supabase service key (SUPABASE_SERVICE_ROLE_KEY) — paste it in .env.local to activate." };
  }
  const listingId = String(formData.get("listingId") ?? "");
  const file = formData.get("photo") as File | null;
  if (!listingId || !file || file.size === 0) return { ok: false, message: "Choose an image first." };
  if (file.size > MAX_PHOTO_BYTES) return { ok: false, message: "Image too large (max 8 MB)." };
  if (!/^image\/(jpeg|png|webp|avif)$/.test(file.type)) {
    return { ok: false, message: "Use a JPEG, PNG, WebP or AVIF image." };
  }

  const ext = file.type.split("/")[1].replace("jpeg", "jpg");
  const path = `${listingId}/${Date.now()}.${ext}`;
  const { error } = await sb.storage.from("listing-photos")
    .upload(path, Buffer.from(await file.arrayBuffer()), { contentType: file.type });
  if (error) return { ok: false, message: `Upload failed: ${error.message}` };

  const { data } = sb.storage.from("listing-photos").getPublicUrl(path);
  const db = getDb();
  const next = await db.query<{ n: number }>(
    "select coalesce(max(sort),-1)+1 as n from listing_photos where listing_id=$1", [listingId]);
  await db.query(
    "insert into listing_photos (listing_id, url, alt, sort) values ($1,$2,$3,$4)",
    [listingId, data.publicUrl, String(formData.get("alt") ?? ""), next.rows[0].n],
  );
  revalidatePublic();
  return { ok: true, message: "Photo added." };
}

export async function deletePhotoAction(photoId: string): Promise<void> {
  const db = getDb();
  const res = await db.query<{ url: string }>(
    "delete from listing_photos where id=$1 returning url", [photoId]);
  const url = res.rows[0]?.url;
  const sb = getSupabaseAdmin();
  if (url && sb) {
    const path = url.split("/listing-photos/")[1];
    if (path) await sb.storage.from("listing-photos").remove([path]);
  }
  revalidatePublic();
}

/* ------------------------------------------------------------------ */
/* home details (listings table — every field from the feature spec)   */
/* ------------------------------------------------------------------ */

export async function saveListingAction(
  _prev: ListingFormState,
  formData: FormData,
): Promise<ListingFormState> {
  const id = String(formData.get("id") ?? "");
  const title = String(formData.get("title") ?? "").trim();
  if (!id || !title) {
    return { ok: false, message: "A title is required." };
  }

  const db = getDb();
  await db.query(
    `update listings set
       title=$2, headline=$3, city=$4, country=$5, region=$6,
       property_type=$7, description=$8, max_guests=$9, bedrooms=$10,
       bathrooms=$11, min_stay=$12, status=$13, size_sqft=$14,
       bed_types=$15, checkin_from=$16, checkout_until=$17,
       lat=$18, lng=$19, amenities=$20, house_rules=$21,
       instant_book=$22, keep_calendar_clean=$23, affiliate_url=$24,
       notify_emails=$25, cancellation_policy=$26, other_rules=$27,
       faqs=$28, checkin_message=$29, checkout_message=$30,
       private_notes=$31, allow_children=$32, allow_smoking=$33,
       allow_party=$34, allow_pets=$35, featured=$36
     where id=$1`,
    [
      id, title,
      String(formData.get("headline") ?? ""),
      String(formData.get("city") ?? ""),
      String(formData.get("country") ?? "MX").trim().toUpperCase().slice(0, 2) || "MX",
      orNull(formData.get("region")),
      String(formData.get("propertyType") ?? "condo"),
      String(formData.get("description") ?? ""),
      num(formData.get("maxGuests"), 2),
      num(formData.get("bedrooms"), 1),
      num(formData.get("bathrooms"), 1),
      num(formData.get("minStay"), 2),
      String(formData.get("status") ?? "published"),
      formData.get("sizeSqft") ? num(formData.get("sizeSqft")) : null,
      JSON.stringify(parseBedTypes(formData.get("bedTypes"))),
      String(formData.get("checkinFrom") || "15:00"),
      String(formData.get("checkoutUntil") || "11:00"),
      formData.get("lat") ? num(formData.get("lat")) : null,
      formData.get("lng") ? num(formData.get("lng")) : null,
      csvList(formData.get("amenities")),
      orNull(formData.get("houseRules")),
      on(formData.get("instantBook")),
      on(formData.get("keepCalendarClean")),
      orNull(formData.get("affiliateUrl")),
      csvList(formData.get("notifyEmails")),
      orNull(formData.get("cancellationPolicy")),
      orNull(formData.get("otherRules")),
      JSON.stringify(parseFaqs(formData.get("faqs"))),
      orNull(formData.get("checkinMessage")),
      orNull(formData.get("checkoutMessage")),
      orNull(formData.get("privateNotes")),
      on(formData.get("allowChildren")),
      on(formData.get("allowSmoking")),
      on(formData.get("allowParty")),
      on(formData.get("allowPets")),
      on(formData.get("featured")),
    ],
  );

  revalidatePublic();
  return { ok: true, message: "Home updated — live on the site now." };
}

/* ------------------------------------------------------------------ */
/* pricing (base rate + listing_pricing fee schedule)                  */
/* ------------------------------------------------------------------ */

export async function savePricingAction(
  _prev: ListingFormState,
  formData: FormData,
): Promise<ListingFormState> {
  const id = String(formData.get("id") ?? "");
  const nightlyUSD = Number(formData.get("nightlyUSD") ?? 0);
  if (!id || nightlyUSD <= 0) {
    return { ok: false, message: "A nightly price above 0 is required." };
  }
  const depositPct = num(formData.get("depositPct"), 100);
  if (depositPct < 1 || depositPct > 100) {
    return { ok: false, message: "Deposit % must be between 1 and 100." };
  }

  // weekend / weekly / monthly each come as a (mode, value) pair —
  // "% of nightly" or a fixed replacement nightly in USD (spec: "fixed
  // amount OR a percentage"). The unused column of the pair is zeroed.
  const modal = (mode: FormDataEntryValue | null, value: FormDataEntryValue | null) =>
    String(mode) === "fixed"
      ? { pct: 0, cents: usd(value) }
      : { pct: num(value), cents: 0 };
  const weekend = modal(formData.get("weekendMode"), formData.get("weekendValue"));
  const weekly = modal(formData.get("weeklyMode"), formData.get("weeklyValue"));
  const monthly = modal(formData.get("monthlyMode"), formData.get("monthlyValue"));

  const db = getDb();
  await db.query(
    `update listing_rates set nightly_cents=$2, cleaning_cents=$3, tax_pct=$4
     where listing_id=$1 and season is null`,
    [id, usd(formData.get("nightlyUSD")), usd(formData.get("cleaningUSD")),
     num(formData.get("taxPct"))],
  );
  await db.query(
    `insert into listing_pricing (listing_id, weekend_pct, weekend_cents,
       extra_guest_cents, extra_guest_after, cleaning_fee_mode, city_fee_cents,
       city_fee_mode, security_deposit_cents, weekly_discount_pct,
       weekly_nightly_cents, monthly_discount_pct, monthly_nightly_cents,
       early_bird_pct, early_bird_min_days, deposit_pct, second_payment_days,
       dynamic_pricing)
     values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18)
     on conflict (listing_id) do update set
       weekend_pct=$2, weekend_cents=$3, extra_guest_cents=$4,
       extra_guest_after=$5, cleaning_fee_mode=$6, city_fee_cents=$7,
       city_fee_mode=$8, security_deposit_cents=$9, weekly_discount_pct=$10,
       weekly_nightly_cents=$11, monthly_discount_pct=$12,
       monthly_nightly_cents=$13, early_bird_pct=$14, early_bird_min_days=$15,
       deposit_pct=$16, second_payment_days=$17, dynamic_pricing=$18`,
    [
      id,
      weekend.pct, weekend.cents,
      usd(formData.get("extraGuestUSD")),
      num(formData.get("extraGuestAfter")),
      String(formData.get("cleaningFeeMode") ?? "single"),
      usd(formData.get("cityFeeUSD")),
      String(formData.get("cityFeeMode") ?? "single"),
      usd(formData.get("securityDepositUSD")),
      weekly.pct, weekly.cents,
      monthly.pct, monthly.cents,
      num(formData.get("earlyBirdPct")),
      num(formData.get("earlyBirdMinDays")),
      depositPct,
      num(formData.get("secondPaymentDays")),
      on(formData.get("dynamicPricing")),
    ],
  );

  revalidatePublic();
  return { ok: true, message: "Pricing updated." };
}

/** Add a seasonal rate ("from" and "to" are both inclusive nights). */
export async function addSeasonAction(
  _prev: ListingFormState,
  formData: FormData,
): Promise<ListingFormState> {
  const id = String(formData.get("id") ?? "");
  const label = String(formData.get("label") ?? "").trim();
  const from = String(formData.get("from") ?? "");
  const to = String(formData.get("to") ?? "");
  const nightlyUSD = Number(formData.get("nightlyUSD") ?? 0);
  if (!id || !from || !to || nightlyUSD <= 0) {
    return { ok: false, message: "Dates and a nightly price are required." };
  }
  if (to < from) return { ok: false, message: "End date must be after start date." };

  const base = await getDb().query<{ cleaning_cents: number; tax_pct: string }>(
    "select cleaning_cents, tax_pct from listing_rates where listing_id=$1 and season is null",
    [id],
  );
  try {
    await getDb().query(
      `insert into listing_rates
         (listing_id, nightly_cents, cleaning_cents, tax_pct, currency, season, label)
       values ($1,$2,$3,$4,'USD', daterange($5::date, ($6::date + 1), '[)'), $7)`,
      [id, usd(formData.get("nightlyUSD")),
       base.rows[0]?.cleaning_cents ?? 0, Number(base.rows[0]?.tax_pct ?? 0),
       from, to, label || null],
    );
  } catch (e) {
    if (isOverlap(e)) return { ok: false, message: "That season overlaps an existing one." };
    throw e;
  }
  revalidatePublic();
  return { ok: true, message: "Season added." };
}

export async function deleteSeasonAction(rateId: string): Promise<void> {
  await getDb().query(
    "delete from listing_rates where id=$1 and season is not null", [rateId]);
  revalidatePublic();
}

/* ------------------------------------------------------------------ */
/* price calendar (listing_price_days)                                 */
/* ------------------------------------------------------------------ */

/**
 * Apply a per-date override to a range (both dates inclusive).
 * Empty price/min-stay clear that override for the range (fall back to
 * the base/seasonal rate); "block" marks the nights unavailable.
 */
export async function applyCalendarDaysAction(
  _prev: ListingFormState,
  formData: FormData,
): Promise<ListingFormState> {
  const id = String(formData.get("id") ?? "");
  const from = String(formData.get("from") ?? "");
  const to = String(formData.get("to") ?? "");
  if (!id || !from || !to) return { ok: false, message: "Pick a date range first." };
  if (to < from) return { ok: false, message: "End date must be after start date." };

  const price = formData.get("nightlyUSD")
    ? usd(formData.get("nightlyUSD"))
    : null;
  const minStay = formData.get("minStay") ? num(formData.get("minStay")) : null;
  const blocked = on(formData.get("blocked"));
  const note = orNull(formData.get("note"));

  await getDb().query(
    `insert into listing_price_days (listing_id, day, nightly_cents, min_stay, is_blocked, note)
     select $1, d::date, $2, $3, $4, $5
       from generate_series($6::date, $7::date, interval '1 day') d
     on conflict (listing_id, day) do update set
       nightly_cents=$2, min_stay=$3, is_blocked=$4, note=$5, updated_at=now()`,
    [id, price, minStay, blocked, note, from, to],
  );
  revalidatePublic();
  return { ok: true, message: `Applied to ${from} → ${to}.` };
}

/** Remove all per-date overrides in a range (back to base/seasonal rate). */
export async function clearCalendarDaysAction(
  _prev: ListingFormState,
  formData: FormData,
): Promise<ListingFormState> {
  const id = String(formData.get("id") ?? "");
  const from = String(formData.get("from") ?? "");
  const to = String(formData.get("to") ?? "");
  if (!id || !from || !to) return { ok: false, message: "Pick a date range first." };
  await getDb().query(
    "delete from listing_price_days where listing_id=$1 and day between $2::date and $3::date",
    [id, from, to],
  );
  revalidatePublic();
  return { ok: true, message: `Cleared overrides for ${from} → ${to}.` };
}

/* ------------------------------------------------------------------ */
/* manual availability blocks                                          */
/* ------------------------------------------------------------------ */

/** Block a range of nights ("to" = last blocked night, inclusive). */
export async function addBlockAction(
  _prev: ListingFormState,
  formData: FormData,
): Promise<ListingFormState> {
  const id = String(formData.get("id") ?? "");
  const from = String(formData.get("from") ?? "");
  const to = String(formData.get("to") ?? "");
  const reason = String(formData.get("reason") ?? "owner");
  if (!id || !from || !to) return { ok: false, message: "Pick a date range first." };
  if (to < from) return { ok: false, message: "End date must be after start date." };
  await getDb().query(
    `insert into availability_blocks (listing_id, span, reason, source)
     values ($1, daterange($2::date, ($3::date + 1), '[)'), $4, 'admin')`,
    [id, from, to, reason === "maintenance" ? "maintenance" : "owner"],
  );
  revalidatePublic();
  return { ok: true, message: "Dates blocked." };
}

export async function deleteBlockAction(blockId: string): Promise<void> {
  // manual blocks only — iCal blocks are managed by the sync (M4)
  await getDb().query(
    "delete from availability_blocks where id=$1 and reason <> 'ical'", [blockId]);
  revalidatePublic();
}

/* ------------------------------------------------------------------ */
/* stay add-ons (listing_addons)                                       */
/* ------------------------------------------------------------------ */

export async function addAddonAction(
  _prev: ListingFormState,
  formData: FormData,
): Promise<ListingFormState> {
  const id = String(formData.get("id") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  const priceUSD = Number(formData.get("priceUSD") ?? 0);
  if (!id || !name || priceUSD < 0) {
    return { ok: false, message: "A name and a price (0 or more) are required." };
  }
  const db = getDb();
  const next = await db.query<{ n: number }>(
    "select coalesce(max(sort),-1)+1 as n from listing_addons where listing_id=$1", [id]);
  await db.query(
    `insert into listing_addons (listing_id, name, price_cents, mode, sort)
     values ($1,$2,$3,$4,$5)`,
    [id, name, usd(formData.get("priceUSD")),
     String(formData.get("mode") ?? "flat"), next.rows[0].n],
  );
  revalidatePublic();
  return { ok: true, message: "Extra option added." };
}

export async function toggleAddonAction(addonId: string): Promise<void> {
  await getDb().query(
    "update listing_addons set active = not active where id=$1", [addonId]);
  revalidatePublic();
}

export async function deleteAddonAction(addonId: string): Promise<void> {
  await getDb().query("delete from listing_addons where id=$1", [addonId]);
  revalidatePublic();
}
