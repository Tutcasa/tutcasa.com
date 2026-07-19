-- ============================================================
-- Site settings (editable content) + documents bucket
-- ============================================================

create table if not exists public.site_settings (
  key        text primary key,
  value      jsonb not null,
  updated_at timestamptz not null default now()
);

alter table public.site_settings enable row level security;
create policy "settings are public readable" on public.site_settings
  for select using (true);
-- writes via server only (service/postgres role)

insert into public.site_settings (key, value) values
  ('contact', jsonb_build_object(
     'whatsapp', '201069706782',
     'email', 'hello@tutcasa.com',
     'instagram', '',
     'facebook', ''
  )),
  ('investor', jsonb_build_object('deck_url', '', 'deck_name', ''))
on conflict (key) do nothing;

-- public documents bucket (investor deck etc.)
insert into storage.buckets (id, name, public)
values ('documents', 'documents', true)
on conflict (id) do nothing;

do $$ begin
  create policy "public read documents"
    on storage.objects for select
    using (bucket_id = 'documents');
exception when duplicate_object then null; end $$;
