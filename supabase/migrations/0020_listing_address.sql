-- 0020_listing_address.sql
-- Admin enters a street address instead of raw lat/lng; the server
-- geocodes it (Nominatim) and keeps lat/lng in sync for the map.

begin;

alter table public.listings add column if not exists address text;

commit;
