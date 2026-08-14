-- 'unlisted' listings are intentionally public content reachable by
-- direct link (demo parity: Jardin Verde) — expose them to reads while
-- keeping them out of the grid (the app filters listPublished itself).

drop policy "published listings are public" on public.listings;
create policy "published listings are public" on public.listings
  for select using (status in ('published','unlisted'));

drop policy "photos of published listings are public" on public.listing_photos;
create policy "photos of published listings are public" on public.listing_photos
  for select using (exists (select 1 from public.listings l
                            where l.id = listing_id and l.status in ('published','unlisted')));

drop policy "rates of published listings are public" on public.listing_rates;
create policy "rates of published listings are public" on public.listing_rates
  for select using (exists (select 1 from public.listings l
                            where l.id = listing_id and l.status in ('published','unlisted')));
