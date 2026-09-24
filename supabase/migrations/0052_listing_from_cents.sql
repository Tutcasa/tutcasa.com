-- The cheapest EFFECTIVE nightly over the next 12 months (per-date price
-- → seasonal rate → base rate, blocked nights skipped) — the same rule the
-- listing page's "from $X" uses. Exposed to PostgREST as a computed column
-- (listings.from_cents) so home/stays/similar cards all show one number,
-- whether the home is on PriceLabs or priced by hand.
create or replace function from_cents(l listings) returns int
language sql stable as $$
  select min(coalesce(pd.nightly_cents, sr.nightly_cents, b.nightly_cents))::int
    from generate_series(current_date, current_date + interval '364 days', interval '1 day') gs(day)
    cross join (select nightly_cents from listing_rates
                 where listing_id = l.id and season is null limit 1) b
    left join listing_price_days pd
           on pd.listing_id = l.id and pd.day = gs.day::date
    left join lateral (
           select r.nightly_cents from listing_rates r
            where r.listing_id = l.id and r.season is not null and r.season @> gs.day::date
            order by lower(r.season) desc limit 1) sr on true
   where not coalesce(pd.is_blocked, false)
$$;
notify pgrst, 'reload schema';
