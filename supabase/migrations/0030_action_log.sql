-- 0030_action_log.sql
-- Diagnostic trail for admin mutations: every attempt is recorded the
-- moment it REACHES the server (before auth), then its outcome. If a
-- user reports "I saved X and nothing happened" and there is no row
-- here, the request never left their browser.

begin;
create table if not exists public.action_log (
  id         bigserial primary key,
  action     text not null,
  phase      text not null check (phase in ('received','result')),
  ok         boolean,
  message    text,
  meta       jsonb,
  created_at timestamptz not null default now()
);
alter table public.action_log enable row level security; -- server-only
commit;
