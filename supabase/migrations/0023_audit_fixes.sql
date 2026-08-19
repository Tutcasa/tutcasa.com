-- 0023_audit_fixes.sql — fixes from the backend audit:
--   1. 'completed' bookings still block their dates (an admin marking a
--      FUTURE booking completed used to reopen its nights for sale)
--   2. releasing an expired hold gives the coupon use back
--   3. notifications_log can't record the same automation email twice
--      for the same booking+recipient (kills the concurrent-cron race)

begin;

-- 1a. exclusion constraint covers completed too
alter table public.bookings drop constraint if exists no_double_booking;
alter table public.bookings add constraint no_double_booking
  exclude using gist (listing_id with =, stay with &&)
  where (status in ('pending','confirmed','completed'));

-- 1b. availability union counts completed stays as occupied
create or replace function public.listing_unavailable_ranges(p_listing uuid)
returns table (from_date date, to_date date) language sql stable as $$
  select lower(b.stay), upper(b.stay)
    from public.bookings b
   where b.listing_id = p_listing
     and b.status in ('pending','confirmed','completed')
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

-- 2. expired holds return their coupon use
create or replace function public.release_expired_holds()
returns int language sql as $$
  with released as (
    update public.bookings
       set status = 'cancelled',
           notes = coalesce(notes,'') || ' [hold expired]'
     where status = 'pending'
       and hold_expires_at is not null
       and hold_expires_at < now()
    returning coupon_code
  ),
  refunds as (
    update public.coupons c
       set used_count = greatest(0, c.used_count - r.n)
      from (select coupon_code, count(*) as n from released
             where coupon_code is not null group by coupon_code) r
     where c.code = r.coupon_code
    returning 1
  )
  select count(*)::int from released;
$$;

-- 3. one log row per (kind, booking, recipient) — the insert is the claim
create unique index if not exists uniq_notif_booking_recipient
  on public.notifications_log (kind, booking_id, recipient)
  where booking_id is not null;
create unique index if not exists uniq_notif_tour_booking_recipient
  on public.notifications_log (kind, tour_booking_id, recipient)
  where tour_booking_id is not null;

commit;
