-- 0016_ical_sync.sql
-- M4 channel sync via iCal (feature spec: "Ical links — can be exported from
-- our website to Airbnb and other channels, and imported from those channels").
--   * ical_token: unguessable per-listing token for the EXPORT feed URL
--     (Airbnb/VRBO poll it; busy ranges only, no guest data)
--   * listing_ical_feeds: the IMPORT side — external calendar URLs whose
--     events land in availability_blocks (reason='ical', deduped by UID)

begin;

alter table public.listings
  add column if not exists ical_token uuid not null default gen_random_uuid();
create unique index if not exists idx_listings_ical_token on public.listings (ical_token);

create table if not exists public.listing_ical_feeds (
  id             uuid primary key default gen_random_uuid(),
  listing_id     uuid not null references public.listings(id) on delete cascade,
  url            text not null,
  source         text not null default 'airbnb',   -- airbnb | vrbo | booking | other
  active         boolean not null default true,
  last_synced_at timestamptz,
  last_status    text,                              -- 'ok: N blocks' | error text
  created_at     timestamptz not null default now()
);
alter table public.listing_ical_feeds enable row level security; -- server-only

commit;
