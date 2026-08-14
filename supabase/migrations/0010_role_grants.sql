-- 0010_role_grants.sql
-- The schema was created over a direct postgres connection, so Supabase's
-- usual grants to the API roles (anon / authenticated / service_role) were
-- never applied — every PostgREST query failed with "permission denied".
-- Row visibility stays governed by RLS: granting SELECT exposes nothing
-- beyond what the policies allow.

begin;

grant usage on schema public to anon, authenticated, service_role;

-- table access: API roles may SELECT (RLS filters rows); service_role does it all
grant select on all tables in schema public to anon, authenticated;
grant all on all tables in schema public to service_role;
grant usage, select on all sequences in schema public to service_role;
grant execute on all functions in schema public to anon, authenticated, service_role;

-- future objects created by postgres get the same treatment
alter default privileges in schema public
  grant select on tables to anon, authenticated;
alter default privileges in schema public
  grant all on tables to service_role;
alter default privileges in schema public
  grant execute on functions to anon, authenticated, service_role;

-- 0008's tables are written only via the server's direct connection;
-- RLS on + no policies = invisible to the API roles (deny by default)
alter table public.listing_pricing    enable row level security;
alter table public.listing_price_days enable row level security;
alter table public.listing_addons     enable row level security;

commit;
