-- 0024_keep_calendar_clean.sql
-- "Keep calendar clean" (hotel mode) finally does what its label says:
-- bookings on such listings do NOT block dates. Each booking snapshots
-- the flag at creation (bookings.no_block) so flipping the toggle later
-- never rewrites history, and the exclusion constraint skips them.

begin;

alter table public.bookings add column if not exists no_block boolean not null default false;

alter table public.bookings drop constraint if exists no_double_booking;
alter table public.bookings add constraint no_double_booking
  exclude using gist (listing_id with =, stay with &&)
  where (status in ('pending','confirmed','completed') and not no_block);

create or replace function public.listing_unavailable_ranges(p_listing uuid)
returns table (from_date date, to_date date) language sql stable as $$
  select lower(b.stay), upper(b.stay)
    from public.bookings b
   where b.listing_id = p_listing
     and b.status in ('pending','confirmed','completed')
     and not b.no_block
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
