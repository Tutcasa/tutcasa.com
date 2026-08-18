-- 0018_leads.sql
-- Lead capture: the contact / list-my-property / loyalty-referral /
-- partnership forms were front-end only — submissions went NOWHERE.
-- Now every submission lands here, shows in admin -> Leads, and fires
-- an email to the team.

begin;

create table if not exists public.leads (
  id         uuid primary key default gen_random_uuid(),
  kind       text not null check (kind in
             ('contact','list_property','loyalty_referral','partnership','newsletter')),
  name       text not null default '',
  email      text not null default '',
  phone      text,
  /** form-specific fields (property details, friend info, message…) */
  payload    jsonb not null default '{}',
  status     text not null default 'new' check (status in ('new','handled')),
  created_at timestamptz not null default now()
);
alter table public.leads enable row level security; -- server-only

create index if not exists idx_leads_status on public.leads (status, created_at desc);

commit;
