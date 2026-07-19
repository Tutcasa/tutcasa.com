-- ============================================================
-- TutCasa platform — initial schema
-- Target: Supabase (PostgreSQL 15+)
--
-- Core guarantees:
--  * No double booking: enforced by an EXCLUSION constraint on
--    bookings (listing + date range overlap) — the database itself
--    rejects two overlapping holds, even in a race.
--  * Availability is DERIVED (booked = covered by a pending/confirmed
--    booking or a block). Cancelling frees dates instantly because
--    there is no mutable "available" flag to flip back.
-- ============================================================

create extension if not exists btree_gist;

-- ---------- helpers ----------------------------------------

create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

-- ---------- profiles (extends Supabase auth.users) ----------

create table public.profiles (
  id             uuid primary key references auth.users(id) on delete cascade,
  full_name      text,
  phone          text,
  role           text not null default 'guest'
                 check (role in ('guest','host','staff','admin')),
  preferred_lang text not null default 'en'
                 check (preferred_lang in ('en','fr','es')),
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

create trigger trg_profiles_updated before update on public.profiles
for each row execute function public.set_updated_at();

-- auto-create a profile row on signup
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, full_name, phone)
  values (new.id,
          coalesce(new.raw_user_meta_data->>'full_name', ''),
          new.phone)
  on conflict (id) do nothing;
  return new;
end $$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

-- ---------- listings ----------------------------------------

create table public.listings (
  id             uuid primary key default gen_random_uuid(),
  slug           text not null unique,
  title          text not null,
  city           text not null,
  country        char(2) not null check (country in ('MX','EG','US')),
  region         text,                          -- e.g. 'Riviera Maya'
  lat            double precision,
  lng            double precision,
  property_type  text not null default 'condo', -- condo | villa | house | apartment
  max_guests     int  not null check (max_guests between 1 and 50),
  bedrooms       int  not null check (bedrooms >= 0),
  bathrooms      numeric(3,1) not null check (bathrooms >= 0),
  headline       text,                          -- short card tagline e.g. 'Oceanfront'
  description    text,
  amenities      text[] not null default '{}',
  house_rules    text,
  min_stay       int  not null default 2 check (min_stay >= 1),
  checkin_from   time not null default '15:00',
  checkout_until time not null default '11:00',
  status         text not null default 'draft'
                 check (status in ('draft','published','archived')),
  owner_id       uuid references public.profiles(id) on delete set null,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

create index idx_listings_status_city on public.listings (status, city);
create trigger trg_listings_updated before update on public.listings
for each row execute function public.set_updated_at();

create table public.listing_photos (
  id         uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.listings(id) on delete cascade,
  url        text not null,
  alt        text not null default '',
  sort       int  not null default 0
);

create index idx_photos_listing on public.listing_photos (listing_id, sort);

-- ---------- pricing -----------------------------------------
-- One base rate row per listing (season is null), optional seasonal
-- overrides with a daterange. The pricing service picks, per night,
-- the most specific rate covering that night.

create table public.listing_rates (
  id             uuid primary key default gen_random_uuid(),
  listing_id     uuid not null references public.listings(id) on delete cascade,
  nightly_cents  int  not null check (nightly_cents > 0),
  cleaning_cents int  not null default 0 check (cleaning_cents >= 0),
  tax_pct        numeric(5,2) not null default 0 check (tax_pct >= 0),
  currency       char(3) not null default 'USD',
  season         daterange,           -- null = base rate
  label          text,                -- e.g. 'High season 2026'
  created_at     timestamptz not null default now(),
  -- at most one base rate per listing
  constraint one_base_rate exclude using gist
    (listing_id with =) where (season is null),
  -- seasonal ranges must not overlap per listing
  constraint no_overlapping_seasons exclude using gist
    (listing_id with =, season with &&) where (season is not null)
);

-- ---------- bookings (the core) ------------------------------
-- stay is a half-open range [check_in, check_out): a guest leaving
-- on the 10th does not collide with one arriving on the 10th.

create table public.bookings (
  id              uuid primary key default gen_random_uuid(),
  listing_id      uuid not null references public.listings(id),
  guest_id        uuid references public.profiles(id) on delete set null,
  guest_name      text not null,
  guest_email     text not null,
  guest_phone     text,
  stay            daterange not null,
  guests          int not null default 1 check (guests > 0),
  status          text not null default 'pending'
                  check (status in ('pending','confirmed','cancelled','completed')),
  hold_expires_at timestamptz,        -- pending holds auto-expire (cron releases them)
  total_cents     int not null check (total_cents >= 0),
  currency        char(3) not null default 'USD',
  price_breakdown jsonb,              -- {nights, nightly, cleaning, tax, ...} frozen at booking time
  payment_provider text check (payment_provider in ('stripe','paypal','paymob','giftcard','manual')),
  payment_ref     text,
  source          text not null default 'direct'
                  check (source in ('direct','airbnb','vrbo','booking','manual')),
  notes           text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),

  constraint stay_valid check (lower(stay) < upper(stay)),

  -- ★ THE no-double-booking guarantee.
  -- Two rows for the same listing whose stays overlap cannot both
  -- hold a blocking status. One INSERT wins; the other errors.
  constraint no_double_booking exclude using gist
    (listing_id with =, stay with &&)
    where (status in ('pending','confirmed'))
);

create index idx_bookings_listing on public.bookings (listing_id, status);
create index idx_bookings_guest   on public.bookings (guest_id);
create trigger trg_bookings_updated before update on public.bookings
for each row execute function public.set_updated_at();

-- ---------- availability blocks ------------------------------
-- Owner stays, maintenance, and imported iCal events (Airbnb/VRBO/
-- Booking.com). These block dates without being TutCasa bookings.

create table public.availability_blocks (
  id           uuid primary key default gen_random_uuid(),
  listing_id   uuid not null references public.listings(id) on delete cascade,
  span         daterange not null,
  reason       text not null default 'owner'
               check (reason in ('owner','maintenance','ical')),
  source       text,                 -- 'airbnb' | 'vrbo' | 'booking' | free text
  external_ref text,                 -- iCal UID for sync upserts
  created_at   timestamptz not null default now(),
  constraint span_valid check (lower(span) < upper(span))
);

create unique index idx_blocks_external
  on public.availability_blocks (listing_id, external_ref)
  where external_ref is not null;
create index idx_blocks_listing on public.availability_blocks using gist (listing_id, span);

-- ---------- availability check (single source of truth) ------

create or replace function public.is_listing_available(
  p_listing uuid, p_from date, p_to date
) returns boolean language sql stable as $$
  select
    not exists (
      select 1 from public.bookings b
      where b.listing_id = p_listing
        and b.status in ('pending','confirmed')
        and b.stay && daterange(p_from, p_to)
    )
    and not exists (
      select 1 from public.availability_blocks ab
      where ab.listing_id = p_listing
        and ab.span && daterange(p_from, p_to)
    );
$$;

-- ---------- partner tours (Amanah Vacations) -----------------
-- Ready-made products supplied by the partner: we display, sell,
-- and notify the partner to confirm & operate.

create table public.tours (
  id             uuid primary key default gen_random_uuid(),
  slug           text not null unique,
  title          text not null,
  subtitle       text,
  partner        text not null default 'amanah',
  city           text,
  duration_hours numeric(4,1),
  description    text,
  highlights     text[] not null default '{}',
  price_cents    int not null check (price_cents > 0),   -- per person
  currency       char(3) not null default 'USD',
  min_group      int not null default 1,
  max_group      int not null default 12,
  photo_url      text,
  status         text not null default 'published'
                 check (status in ('draft','published','archived')),
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

create trigger trg_tours_updated before update on public.tours
for each row execute function public.set_updated_at();

create table public.tour_bookings (
  id                   uuid primary key default gen_random_uuid(),
  tour_id              uuid not null references public.tours(id),
  guest_id             uuid references public.profiles(id) on delete set null,
  guest_name           text not null,
  guest_email          text not null,
  guest_phone          text,
  tour_date            date not null,
  group_size           int not null check (group_size > 0),
  status               text not null default 'pending'
                       check (status in ('pending','paid','partner_confirmed','completed','cancelled')),
  total_cents          int not null check (total_cents >= 0),
  currency             char(3) not null default 'USD',
  payment_provider     text,
  payment_ref          text,
  partner_notified_at  timestamptz,   -- when the Amanah notification was sent
  partner_confirmed_at timestamptz,   -- when Amanah confirmed operation
  notes                text,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);

create index idx_tour_bookings_tour on public.tour_bookings (tour_id, tour_date);
create trigger trg_tour_bookings_updated before update on public.tour_bookings
for each row execute function public.set_updated_at();

-- ---------- gift cards (hashed codes + ledger) ---------------

create table public.gift_cards (
  id              uuid primary key default gen_random_uuid(),
  code_hash       text not null unique,   -- sha256 of normalized code; plaintext never stored
  code_last4      text not null,          -- display hint e.g. '…7K2M'
  initial_cents   int not null check (initial_cents > 0),
  balance_cents   int not null check (balance_cents >= 0),
  currency        char(3) not null default 'USD',
  status          text not null default 'active'
                  check (status in ('active','redeemed','expired','void')),
  purchaser_email text,
  recipient_email text,
  message         text,
  expires_at      timestamptz not null default (now() + interval '12 months'),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create trigger trg_gift_cards_updated before update on public.gift_cards
for each row execute function public.set_updated_at();

create table public.gift_card_ledger (
  id              uuid primary key default gen_random_uuid(),
  gift_card_id    uuid not null references public.gift_cards(id),
  delta_cents     int not null,            -- negative = redemption, positive = issue/refund
  booking_id      uuid references public.bookings(id),
  tour_booking_id uuid references public.tour_bookings(id),
  note            text,
  created_at      timestamptz not null default now()
);

create index idx_gc_ledger_card on public.gift_card_ledger (gift_card_id);

-- Atomic redemption: verifies, locks, decrements, writes ledger.
create or replace function public.redeem_gift_card(
  p_code_hash text, p_amount_cents int,
  p_booking uuid default null, p_tour_booking uuid default null
) returns table (gift_card_id uuid, applied_cents int, remaining_cents int)
language plpgsql security definer set search_path = public as $$
declare gc public.gift_cards;
        v_apply int;
begin
  select * into gc from public.gift_cards
   where code_hash = p_code_hash
   for update;                         -- row lock: two redemptions serialize

  if not found then
    raise exception 'GIFT_CARD_INVALID';
  end if;
  if gc.status <> 'active' or gc.expires_at < now() then
    raise exception 'GIFT_CARD_NOT_ACTIVE';
  end if;
  if gc.balance_cents <= 0 then
    raise exception 'GIFT_CARD_EMPTY';
  end if;

  v_apply := least(gc.balance_cents, p_amount_cents);

  update public.gift_cards
     set balance_cents = balance_cents - v_apply,
         status = case when balance_cents - v_apply = 0 then 'redeemed' else status end
   where id = gc.id;

  insert into public.gift_card_ledger (gift_card_id, delta_cents, booking_id, tour_booking_id, note)
  values (gc.id, -v_apply, p_booking, p_tour_booking, 'redemption');

  return query select gc.id, v_apply, gc.balance_cents - v_apply;
end $$;

-- ---------- reviews (verified: tied to a completed stay) -----

create table public.reviews (
  id           uuid primary key default gen_random_uuid(),
  listing_id   uuid not null references public.listings(id) on delete cascade,
  booking_id   uuid not null unique references public.bookings(id),
  rating       numeric(2,1) not null check (rating between 1 and 5),
  cleanliness  numeric(2,1) check (cleanliness between 1 and 5),
  location     numeric(2,1) check (location between 1 and 5),
  checkin      numeric(2,1) check (checkin between 1 and 5),
  value        numeric(2,1) check (value between 1 and 5),
  title        text,
  body         text,
  guest_name   text not null,
  status       text not null default 'pending'
               check (status in ('pending','published','rejected')),
  created_at   timestamptz not null default now()
);

create index idx_reviews_listing on public.reviews (listing_id, status);

-- ---------- wishlist ----------------------------------------

create table public.wishlists (
  user_id    uuid not null references public.profiles(id) on delete cascade,
  listing_id uuid not null references public.listings(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, listing_id)
);

-- ---------- row level security -------------------------------
-- Public content is world-readable; personal data is owner-readable;
-- all writes to money/booking tables go through server code
-- (service role) — never directly from the browser.

alter table public.profiles            enable row level security;
alter table public.listings            enable row level security;
alter table public.listing_photos      enable row level security;
alter table public.listing_rates       enable row level security;
alter table public.bookings            enable row level security;
alter table public.availability_blocks enable row level security;
alter table public.tours               enable row level security;
alter table public.tour_bookings       enable row level security;
alter table public.gift_cards          enable row level security;
alter table public.gift_card_ledger    enable row level security;
alter table public.reviews             enable row level security;
alter table public.wishlists           enable row level security;

-- profiles: self read/update
create policy "own profile read"   on public.profiles for select using (auth.uid() = id);
create policy "own profile update" on public.profiles for update using (auth.uid() = id);

-- public catalog
create policy "published listings are public" on public.listings
  for select using (status = 'published');
create policy "photos of published listings are public" on public.listing_photos
  for select using (exists (select 1 from public.listings l
                            where l.id = listing_id and l.status = 'published'));
create policy "rates of published listings are public" on public.listing_rates
  for select using (exists (select 1 from public.listings l
                            where l.id = listing_id and l.status = 'published'));
create policy "published tours are public" on public.tours
  for select using (status = 'published');
create policy "published reviews are public" on public.reviews
  for select using (status = 'published');

-- personal data
create policy "own bookings read" on public.bookings
  for select using (guest_id = auth.uid());
create policy "own tour bookings read" on public.tour_bookings
  for select using (guest_id = auth.uid());
create policy "own wishlist" on public.wishlists
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- NOTE: inserts/updates on bookings, tour_bookings, gift_cards,
-- listings management, blocks, etc. are performed by the server
-- (service role bypasses RLS) inside module services. No browser
-- writes to money tables, by design.
