import { headers } from "next/headers";
import { getDb } from "@/lib/db";
import { ListingForm, type AdminListing } from "./listing-form";
import { PricingForm, type AdminPricing, type AdminSeason } from "./pricing-form";
import { CalendarEditor, type AdminDay, type AdminBlock, type AdminIcalFeed } from "./calendar-editor";
import { AddonsEditor, type AdminAddon } from "./addons-editor";
import { PhotoManager, type AdminPhoto } from "./photo-manager";
import { addListingAction, deleteListingAction } from "./actions";
import { DeleteButton } from "@/components/DeleteButton";

export const dynamic = "force-dynamic";

const CALENDAR_MONTHS = 12;

async function allListings(): Promise<AdminListing[]> {
  const res = await getDb().query(
    `select l.id, l.slug, l.title, coalesce(l.headline,'') as headline, l.city,
            l.country, coalesce(l.region,'') as region, l.property_type,
            coalesce(l.description,'') as description, l.max_guests,
            l.bedrooms, l.bathrooms, l.min_stay, l.status, l.size_sqft,
            coalesce(l.bed_types,'[]'::jsonb) as bed_types,
            to_char(l.checkin_from,'HH24:MI') as checkin_from,
            to_char(l.checkout_until,'HH24:MI') as checkout_until,
            l.lat, l.lng, l.address, l.amenities, coalesce(l.house_rules,'') as house_rules,
            coalesce(l.featured,false) as featured,
            coalesce(l.instant_book,false) as instant_book,
            coalesce(l.keep_calendar_clean,false) as keep_calendar_clean,
            coalesce(l.affiliate_url,'') as affiliate_url,
            coalesce(l.notify_emails,'{}') as notify_emails,
            coalesce(l.cancellation_policy,'') as cancellation_policy,
            coalesce(l.other_rules,'') as other_rules,
            coalesce(l.faqs,'[]'::jsonb) as faqs,
            coalesce(l.checkin_message,'') as checkin_message,
            coalesce(l.checkout_message,'') as checkout_message,
            coalesce(l.private_notes,'') as private_notes,
            coalesce(l.allow_children,true) as allow_children,
            coalesce(l.allow_smoking,false) as allow_smoking,
            coalesce(l.allow_party,false) as allow_party,
            coalesce(l.allow_pets,false) as allow_pets,
            l.rating_cached, l.review_count_cached,
            coalesce(r.nightly_cents,0) as nightly_cents
       from listings l
       left join listing_rates r on r.listing_id = l.id and r.season is null
      where l.status <> 'archived'
      order by l.title`,
  );
  return res.rows.map((r) => ({
    id: r.id, slug: r.slug, title: r.title, headline: r.headline, city: r.city,
    country: r.country, region: r.region, propertyType: r.property_type,
    description: r.description, maxGuests: r.max_guests, bedrooms: r.bedrooms,
    bathrooms: Number(r.bathrooms), minStay: r.min_stay, status: r.status,
    sizeSqft: r.size_sqft, bedTypes: r.bed_types,
    checkinFrom: r.checkin_from, checkoutUntil: r.checkout_until,
    lat: r.lat, lng: r.lng, address: r.address, amenities: r.amenities ?? [],
    houseRules: r.house_rules, featured: r.featured, instantBook: r.instant_book,
    keepCalendarClean: r.keep_calendar_clean, affiliateUrl: r.affiliate_url,
    notifyEmails: r.notify_emails ?? [], cancellationPolicy: r.cancellation_policy,
    otherRules: r.other_rules, faqs: r.faqs,
    checkinMessage: r.checkin_message, checkoutMessage: r.checkout_message,
    privateNotes: r.private_notes, allowChildren: r.allow_children,
    allowSmoking: r.allow_smoking, allowParty: r.allow_party,
    allowPets: r.allow_pets, rating: Number(r.rating_cached),
    reviewCount: r.review_count_cached, nightlyCents: r.nightly_cents,
  }));
}

async function pricingFor(listingId: string): Promise<{ pricing: AdminPricing; seasons: AdminSeason[] }> {
  const db = getDb();
  const [rate, cfg, seasonRes] = await Promise.all([
    db.query(
      `select nightly_cents, cleaning_cents, tax_pct
         from listing_rates where listing_id=$1 and season is null`, [listingId]),
    db.query(
      `select * from listing_pricing where listing_id=$1`, [listingId]),
    db.query(
      `select id, coalesce(label,'') as label, nightly_cents,
              to_char(lower(season),'YYYY-MM-DD') as from_day,
              to_char(upper(season) - 1,'YYYY-MM-DD') as to_day
         from listing_rates
        where listing_id=$1 and season is not null
        order by lower(season)`, [listingId]),
  ]);
  const r = rate.rows[0] ?? { nightly_cents: 0, cleaning_cents: 0, tax_pct: 0 };
  const c = cfg.rows[0] ?? {};
  return {
    pricing: {
      nightlyCents: r.nightly_cents,
      cleaningCents: r.cleaning_cents,
      taxPct: Number(r.tax_pct),
      weekendPct: Number(c.weekend_pct ?? 0),
      weekendCents: c.weekend_cents ?? 0,
      weeklyNightlyCents: c.weekly_nightly_cents ?? 0,
      monthlyNightlyCents: c.monthly_nightly_cents ?? 0,
      extraGuestCents: c.extra_guest_cents ?? 0,
      extraGuestAfter: c.extra_guest_after ?? 0,
      cleaningFeeMode: c.cleaning_fee_mode ?? "single",
      cityFeeCents: c.city_fee_cents ?? 0,
      cityFeeMode: c.city_fee_mode ?? "single",
      securityDepositCents: c.security_deposit_cents ?? 0,
      weeklyDiscountPct: Number(c.weekly_discount_pct ?? 0),
      monthlyDiscountPct: Number(c.monthly_discount_pct ?? 0),
      earlyBirdPct: Number(c.early_bird_pct ?? 0),
      earlyBirdMinDays: c.early_bird_min_days ?? 0,
      depositPct: Number(c.deposit_pct ?? 100),
      secondPaymentDays: c.second_payment_days ?? 0,
      dynamicPricing: c.dynamic_pricing ?? false,
    },
    seasons: seasonRes.rows.map((s) => ({
      id: s.id, label: s.label, nightlyCents: s.nightly_cents,
      from: s.from_day, to: s.to_day,
    })),
  };
}

async function calendarFor(listingId: string): Promise<{
  startMonth: string; days: Record<string, AdminDay>; blocks: AdminBlock[]; todayYmd: string;
  exportUrl: string; icalFeeds: AdminIcalFeed[];
}> {
  const db = getDb();
  const today = new Date();
  const start = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), 1));
  const end = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + CALENDAR_MONTHS, 1));
  const h = await headers();
  const origin = `${h.get("x-forwarded-proto") ?? "https"}://${h.get("host") ?? "tutcasa-platform.vercel.app"}`;
  const [rates, overrides, blockRes, bookingRes, tokenRes, feedsRes] = await Promise.all([
    db.query(
      `select nightly_cents, season is null as is_base,
              to_char(lower(season),'YYYY-MM-DD') as from_day,
              to_char(upper(season),'YYYY-MM-DD') as to_day
         from listing_rates where listing_id=$1`, [listingId]),
    db.query(
      `select to_char(day,'YYYY-MM-DD') as day, nightly_cents, min_stay, is_blocked
         from listing_price_days
        where listing_id=$1 and day >= $2::date and day < $3::date`,
      [listingId, start.toISOString().slice(0, 10), end.toISOString().slice(0, 10)]),
    db.query(
      `select id, reason, coalesce(source,'') as source,
              to_char(lower(span),'YYYY-MM-DD') as from_day,
              to_char(upper(span) - 1,'YYYY-MM-DD') as to_day
         from availability_blocks
        where listing_id=$1 and upper(span) >= current_date
        order by lower(span)`, [listingId]),
    db.query(
      `select to_char(lower(stay),'YYYY-MM-DD') as from_day,
              to_char(upper(stay),'YYYY-MM-DD') as to_day
         from bookings
        where listing_id=$1 and status in ('pending','confirmed')
          and upper(stay) >= current_date`, [listingId]),
    db.query(`select ical_token from listings where id=$1`, [listingId]),
    db.query(
      `select id, url, source, active, last_synced_at, last_status
         from listing_ical_feeds where listing_id=$1 order by created_at`, [listingId]),
  ]);

  const base = rates.rows.find((r) => r.is_base)?.nightly_cents ?? 0;
  const seasons = rates.rows.filter((r) => !r.is_base);
  const byDay: Record<string, AdminDay> = {};

  for (let t = start.getTime(); t < end.getTime(); t += 86_400_000) {
    const day = new Date(t).toISOString().slice(0, 10);
    const season = seasons.find((s) => day >= s.from_day && day < s.to_day);
    byDay[day] = {
      priceCents: season?.nightly_cents ?? base,
      override: false, minStay: null, blocked: false,
      booked: false, blockReason: null,
    };
  }
  for (const o of overrides.rows) {
    const d = byDay[o.day];
    if (!d) continue;
    if (o.nightly_cents != null) { d.priceCents = o.nightly_cents; d.override = true; }
    if (o.min_stay != null) d.minStay = o.min_stay;
    if (o.is_blocked) d.blocked = true;
  }
  for (const b of blockRes.rows) {
    for (const day of Object.keys(byDay)) {
      if (day >= b.from_day && day <= b.to_day) byDay[day].blockReason = b.reason;
    }
  }
  for (const bk of bookingRes.rows) {
    for (const day of Object.keys(byDay)) {
      // upper(stay) is the checkout day — that night stays available
      if (day >= bk.from_day && day < bk.to_day) byDay[day].booked = true;
    }
  }

  return {
    startMonth: start.toISOString().slice(0, 7),
    days: byDay,
    blocks: blockRes.rows.map((b) => ({
      id: b.id, reason: b.reason, source: b.source,
      from: b.from_day, to: b.to_day,
    })),
    todayYmd: today.toISOString().slice(0, 10),
    exportUrl: `${origin}/api/ical/${tokenRes.rows[0]?.ical_token}.ics`,
    icalFeeds: feedsRes.rows.map((f) => ({
      id: f.id, url: f.url, source: f.source, active: f.active,
      lastSyncedAt: f.last_synced_at, lastStatus: f.last_status,
    })),
  };
}

async function addonsFor(listingId: string): Promise<AdminAddon[]> {
  const res = await getDb().query(
    `select id, name, price_cents, mode, active
       from listing_addons where listing_id=$1 order by sort`, [listingId]);
  return res.rows.map((a) => ({
    id: a.id, name: a.name, priceCents: a.price_cents,
    mode: a.mode, active: a.active,
  }));
}

async function photosFor(listingId: string): Promise<AdminPhoto[]> {
  const res = await getDb().query(
    "select id, url, alt from listing_photos where listing_id=$1 order by sort",
    [listingId],
  );
  return res.rows;
}

const TABS = [
  ["details", "Home details"],
  ["pricing", "Pricing"],
  ["calendar", "Calendar"],
  ["extras", "Extra options"],
  ["photos", "Photos"],
] as const;
type Tab = (typeof TABS)[number][0];

export default async function AdminListings({
  searchParams,
}: { searchParams: Promise<{ edit?: string; tab?: string }> }) {
  const { edit, tab: rawTab } = await searchParams;
  const listings = await allListings();
  const editing = edit ? listings.find((l) => l.id === edit) : listings[0];
  const tab: Tab = TABS.some(([t]) => t === rawTab) ? (rawTab as Tab) : "details";

  const [pricingData, calendarData, addons, photos] = editing
    ? await Promise.all([
        tab === "pricing" ? pricingFor(editing.id) : null,
        tab === "calendar" ? calendarFor(editing.id) : null,
        tab === "extras" ? addonsFor(editing.id) : null,
        tab === "photos" ? photosFor(editing.id) : null,
      ])
    : [null, null, null, null];
  const uploadsReady = Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY);

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(260px,0.8fr)_1.6fr]">
      <div>
        <h1 className="mb-4 text-2xl font-extrabold">Stays &amp; homes</h1>

        {/* add a new home */}
        <form action={addListingAction} className="mb-4 flex gap-2">
          <input
            name="title"
            required
            placeholder="New home name…"
            className="w-full rounded-xl border-[1.5px] border-line bg-white px-3 py-2.5 text-sm outline-none focus:border-rosa"
          />
          <button className="whitespace-nowrap rounded-pill bg-rosa px-4 py-2 text-sm font-bold text-white">
            + Add home
          </button>
        </form>

        <div className="grid gap-2">
          {listings.map((l) => (
            <a
              key={l.id}
              href={`/admin/listings?edit=${l.id}&tab=${tab}`}
              className={`flex items-center justify-between gap-3 rounded-xl border-[1.5px] bg-paper p-3.5 ${editing?.id === l.id ? "border-rosa" : "border-line hover:border-rosa/50"}`}
            >
              <div>
                <b>{l.title}</b>
                {l.status !== "published" && (
                  <span className="ml-2 rounded-pill bg-grey/15 px-2 py-0.5 text-[10px] font-bold uppercase text-grey">{l.status}</span>
                )}
                <div className="text-xs text-grey">
                  {l.city} · {l.bedrooms} BR · {l.maxGuests} guests
                </div>
              </div>
              <div className="whitespace-nowrap text-sm font-bold text-rosa">
                ${Math.round(l.nightlyCents / 100)}/n
              </div>
            </a>
          ))}
        </div>
        <p className="mt-3 text-xs text-grey">
          New homes start as <b>drafts</b> (hidden from guests) — publish them
          from the edit form when ready.
        </p>
      </div>

      <div className="min-w-0">
        <h2 className="mb-3 text-xl font-extrabold">
          {editing ? `Edit: ${editing.title}` : "Select a home"}
        </h2>
        {editing && (
          <>
            <div className="mb-4 flex flex-wrap gap-1.5">
              {TABS.map(([t, label]) => (
                <a
                  key={t}
                  href={`/admin/listings?edit=${editing.id}&tab=${t}`}
                  className={`rounded-pill border-[1.5px] px-4 py-1.5 text-sm font-bold ${
                    tab === t
                      ? "border-ink bg-ink text-white"
                      : "border-line bg-paper hover:border-rosa hover:text-rosa"
                  }`}
                >
                  {label}
                </a>
              ))}
            </div>

            <div className="rounded-card bg-paper p-5 shadow-soft">
              {tab === "details" && <ListingForm key={editing.id} listing={editing} />}
              {tab === "pricing" && pricingData && (
                <PricingForm key={editing.id} listingId={editing.id}
                  pricing={pricingData.pricing} seasons={pricingData.seasons} />
              )}
              {tab === "calendar" && calendarData && (
                <CalendarEditor key={editing.id} listingId={editing.id}
                  startMonth={calendarData.startMonth} monthCount={CALENDAR_MONTHS}
                  days={calendarData.days} blocks={calendarData.blocks}
                  todayYmd={calendarData.todayYmd}
                  exportUrl={calendarData.exportUrl}
                  icalFeeds={calendarData.icalFeeds} />
              )}
              {tab === "extras" && addons && (
                <AddonsEditor key={editing.id} listingId={editing.id} addons={addons} />
              )}
              {tab === "photos" && photos && (
                <>
                  <PhotoManager listingId={editing.id} photos={photos} uploadsReady={uploadsReady} />
                  <DeleteButton
                    label="Delete this home"
                    confirmLabel="Yes, delete permanently"
                    onDelete={deleteListingAction.bind(null, editing.id)}
                    redirectTo="/admin/listings"
                  />
                </>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
