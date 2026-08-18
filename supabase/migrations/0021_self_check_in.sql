-- 0021_self_check_in.sql
-- "Self check-in" listing flag — surfaced as a guest booking-option
-- filter alongside instant book and pets.

begin;

alter table public.listings add column if not exists self_check_in boolean not null default false;

commit;
