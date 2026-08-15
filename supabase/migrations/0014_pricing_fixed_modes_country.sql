-- 0014_pricing_fixed_modes_country.sql
-- Feature-spec parity (client spreadsheet):
--   * "Price per weekend — fixed amount OR extra %": adds the fixed variant
--     (weekend_cents = replacement nightly for Sat/Sun; 0 = use weekend_pct)
--   * "Price per night if rented 7+/30+ — fixed amount OR discount %":
--     adds the fixed variants (weekly/monthly_nightly_cents = replacement
--     nightly for qualifying stays; 0 = use the *_discount_pct)
--   * "Optional adding of a new city / country": country was hard-limited
--     to MX/EG/US — now any ISO-2 code (cities were already free text)

begin;

alter table public.listing_pricing
  add column if not exists weekend_cents int not null default 0
    check (weekend_cents >= 0),
  add column if not exists weekly_nightly_cents int not null default 0
    check (weekly_nightly_cents >= 0),
  add column if not exists monthly_nightly_cents int not null default 0
    check (monthly_nightly_cents >= 0);

alter table public.listings drop constraint if exists listings_country_check;
alter table public.listings add constraint listings_country_check
  check (country ~ '^[A-Z]{2}$');

commit;
