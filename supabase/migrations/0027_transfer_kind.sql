-- 0027_transfer_kind.sql
-- Transfers split into airport PICKUP (arrival) and DROP-OFF (departure):
-- a booking can have one of each, so "one transfer per booking" becomes
-- "one per booking per direction".

begin;

alter table public.transfers
  add column if not exists kind text not null default 'pickup'
    check (kind in ('pickup','dropoff'));

alter table public.transfers drop constraint if exists one_transfer_per_booking;
alter table public.transfers add constraint one_transfer_per_booking_kind
  unique (booking_id, kind);

commit;
