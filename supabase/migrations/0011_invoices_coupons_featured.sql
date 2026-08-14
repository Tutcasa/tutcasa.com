-- 0011_invoices_coupons_featured.sql
-- Feature-spec parity items from the old WpRentals/WooCommerce admin:
--   * invoice numbers on bookings (Invoices page + shareable links)
--   * native coupon engine (replaces WooCommerce coupons)
--   * featured-on-homepage toggle per listing

begin;

-- ---------- invoice numbers ------------------------------------------------
create sequence if not exists public.invoice_no_seq start 1001;

alter table public.bookings
  add column if not exists invoice_no bigint,
  add column if not exists coupon_code text,
  add column if not exists coupon_discount_cents int not null default 0
    check (coupon_discount_cents >= 0);

update public.bookings set invoice_no = nextval('public.invoice_no_seq')
 where invoice_no is null;

alter table public.bookings
  alter column invoice_no set default nextval('public.invoice_no_seq');
create unique index if not exists idx_bookings_invoice_no on public.bookings (invoice_no);

alter table public.tour_bookings
  add column if not exists invoice_no bigint,
  add column if not exists coupon_code text,
  add column if not exists coupon_discount_cents int not null default 0
    check (coupon_discount_cents >= 0);

update public.tour_bookings set invoice_no = nextval('public.invoice_no_seq')
 where invoice_no is null;

alter table public.tour_bookings
  alter column invoice_no set default nextval('public.invoice_no_seq');
create unique index if not exists idx_tour_bookings_invoice_no on public.tour_bookings (invoice_no);

-- ---------- coupons ---------------------------------------------------------
create table if not exists public.coupons (
  id            uuid primary key default gen_random_uuid(),
  code          text not null unique,          -- stored uppercase
  kind          text not null default 'percent' check (kind in ('percent','fixed')),
  percent_off   numeric(5,2) check (percent_off is null or (percent_off > 0 and percent_off <= 100)),
  amount_cents  int check (amount_cents is null or amount_cents > 0),
  min_nights    int not null default 0 check (min_nights >= 0),
  max_uses      int,                            -- null = unlimited
  used_count    int not null default 0 check (used_count >= 0),
  expires_at    date,                           -- null = never
  active        boolean not null default true,
  note          text,
  created_at    timestamptz not null default now(),
  constraint coupon_value check (
    (kind = 'percent' and percent_off is not null) or
    (kind = 'fixed'   and amount_cents is not null)
  )
);
alter table public.coupons enable row level security;  -- server-only access

-- ---------- featured toggle -------------------------------------------------
alter table public.listings
  add column if not exists featured boolean not null default false;

-- seed: the four homes the demo pins on the homepage
update public.listings set featured = true
 where slug in ('spiritum-marea','vista-playa','casa-selva','casa-sol');

commit;
