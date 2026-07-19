-- ============================================================
-- Listing photo storage: public bucket + read policy.
-- Uploads go through the server (service role) only.
-- ============================================================

insert into storage.buckets (id, name, public)
values ('listing-photos', 'listing-photos', true)
on conflict (id) do nothing;

do $$ begin
  create policy "public read listing photos"
    on storage.objects for select
    using (bucket_id = 'listing-photos');
exception when duplicate_object then null; end $$;
