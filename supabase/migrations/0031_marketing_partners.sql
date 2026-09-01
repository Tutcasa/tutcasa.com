-- 0031_marketing_partners.sql
-- Third-party marketing partners (influencers, agencies) with tracked
-- links: tutcasa.com/?via=CODE remembers the visitor for 30 days; any
-- stay they book carries that partner's commission % ON TOP of the
-- price (the guest pays it), recorded per booking for the admin.

begin;

create table if not exists public.marketing_partners (
  id             uuid primary key default gen_random_uuid(),
  code           text not null unique,          -- goes in the link, e.g. LUISA
  name           text not null,
  commission_pct numeric(5,2) not null default 0,
  active         boolean not null default true,
  created_at     timestamptz not null default now()
);
alter table public.marketing_partners enable row level security; -- server-only

alter table public.bookings add column if not exists marketing_ref text;

commit;
