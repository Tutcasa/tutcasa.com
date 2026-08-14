-- 0008_pricing_and_booking_config.sql
-- M1: Full pricing model + per-listing booking config (parity with client feature spec).
-- Nightly rate, cleaning, tax stay on listing_rates (seasonal). This adds:
--   * per-listing fee schedule + discounts + deposit rules  (listing_pricing, 1:1)
--   * per-listing booking/content config                    (columns on listings)
--   * per-date price/availability calendar overrides        (listing_price_days)
--   * stay extra options / add-ons                          (listing_addons)
-- Safe to re-run: guarded with IF NOT EXISTS / add-column-if-missing.

begin;

-- ---------- 1. per-listing pricing config (1:1) ----------------------------
create table if not exists public.listing_pricing (
  listing_id           uuid primary key references public.listings(id) on delete cascade,
  weekend_pct          numeric(5,2) not null default 0  check (weekend_pct >= 0),   -- extra % on Sat & Sun nights
  extra_guest_cents    int  not null default 0 check (extra_guest_cents >= 0),      -- per extra guest, per night
  extra_guest_after    int  not null default 0 check (extra_guest_after >= 0),      -- guests included before fee applies
  cleaning_fee_mode    text not null default 'single' check (cleaning_fee_mode in ('single','per_night')), -- amount lives on listing_rates
  city_fee_cents       int  not null default 0 check (city_fee_cents >= 0),
  city_fee_mode        text not null default 'single' check (city_fee_mode in ('single','per_night')),
  security_deposit_cents int not null default 0 check (security_deposit_cents >= 0),
  weekly_discount_pct  numeric(5,2) not null default 0 check (weekly_discount_pct  between 0 and 100), -- 7+ nights
  monthly_discount_pct numeric(5,2) not null default 0 check (monthly_discount_pct between 0 and 100), -- 30+ nights
  early_bird_pct       numeric(5,2) not null default 0 check (early_bird_pct between 0 and 100),
  early_bird_min_days  int  not null default 0 check (early_bird_min_days >= 0),    -- min days in advance to qualify
  deposit_pct          numeric(5,2) not null default 100 check (deposit_pct between 1 and 100), -- 100 = pay in full
  second_payment_days  int  not null default 0 check (second_payment_days >= 0),    -- days before check-in 2nd payment due
  dynamic_pricing      boolean not null default false,                             -- PriceLabs toggle (wired later)
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);
create trigger trg_listing_pricing_updated before update on public.listing_pricing
for each row execute function public.set_updated_at();

-- backfill a default pricing row for every existing listing
insert into public.listing_pricing (listing_id)
select id from public.listings
on conflict (listing_id) do nothing;

-- ---------- 2. booking/content config on listings --------------------------
alter table public.listings
  add column if not exists instant_book       boolean not null default false,       -- else request-to-book
  add column if not exists keep_calendar_clean boolean not null default false,       -- hotel-style: don't block on book
  add column if not exists affiliate_url       text,                                 -- redirect booking off-site if set
  add column if not exists checkin_message     text,                                 -- auto-emailed 2 days before check-in
  add column if not exists checkout_message    text,                                 -- auto-emailed 1 day before check-out
  add column if not exists private_notes        text,                                -- admin-only
  add column if not exists cancellation_policy text,
  add column if not exists other_rules         text,
  add column if not exists faqs                jsonb not null default '[]',           -- [{q,a}]
  add column if not exists bed_types           jsonb not null default '[]',           -- [{type,count}]
  add column if not exists size_sqft           int check (size_sqft is null or size_sqft >= 0),
  add column if not exists allow_children      boolean not null default true,
  add column if not exists allow_smoking       boolean not null default false,
  add column if not exists allow_party         boolean not null default false,
  add column if not exists allow_pets          boolean not null default false,
  add column if not exists notify_emails       text[] not null default '{}';          -- who gets booking notifications

-- ---------- 3. per-date price / availability calendar ----------------------
-- One row per (listing, night) to override the base/seasonal rate, min-stay,
-- or mark a night blocked. Absent row = fall back to listing_rates.
create table if not exists public.listing_price_days (
  listing_id    uuid not null references public.listings(id) on delete cascade,
  day           date not null,
  nightly_cents int  check (nightly_cents is null or nightly_cents > 0),   -- null = use base/seasonal
  min_stay      int  check (min_stay is null or min_stay >= 1),
  is_blocked    boolean not null default false,
  note          text,
  updated_at    timestamptz not null default now(),
  primary key (listing_id, day)
);
create index if not exists idx_price_days_listing on public.listing_price_days (listing_id, day);

-- ---------- 4. stay extra options / add-ons --------------------------------
create table if not exists public.listing_addons (
  id          uuid primary key default gen_random_uuid(),
  listing_id  uuid not null references public.listings(id) on delete cascade,
  name        text not null,
  price_cents int  not null check (price_cents >= 0),
  mode        text not null default 'flat'
              check (mode in ('flat','per_night','per_guest','per_guest_night')),
  active      boolean not null default true,
  sort        int not null default 0,
  created_at  timestamptz not null default now()
);
create index if not exists idx_listing_addons_listing on public.listing_addons (listing_id);

-- ---------- 5. availability now also honors calendar-blocked days ----------
create or replace function public.listing_unavailable_ranges(p_listing uuid)
returns table (from_date date, to_date date)
language sql stable as $$
  select lower(b.stay), upper(b.stay)
    from public.bookings b
   where b.listing_id = p_listing
     and b.status in ('pending','confirmed')
     and upper(b.stay) >= current_date
  union all
  select lower(ab.span), upper(ab.span)
    from public.availability_blocks ab
   where ab.listing_id = p_listing
     and upper(ab.span) >= current_date
  union all
  select d.day, d.day + 1
    from public.listing_price_days d
   where d.listing_id = p_listing
     and d.is_blocked
     and d.day >= current_date
$$;

commit;
