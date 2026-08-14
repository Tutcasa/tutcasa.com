-- 0012_tours_amanah_sync.sql
-- Tours mirror amanahvacations.com 1:1 (Maher: "TutCasa adopts anything
-- Amanah does for their tours" — same images, details and prices, no markup).
--   * group_prices: Amanah's tier model — TOTAL MXN per group size,
--     e.g. {"2":6200,"3":8400}; smallest key = minimum bookable group.
--     When present it is the price authority; price_cents stays as the
--     legacy per-person fallback (0 = on request).
--   * stops: itinerary [{time,place,desc}]
--   * source/synced_at: 'amanah' rows are managed by the sync.

begin;

alter table public.tours
  add column if not exists group_prices jsonb,
  add column if not exists stops jsonb not null default '[]',
  add column if not exists source text not null default 'local'
    check (source in ('local','amanah')),
  add column if not exists synced_at timestamptz;

commit;
