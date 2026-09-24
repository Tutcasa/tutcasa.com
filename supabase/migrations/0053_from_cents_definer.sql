-- from_cents must see per-date (PriceLabs) prices even when the public
-- anon role reads listings: RLS hides listing_price_days from anon, which
-- silently dropped the function back to the base rate. SECURITY DEFINER
-- with a pinned search_path; it only ever returns one aggregate price.
alter function from_cents(listings) security definer;
alter function from_cents(listings) set search_path = public;
revoke all on function from_cents(listings) from public;
grant execute on function from_cents(listings) to anon, authenticated, service_role;
notify pgrst, 'reload schema';
