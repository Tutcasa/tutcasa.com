-- ============================================================
-- Booking engine support
-- ============================================================

-- Pending holds that were never paid release automatically.
-- Called lazily by the app before availability-sensitive reads —
-- no cron dependency, dates free up the moment anyone looks.
create or replace function public.release_expired_holds()
returns int language sql as $$
  with released as (
    update public.bookings
       set status = 'cancelled',
           notes = coalesce(notes,'') || ' [hold expired]'
     where status = 'pending'
       and hold_expires_at is not null
       and hold_expires_at < now()
    returning 1
  )
  select count(*)::int from released;
$$;

-- Everything blocking a listing's calendar from today forward:
-- active bookings + manual/iCal blocks, as one set of date ranges.
-- Exposes DATES ONLY — no guest data — safe to feed the picker.
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
$$;
